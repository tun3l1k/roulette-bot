// Бот «Юзерок: Рулетка» + облачное сохранение прогресса (Cloudflare Workers + D1)
const GAME_URL = 'https://tun3l1k.github.io/roulette/';
const KEYBOARD = { inline_keyboard: [[{ text: '🎰 Играть', web_app: { url: GAME_URL } }]] };

const HELLO = (name) => `👋 Привет, <b>${name}</b>!

🎰 <b>Юзерок: Рулетка</b> — крути и находи редкие Telegram-юзернеймы.

• Крути рулетку и собирай коллекцию
• Чем короче и красивее ник, тем он дороже
• Продавай на маркете за ⭐ Stars или 💎 TON
• Выполняй задания и крути колесо фортуны каждые 5 часов

Нажми кнопку ниже, чтобы начать 👇`;

const HELP = `ℹ️ <b>Как играть</b>

1. Нажми «Играть» и крути рулетку.
2. Выпал ник — продай его или оставь в коллекции.
3. Чем реже ник и больше множителей, тем он дороже.
4. Продавай ники на маркете: аукцион, продажа или лично другу.
5. Заходи за заданиями и колесом фортуны.`;

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

async function tg(env, method, body) {
  return fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------- облачное сохранение ----------
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Max-Age': '86400',
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...CORS } });

async function hmac(keyBytes, msg) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg)));
}
const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

// Проверка подписи Telegram (initData). Возвращает id пользователя или null.
async function verify(initData, token) {
  if (!initData || !token) return null;
  const p = new URLSearchParams(initData);
  const hash = p.get('hash');
  if (!hash) return null;
  p.delete('hash');
  const check = [...p.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => k + '=' + v)
    .join('\n');
  const secret = await hmac(new TextEncoder().encode('WebAppData'), token);
  if (hex(await hmac(secret, check)) !== hash) return null;
  const age = Date.now() / 1000 - (Number(p.get('auth_date')) || 0);
  if (age > 7 * 86400) return null;
  try { return String(JSON.parse(p.get('user')).id); } catch (e) { return null; }
}

let ready = false;
async function ensure(env) {
  if (ready) return;
  await env.DB.batch([
    env.DB.prepare('CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, sv INTEGER, state TEXT)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS stats (id TEXT PRIMARY KEY, spins INTEGER)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS referrals (invitee TEXT PRIMARY KEY, inviter TEXT, name TEXT, ts INTEGER)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT)'),
  ]);
  ready = true;
}

