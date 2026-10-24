// Торговля между реальными игроками: фиксированная цена и аукцион со ставками.
// Деньги и ники лежат «в залоге» на сервере: ник снимается у продавца при выставлении, ставка списывается у покупателя сразу.
// Доставка другому игроку идёт через таблицу inbox (ник или «cash»), её игрок получает при следующем действии.
const FEE = 0.05;
const DURS = [3600, 21600, 86400, 259200];
const MAX_ACTIVE = 10;
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const nf = (n) => Math.round(Number(n) || 0).toLocaleString('ru-RU').replace(/ /g, ' ');
const net = (price) => Math.floor(price * (1 - FEE));
const minNext = (l) => (l.bid > 0 ? l.bid + Math.max(1, Math.ceil(l.bid * 0.05)) : l.price);

export const P2P_SCHEMA = [
  'CREATE TABLE IF NOT EXISTS listings (id INTEGER PRIMARY KEY AUTOINCREMENT, seller TEXT, seller_name TEXT, nick TEXT, u TEXT, tier TEXT, mode TEXT, price INTEGER, bid INTEGER DEFAULT 0, bidder TEXT, bidder_name TEXT, bids INTEGER DEFAULT 0, end_at INTEGER, status TEXT, buyer TEXT, created INTEGER)',
  'CREATE INDEX IF NOT EXISTS idx_listings_status ON listings (status, end_at)',
];

const inboxIns = (env, to, from, kind, payload) =>
  env.DB.prepare('INSERT INTO inbox (to_id, from_name, kind, payload, ts) VALUES (?, ?, ?, ?, ?)').bind(to, from, kind, JSON.stringify(payload), Date.now());

async function notify(d, id, text) {
  try { await d.tg(d.env, 'sendMessage', { chat_id: id, parse_mode: 'HTML', text }); } catch (e) { /* игрок мог не запускать бота */ }
}

const pub = (r, uid) => ({
  id: r.id, u: r.u, tier: r.tier, base: JSON.parse(r.nick).base, k: JSON.parse(r.nick).k || 1,
  mode: r.mode, price: r.price, bid: r.bid, bids: r.bids, min: minNext(r), end: r.end_at,
  seller: r.seller_name || 'игрок', mine: r.seller === uid, top: !!r.bidder && r.bidder === uid, status: r.status,
});

// Завершает аукционы и лоты, у которых вышло время
export async function settleDue(d) {
  const { env } = d;
  const due = await env.DB.prepare("SELECT * FROM listings WHERE status = 'active' AND end_at <= ? ORDER BY end_at LIMIT 10").bind(Date.now()).all();
  for (const l of due.results || []) {
    const c = await env.DB.prepare("UPDATE listings SET status = 'settling' WHERE id = ? AND status = 'active'").bind(l.id).run();
    if (!(c && c.meta && c.meta.changes)) continue;
    const nick = JSON.parse(l.nick);
    if (l.bidder) {
      const pay = net(l.bid);
      await env.DB.batch([
        inboxIns(env, l.bidder, l.seller_name || 'игрок', 'nick', { ...nick, note: `🏆 Ты выиграл @${l.u} за ${nf(l.bid)} ⭐` }),
        inboxIns(env, l.seller, 'маркет', 'cash', { amount: pay, note: `💰 @${l.u} продан за ${nf(l.bid)} ⭐ · тебе +${nf(pay)} ⭐ (комиссия ${FEE * 100}%)` }),
        env.DB.prepare("UPDATE listings SET status = 'sold', buyer = ? WHERE id = ?").bind(l.bidder, l.id),
      ]);
      await notify(d, l.seller, `💰 Аукцион завершён: <b>@${esc(l.u)}</b> продан за ${nf(l.bid)} ⭐. Тебе +${nf(pay)} ⭐.`);
      await notify(d, l.bidder, `🏆 Ты выиграл <b>@${esc(l.u)}</b> за ${nf(l.bid)} ⭐. Ник уже в твоей коллекции.`);
    } else {
      await env.DB.batch([
        inboxIns(env, l.seller, 'маркет', 'nick', { ...nick, note: `Лот @${l.u} не продан: ник вернулся в коллекцию` }),
        env.DB.prepare("UPDATE listings SET status = 'ended' WHERE id = ?").bind(l.id),
      ]);
    }
  }
}