let botName = '';
async function getBotName(env) {
  if (botName) return botName;
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getMe`);
    const j = await r.json();
    if (j.ok) botName = j.result.username || '';
  } catch (e) {}
  return botName;
}

// Записываем приглашение, только если приглашённый ещё не играл и не был приглашён раньше
async function registerRef(env, inviter, invitee, name) {
  if (!env.DB || inviter === invitee) return false;
  try {
    await ensure(env);
    const has = await env.DB.prepare('SELECT 1 AS x FROM players WHERE id = ?').bind(invitee).first();
    if (has) return false;
    const r = await env.DB.prepare('INSERT OR IGNORE INTO referrals (invitee, inviter, name, ts) VALUES (?, ?, ?, ?)')
      .bind(invitee, inviter, String(name || '').slice(0, 40), Date.now()).run();
    return !!(r && r.meta && r.meta.changes);
  } catch (e) { return false; }
}

const REF_NEED = 3; // сколько прокруток нужно другу, чтобы считаться активным
const isAdmin = (env, uid) => !!uid && String(env.ADMIN_IDS || '').split(',').map((x) => x.trim()).includes(String(uid));

async function readMaint(env) {
  const rows = await env.DB.prepare("SELECT k, v FROM config WHERE k IN ('maint','maint_msg')").all();
  const m = {};
  (rows.results || []).forEach((r) => { m[r.k] = r.v; });
  return { maint: m.maint === '1', msg: m.maint_msg || '' };
}

async function api(request, env, url) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return json({ ok: false, err: 'method' }, 405);
  if (url.pathname === '/api/info') return json({ ok: true, bot: await getBotName(env) });
  let body;
  try { body = await request.json(); } catch (e) { body = {}; }
  if (url.pathname === '/api/status') {
    if (!env.DB) return json({ ok: true, maint: false, msg: '', admin: false, cfg: false });
    await ensure(env);
    const m = await readMaint(env);
    const u = body.initData ? await verify(String(body.initData), env.BOT_TOKEN) : null;
    return json({ ok: true, maint: m.maint, msg: m.msg, admin: isAdmin(env, u), cfg: !!String(env.ADMIN_IDS || '').trim() });
  }
  if (!env.DB) return json({ ok: false, err: 'no_db' }, 503);
  const uid = await verify(String(body.initData || ''), env.BOT_TOKEN);
  if (!uid) return json({ ok: false, err: 'auth' }, 401);
  await ensure(env);
  if (url.pathname === '/api/maint') {
    if (!isAdmin(env, uid)) return json({ ok: false, err: 'forbidden' }, 403);
    const on = body.on ? '1' : '0';
    const msg = String(body.msg || '').slice(0, 140);
    await env.DB.batch([
      env.DB.prepare('INSERT INTO config (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind('maint', on),
      env.DB.prepare('INSERT INTO config (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind('maint_msg', msg),
    ]);
    return json({ ok: true, maint: on === '1', msg });
  }
  if (url.pathname === '/api/load') {
    const row = await env.DB.prepare('SELECT sv, state FROM players WHERE id = ?').bind(uid).first();
    return json({ ok: true, state: row ? JSON.parse(row.state) : null, sv: row ? row.sv : 0 });
  }
  if (url.pathname === '/api/save') {
    const st = body.state;
    if (!st || typeof st !== 'object') return json({ ok: false, err: 'state' }, 400);
    const raw = JSON.stringify(st);
    if (raw.length > 400000) return json({ ok: false, err: 'size' }, 413);
    const sv = Number(st.sv) || Date.now();
    const row = await env.DB.prepare('SELECT sv FROM players WHERE id = ?').bind(uid).first();
    if (row && row.sv > sv) return json({ ok: false, err: 'newer', sv: row.sv }, 409);
    await env.DB.prepare(
      'INSERT INTO players (id, sv, state) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET sv = excluded.sv, state = excluded.state'
    ).bind(uid, sv, raw).run();
    await env.DB.prepare('INSERT INTO stats (id, spins) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET spins = excluded.spins')
      .bind(uid, Math.max(0, Math.floor(Number(st.spins) || 0))).run();
    return json({ ok: true, sv });
  }
  if (url.pathname === '/api/refs') {
    const t = await env.DB.prepare(
      `SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN COALESCE(s.spins,0) >= ${REF_NEED} THEN 1 ELSE 0 END),0) AS act FROM referrals r LEFT JOIN stats s ON s.id = r.invitee WHERE r.inviter = ?`
    ).bind(uid).first();
    const l = await env.DB.prepare(
      'SELECT r.name AS name, COALESCE(s.spins,0) AS spins FROM referrals r LEFT JOIN stats s ON s.id = r.invitee WHERE r.inviter = ? ORDER BY r.ts DESC LIMIT 30'
    ).bind(uid).all();
    const me = await env.DB.prepare('SELECT inviter FROM referrals WHERE invitee = ?').bind(uid).first();
    return json({ ok: true, total: t.total, act: t.act, list: l.results || [], inviter: me ? me.inviter : null });
  }
  return json({ ok: false, err: 'route' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return api(request, env, url);
    if (request.method !== 'POST') {
      return new Response('Бот работает ✅\nТокен: ' + (env.BOT_TOKEN ? 'есть' : 'НЕТ') + '\nСекрет: ' + (env.SECRET ? 'есть' : 'НЕТ') + '\nБаза: ' + (env.DB ? 'есть' : 'НЕТ'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
    if (env.SECRET && request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.SECRET) {
      return new Response('forbidden', { status: 403 });
    }
    let update;
    try { update = await request.json(); } catch (e) { return new Response('ok'); }
    const m = update.message;
    if (m && m.text) {
      const cmd = m.text.trim().split(/\s+/)[0].split('@')[0].toLowerCase();
      const base = { chat_id: m.chat.id, parse_mode: 'HTML', reply_markup: KEYBOARD };
      if (cmd === '/start') {
        const arg = m.text.trim().split(/\s+/)[1] || '';
        let invited = false;
        if (m.from && /^ref_\d{1,15}$/.test(arg)) {
          invited = await registerRef(env, arg.slice(4), String(m.from.id), m.from.first_name);
        }
        await tg(env, 'sendMessage', { ...base, text: HELLO(esc((m.from && m.from.first_name) || 'друг')) + (invited ? '\n\n🎁 Тебя пригласил друг — приветственный бонус ждёт в игре!' : '') });
      } else if (cmd === '/help') {
        await tg(env, 'sendMessage', { ...base, text: HELP });
      } else {
        await tg(env, 'sendMessage', { ...base, text: 'Нажми кнопку ниже, чтобы открыть игру 👇' });
      }
    }
    return new Response('ok');
  },
};