// d: { env, runAct, diffState, json, tg, adm, uid, nm, maint }; возвращает Response или null, если путь не про торговлю
export async function p2pRoute(d, path, body) {
  const { env, json, uid, nm, adm } = d;
  if (!path.startsWith('/api/p2p/')) return null;
  await settleDue(d);
  const patchOf = (r) => { const x = d.diffState(r.before, r.out.S); return { patch: x.patch, del: x.del, msgs: r.out.msgs }; };
  const sellerName = nm.uname || nm.first || 'игрок';
  const id = Math.round(+body.id) || 0;

  if (path === '/api/p2p/browse') {
    const mode = body.mode === 'fixed' || body.mode === 'auction' ? body.mode : null;
    const q = String(body.q || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32);
    const tiers = ['common', 'norm', 'rare', 'epic', 'legend', 'mythic', 'divine'];
    const tr = tiers[Math.round(+body.tier)] || null;
    const so = body.sort === 'asc' ? 'CASE WHEN bid > 0 THEN bid ELSE price END ASC' : body.sort === 'desc' ? 'CASE WHEN bid > 0 THEN bid ELSE price END DESC' : 'end_at ASC';
    const rows = await env.DB.prepare(
      `SELECT * FROM listings WHERE status = 'active' AND end_at > ? AND (? IS NULL OR mode = ?) AND (? = '' OR u LIKE ?) AND (? IS NULL OR tier = ?) ORDER BY ${so} LIMIT 60`
    ).bind(Date.now(), mode, mode, q, '%' + q + '%', tr, tr).all();
    return json({ ok: true, list: (rows.results || []).map((r) => pub(r, uid)) });
  }
  if (path === '/api/p2p/mine') {
    const rows = await env.DB.prepare(
      "SELECT * FROM listings WHERE status = 'active' AND (seller = ? OR bidder = ?) ORDER BY end_at LIMIT 60"
    ).bind(uid, uid).all();
    return json({ ok: true, list: (rows.results || []).map((r) => pub(r, uid)) });
  }
  if (d.maint) return json({ ok: false, err: 'maint' }, 503);

  if (path === '/api/p2p/list') {
    const mode = body.mode === 'auction' ? 'auction' : 'fixed';
    const price = Math.round(+body.price), dur = Math.round(+body.dur);
    if (!(price >= 1 && price <= 1e9) || !DURS.includes(dur)) return json({ ok: false, err: 'arg' });
    const cnt = await env.DB.prepare("SELECT COUNT(*) AS n FROM listings WHERE seller = ? AND status = 'active'").bind(uid).first();
    if (cnt.n >= MAX_ACTIVE) return json({ ok: false, err: 'limit' });
    const r = await d.runAct(env, uid, nm.uname, adm, 'p2pTake', [String(body.u || '')], body.prefs, true);
    const res = r.out.res;
    if (!res || res.err) return json({ ok: false, err: 'item' });
    const rec = res.rec;
    try {
      await env.DB.prepare('INSERT INTO listings (seller, seller_name, nick, u, tier, mode, price, bid, bids, end_at, status, created) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)')
        .bind(uid, sellerName, JSON.stringify(rec), rec.u, rec.tier, mode, price, Date.now() + dur * 1000, 'active', Date.now()).run();
    } catch (e) {
      await d.runAct(env, uid, nm.uname, adm, 'giftRefund', ['nick', rec], null, true);
      return json({ ok: false, err: 'fail' });
    }
    return json({ ok: true, ...patchOf(r) });
  }

  if (path === '/api/p2p/cancel') {
    const l = await env.DB.prepare('SELECT * FROM listings WHERE id = ?').bind(id).first();
    if (!l || l.seller !== uid) return json({ ok: false, err: 'none' });
    const c = await env.DB.prepare("UPDATE listings SET status = 'cancelled' WHERE id = ? AND seller = ? AND status = 'active' AND bids = 0").bind(id, uid).run();
    if (!(c && c.meta && c.meta.changes)) return json({ ok: false, err: l.bids > 0 ? 'has_bids' : 'gone' });
    const r = await d.runAct(env, uid, nm.uname, adm, 'giftRefund', ['nick', JSON.parse(l.nick)], null, true);
    return json({ ok: true, ...patchOf(r), msgs: ['Лот снят, ник вернулся в коллекцию'] });
  }

  if (path === '/api/p2p/buy') {
    const l = await env.DB.prepare('SELECT * FROM listings WHERE id = ?').bind(id).first();
    if (!l || l.status !== 'active' || l.mode !== 'fixed' || l.end_at <= Date.now()) return json({ ok: false, err: 'gone' });
    if (l.seller === uid) return json({ ok: false, err: 'self' });
    const lock = await env.DB.prepare("UPDATE listings SET status = 'locked', buyer = ? WHERE id = ? AND status = 'active'").bind(uid, id).run();
    if (!(lock && lock.meta && lock.meta.changes)) return json({ ok: false, err: 'gone' });
    const pay = await d.runAct(env, uid, nm.uname, adm, 'p2pPay', [l.price, true], body.prefs, true);
    if (!pay.out.res || pay.out.res.err) {
      await env.DB.prepare("UPDATE listings SET status = 'active', buyer = NULL WHERE id = ?").bind(id).run();
      return json({ ok: false, err: (pay.out.res && pay.out.res.err) || 'fail' });
    }
    const nick = JSON.parse(l.nick), got = net(l.price);
    try {
      await env.DB.batch([
        inboxIns(env, uid, l.seller_name || 'игрок', 'nick', { ...nick, note: `🛒 Куплено @${l.u} за ${nf(l.price)} ⭐` }),
        inboxIns(env, l.seller, sellerName, 'cash', { amount: got, note: `💰 @${l.u} продан за ${nf(l.price)} ⭐ · тебе +${nf(got)} ⭐ (комиссия ${FEE * 100}%)` }),
        env.DB.prepare("UPDATE listings SET status = 'sold' WHERE id = ?").bind(id),
      ]);
    } catch (e) {
      await d.runAct(env, uid, nm.uname, adm, 'p2pRefund', [l.price], null, true);
      await env.DB.prepare("UPDATE listings SET status = 'active', buyer = NULL WHERE id = ?").bind(id).run();
      return json({ ok: false, err: 'fail' });
    }
    await notify(d, l.seller, `💰 <b>@${esc(l.u)}</b> куплен за ${nf(l.price)} ⭐. Тебе +${nf(got)} ⭐.`);
    const fin = await d.runAct(env, uid, nm.uname, adm, '__load', [], null); // забираем ник из inbox сразу
    return json({ ok: true, ...patchOf({ before: pay.before, out: fin.out }) });
  }

  if (path === '/api/p2p/bid') {
    const amount = Math.round(+body.amount);
    const l = await env.DB.prepare('SELECT * FROM listings WHERE id = ?').bind(id).first();
    if (!l || l.status !== 'active' || l.mode !== 'auction' || l.end_at <= Date.now()) return json({ ok: false, err: 'gone' });
    if (l.seller === uid) return json({ ok: false, err: 'self' });
    if (l.bidder === uid) return json({ ok: false, err: 'top' });
    if (!(amount >= minNext(l)) || amount > 1e9) return json({ ok: false, err: 'low', min: minNext(l) });
    const pay = await d.runAct(env, uid, nm.uname, adm, 'p2pPay', [amount, false], body.prefs, true);
    if (!pay.out.res || pay.out.res.err) return json({ ok: false, err: (pay.out.res && pay.out.res.err) || 'fail' });
    const now = Date.now();
    const upd = await env.DB.prepare(
      "UPDATE listings SET bid = ?, bidder = ?, bidder_name = ?, bids = bids + 1, end_at = CASE WHEN end_at - ? < 30000 THEN end_at + 30000 ELSE end_at END WHERE id = ? AND status = 'active' AND end_at > ? AND bid = ? AND COALESCE(bidder, '') = ?"
    ).bind(amount, uid, sellerName, now, id, now, l.bid, l.bidder || '').run();
    if (!(upd && upd.meta && upd.meta.changes)) {
      await d.runAct(env, uid, nm.uname, adm, 'p2pRefund', [amount], null, true);
      return json({ ok: false, err: 'outbid' });
    }
    if (l.bidder) {
      await env.DB.prepare('INSERT INTO inbox (to_id, from_name, kind, payload, ts) VALUES (?, ?, ?, ?, ?)')
        .bind(l.bidder, 'маркет', 'cash', JSON.stringify({ amount: l.bid, note: `Тебя перебили на @${l.u}: вернули ${nf(l.bid)} ⭐` }), Date.now()).run();
      await notify(d, l.bidder, `⚠️ Твою ставку на <b>@${esc(l.u)}</b> перебили (${nf(amount)} ⭐). Деньги вернулись на баланс.`);
    }
    const cur = await env.DB.prepare('SELECT * FROM listings WHERE id = ?').bind(id).first();
    return json({ ok: true, lot: pub(cur, uid), ...patchOf(pay) });
  }
  return json({ ok: false, err: 'route' }, 404);
}
