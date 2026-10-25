// Админ-меню бота: /admin, /stats, /player, /give, /reset, /maint. Доступ — только ADMIN_IDS.
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const nf = (n) => Math.round(Number(n) || 0).toLocaleString('ru-RU').replace(/\u00a0/g, ' ');
const DAY = 86400000;

// ---- настройки игры (шансы, цены, словари): таблица config, ключ game ----
let CFG = { at: 0, v: {} };
export async function gameCfg(env, force) {
  if (!env.DB) return {};
  if (!force && Date.now() - CFG.at < 20000) return CFG.v;
  try {
    const r = await env.DB.prepare("SELECT v FROM config WHERE k = 'game'").first();
    CFG = { at: Date.now(), v: r ? JSON.parse(r.v) : {} };
  } catch (e) { CFG = { at: Date.now(), v: {} }; }
  return CFG.v;
}
async function saveCfg(env, cfg) {
  const raw = JSON.stringify(cfg);
  if (raw.length > 60000) throw new Error('cfg too large');
  await env.DB.prepare('INSERT INTO config (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind('game', raw).run();
  CFG = { at: Date.now(), v: cfg };
}
const TRU = { common: 'обыч', norm: 'необыч', rare: 'ред', epic: 'эпи', legend: 'легенд', mythic: 'миф', divine: 'бож' };
function tierId(s) {
  s = String(s || '').toLowerCase();
  if (TRU[s]) return s;
  return Object.keys(TRU).find((k) => s && (s === k || (s.length >= 3 && TRU[k].startsWith(s.slice(0, 3)) && s.startsWith(TRU[k].slice(0, 3))) )) || null;
}
const pct = (x) => (x >= 10 ? x.toFixed(1) : x >= 1 ? x.toFixed(2) : x.toFixed(3)).replace('.', ',');
function chanceTable(E) {
  const i = E.cfgInfo();
  const rows = i.tiers.map((t) => `<code>${t.id.padEnd(6)}</code> ${t.name}: вес <b>${t.w}</b> = <b>${pct(t.pct)}%</b> · цена ${nf(t.rng[0])}–${nf(t.rng[1])} ⭐${t.craft ? ' · крафт ' + Math.round(t.craft * 100) + '%' : ''}`);
  return `🎲 <b>Шансы и цены</b>\nПрокрутка: <b>${nf(i.cost)} ⭐</b>\n\n${rows.join('\n')}`;
}
const CFG_HELP = `\n\n/chance &lt;редкость&gt; &lt;вес&gt; — шанс (вес относительно суммы)
/price &lt;редкость&gt; &lt;мин&gt; &lt;макс&gt; — базовая цена
/craftp &lt;редкость&gt; &lt;%&gt; — шанс крафта
/cost &lt;⭐&gt; — цена прокрутки
/pool [список] add|del|show &lt;слова&gt; — словари ников
/cfg reset — вернуть заводские значения
Редкости: common norm rare epic legend mythic divine`;

async function cfgMessage(d, cmd, args, say) {
  const { env, E } = d;
  const cfg = JSON.parse(JSON.stringify(await gameCfg(env, true)));
  const apply = async () => { E.setConfig(cfg); await saveCfg(env, cfg); };
  const show = async (head) => { E.setConfig(cfg); await say((head ? head + '\n\n' : '') + chanceTable(E)); };
  if (cmd === '/chance') {
    if (!args.length) { await show(); await say(CFG_HELP.trim()); return; }
    const t = tierId(args[0]), v = parseFloat(String(args[1] || '').replace(',', '.'));
    if (!t || !(v >= 0.001 && v <= 1000)) { await say('Формат: /chance &lt;редкость&gt; &lt;вес 0,001–1000&gt;'); return; }
    cfg.w = { ...(cfg.w || {}), [t]: v }; await apply(); await show('✅ Шанс обновлён'); return;
  }
  if (cmd === '/price') {
    const t = tierId(args[0]), lo = Math.round(+args[1]), hi = Math.round(+args[2]);
    if (!t || !(lo >= 1) || !(hi >= lo) || hi > 1e7) { await say('Формат: /price &lt;редкость&gt; &lt;мин&gt; &lt;макс&gt;'); return; }
    cfg.rng = { ...(cfg.rng || {}), [t]: [lo, hi] }; await apply(); await show('✅ Цена обновлена'); return;
  }
  if (cmd === '/craftp') {
    const t = tierId(args[0]), v = parseFloat(String(args[1] || '').replace(',', '.'));
    if (!t || t === 'divine' || !(v >= 0 && v <= 100)) { await say('Формат: /craftp &lt;редкость&gt; &lt;0–100&gt; (божественные не крафтятся)'); return; }
    cfg.craft = { ...(cfg.craft || {}), [t]: v / 100 }; await apply(); await show('✅ Шанс крафта обновлён'); return;
  }
  if (cmd === '/cost') {
    const v = Math.round(+args[0]);
    if (!(v >= 1 && v <= 1e5)) { await say('Формат: /cost &lt;1–100000&gt;'); return; }
    cfg.cost = v; await apply(); await show('✅ Цена прокрутки обновлена'); return;
  }
  if (cmd === '/pool') {
    E.setConfig(cfg);
    const info = E.cfgInfo().pools;
    const name = String(args[0] || '').toLowerCase();
    if (!name) { await say('📚 <b>Словари</b>\n\n' + info.map(([k, n]) => `<code>${k}</code> — ${n}`).join('\n') + '\n\n/pool &lt;имя&gt; add|del|show &lt;слова&gt;'); return; }
    if (!info.some(([k]) => k === name)) { await say('Нет такого словаря. Доступны: ' + info.map(([k]) => k).join(', ')); return; }
    const act = String(args[1] || 'show').toLowerCase();
    const words = args.slice(2).map((x) => x.toLowerCase().replace(/^@/, '')).filter((x) => /^[a-z0-9_]{1,32}$/.test(x)).slice(0, 100);
    if (act === 'show') { await say(`📚 <b>${name}</b> (${info.find(([k]) => k === name)[1]})\n${E.poolWords(name).slice(-80).map((w) => '<code>' + w + '</code>').join(' ')}`); return; }
    if ((act !== 'add' && act !== 'del') || !words.length) { await say('Формат: /pool &lt;имя&gt; add|del &lt;слова через пробел&gt; (a–z, 0–9, _)'); return; }
    const key = act === 'add' ? 'add' : 'del', other = act === 'add' ? 'del' : 'add';
    cfg[key] = cfg[key] || {}; cfg[other] = cfg[other] || {};
    cfg[key][name] = [...new Set([...(cfg[key][name] || []), ...words])];
    cfg[other][name] = (cfg[other][name] || []).filter((w) => !words.includes(w));
    await apply();
    await say(`✅ ${act === 'add' ? 'Добавлено' : 'Убрано'}: ${words.map((w) => '<code>' + w + '</code>').join(' ')}\nВ словаре <code>${name}</code> теперь ${E.cfgInfo().pools.find(([k]) => k === name)[1]} слов.`);
    return;
  }
  if (cmd === '/cfg') {
    if (String(args[0] || '').toLowerCase() === 'reset') {
      await say('⚠️ <b>Вернуть шансы, цены и словари к заводским?</b>', { inline_keyboard: [[{ text: '↩️ Да, сбросить', callback_data: 'c:reset' }, { text: 'Отмена', callback_data: 'a:menu' }]] });
      return;
    }
    E.setConfig(cfg);
    const raw = JSON.stringify(cfg);
    await say(`⚙️ <b>Свои настройки</b>\n<pre>${esc(raw.length > 3000 ? raw.slice(0, 3000) + '…' : raw)}</pre>\n/cfg reset — сбросить`);
    return;
  }
}


const PANEL_KB = {
  inline_keyboard: [
    [{ text: '📊 Статистика', callback_data: 'a:stats' }, { text: '🏆 Топ игроков', callback_data: 'a:top' }],
    [{ text: '💰 Выдать ⭐', callback_data: 'a:give' }, { text: '🎲 Шансы', callback_data: 'a:chance' }],
    [{ text: '💎 Выдать TON', callback_data: 'a:giveton' }, { text: '🎁 Выдать всем', callback_data: 'a:giveall' }],
    [{ text: '🏪 Маркет', callback_data: 'a:market' }, { text: '📢 Объявление', callback_data: 'a:notice' }],
    [{ text: '🛠 Тех. работы', callback_data: 'a:maint' }, { text: '📖 Команды', callback_data: 'a:help' }],
  ],
};
const BACK_KB = { inline_keyboard: [[{ text: '‹ Меню', callback_data: 'a:menu' }]] };

export const ADMIN_HELP = `🛡 <b>Админ-меню</b>

/admin — панель
/stats — статистика игры
/player &lt;id|@ник&gt; — карточка игрока
/give &lt;id|@ник&gt; star|ton &lt;сумма&gt; — выдать валюту
/giveall star|ton &lt;сумма&gt; — выдать всем игрокам (с подтверждением)
/market — статистика маркета игроков
/dellot &lt;номер&gt; — снять лот (ник/подарок вернётся продавцу, ставка покупателю)
/take &lt;id|@ник&gt; star|ton &lt;сумма&gt; — списать
/free &lt;id|@ник&gt; &lt;N&gt; — бесплатные прокрутки
/nick &lt;id|@ник&gt; &lt;редкость&gt; &lt;ник&gt; [бонус] — выдать ник
/find &lt;ник&gt; — у кого лежит ник
/ban &lt;id|@ник&gt; [причина], /unban, /bans — блокировки
/promo add КОД star|ton|spins N ЛИМИТ · del КОД · list — промокоды (игроки: /code КОД)
/notice &lt;текст|off&gt; — объявление в игре
/reset &lt;id|@ник&gt; — сбросить прогресс (с подтверждением)
/maint on|off [текст] — тех. работы

⚙️ <b>Настройка игры</b>${CFG_HELP}`;

async function statsText(env, readMaint) {
  const now = Date.now();
  const t = await env.DB.prepare(
    `SELECT COUNT(*) AS n,
            COALESCE(SUM(CASE WHEN sv > ? THEN 1 ELSE 0 END),0) AS d1,
            COALESCE(SUM(CASE WHEN sv > ? THEN 1 ELSE 0 END),0) AS d7,
            COALESCE(SUM(json_extract(state,'$.yuz')),0) AS stars,
            COALESCE(SUM(json_extract(state,'$.ton')),0) AS ton,
            COALESCE(SUM(json_array_length(state,'$.coll')),0) AS nicks
       FROM players`
  ).bind(now - DAY, now - 7 * DAY).first();
  const sp = await env.DB.prepare('SELECT COALESCE(SUM(spins),0) AS s FROM stats').first();
  const rf = await env.DB.prepare('SELECT COUNT(*) AS n FROM referrals').first();
  const m = await readMaint(env);
  return `📊 <b>Статистика</b>

👥 Игроков: <b>${nf(t.n)}</b>
🟢 Активны за 24 ч: <b>${nf(t.d1)}</b> · за 7 дн: <b>${nf(t.d7)}</b>
🎰 Прокруток всего: <b>${nf(sp.s)}</b>
🗂 Ников в коллекциях: <b>${nf(t.nicks)}</b>
⭐ Звёзд у игроков: <b>${nf(t.stars)}</b>
💎 TON у игроков: <b>${(Number(t.ton) || 0).toFixed(2)}</b>
🤝 Приглашений: <b>${nf(rf.n)}</b>
🛠 Тех. работы: <b>${m.maint ? 'включены' : 'выключены'}</b>`;
}

async function marketText(env) {
  const q = (s) => env.DB.prepare(s).first();
  const a = await q("SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN mode = 'auction' THEN 1 ELSE 0 END),0) AS au, COALESCE(SUM(CASE WHEN COALESCE(kind,'nick') = 'gift' THEN 1 ELSE 0 END),0) AS gf FROM listings WHERE status = 'active'");
  const s = await q("SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN COALESCE(cc,'star') = 'star' THEN COALESCE(NULLIF(bid,0), price) ELSE 0 END),0) AS stars, COALESCE(SUM(CASE WHEN cc = 'ton' THEN COALESCE(NULLIF(bid,0), price) ELSE 0 END),0) AS ton FROM listings WHERE status = 'sold'");
  const last = await env.DB.prepare("SELECT id, u, seller_name, mode, price, bid, cc FROM listings WHERE status = 'active' ORDER BY id DESC LIMIT 8").all();
  const rows = (last.results || []).map((x) => `#${x.id} ${esc(x.u)} · ${x.cc === 'ton' ? ((x.bid || x.price) / 1000) + ' 💎' : nf(x.bid || x.price) + ' ⭐'} · ${x.mode === 'auction' ? 'аукцион' : 'продажа'} · @${esc(x.seller_name || '?')}`);
  return `🏪 <b>Маркет игроков</b>

Активных лотов: <b>${nf(a.n)}</b> (аукционов ${nf(a.au)}, подарков ${nf(a.gf)})
Продано всего: <b>${nf(s.n)}</b> · на ${nf(s.stars)} ⭐ и ${(s.ton / 1000).toFixed(2)} 💎
Комиссия сервиса: 5%

${rows.length ? '<b>Последние лоты</b>\n' + rows.join('\n') + '\n\nСнять лот: /dellot &lt;номер&gt;' : 'Лотов пока нет'}`;
}

async function topText(env) {
  const r = await env.DB.prepare(
    `SELECT p.id AS id, p.uname AS u, COALESCE(s.spins,0) AS sp, json_extract(p.state,'$.yuz') AS y
       FROM players p LEFT JOIN stats s ON s.id = p.id ORDER BY y DESC LIMIT 10`
  ).all();
  const rows = (r.results || []).map((x, i) => `${i + 1}. ${x.u ? '@' + esc(x.u) : x.id} — ⭐ ${nf(x.y)} · 🎰 ${nf(x.sp)}`);
  return '🏆 <b>Топ-10 по ⭐</b>\n\n' + (rows.join('\n') || 'Пока пусто');
}

async function findId(env, q) {
  q = String(q || '').trim();
  if (/^\d{1,15}$/.test(q)) return q;
  const u = q.replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(u)) return null;
  const r = await env.DB.prepare('SELECT id FROM players WHERE uname = ?').bind(u).first();
  return r ? r.id : null;
}

async function playerText(env, id) {
  const r = await env.DB.prepare(
    `SELECT p.id AS id, p.uname AS u, p.sv AS sv, p.state AS st, COALESCE(s.spins,0) AS sp
       FROM players p LEFT JOIN stats s ON s.id = p.id WHERE p.id = ?`
  ).bind(id).first();
  if (!r) return null;
  const S = JSON.parse(r.st);
  const best = (S.coll || []).slice().sort((a, b) => (b.base || 0) - (a.base || 0))[0];
  return `👤 <b>${r.u ? '@' + esc(r.u) : 'без ника'}</b> · <code>${r.id}</code>

⭐ ${nf(S.yuz)} · 💎 ${(Number(S.ton) || 0).toFixed(2)}
🎰 Прокруток: ${nf(r.sp)}
🎁 Подарков: ${(S.gf || []).length}
🗂 Ников: ${(S.coll || []).length}${best ? ' · лучший @' + esc(best.u) : ''}
🕒 Был: ${new Date(r.sv).toISOString().replace('T', ' ').slice(0, 16)} UTC`;
}

async function setMaint(env, on, msg) {
  const q = 'INSERT INTO config (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v';
  await env.DB.batch([env.DB.prepare(q).bind('maint', on ? '1' : '0'), env.DB.prepare(q).bind('maint_msg', msg || '')]);
}

// d: { env, tg, isAdmin, runAct, readMaint, ensure }
export async function adminMessage(d, m, cmd) {
  const { env, tg } = d;
  const uid = String(m.from && m.from.id);
  if (!d.isAdmin(env, uid)) return false;
  if (!env.DB) { await tg(env, 'sendMessage', { chat_id: m.chat.id, text: 'База данных не подключена' }); return true; }
  await d.ensure(env);
  const args = m.text.trim().split(/\s+/).slice(1);
  const say = (text, kb) => tg(env, 'sendMessage', { chat_id: m.chat.id, parse_mode: 'HTML', text, ...(kb ? { reply_markup: kb } : {}) });

  if (cmd === '/admin') { await say('🛡 <b>Админ-панель</b>\n\n' + (await statsText(env, d.readMaint)), PANEL_KB); return true; }
  if (cmd === '/stats') { await say(await statsText(env, d.readMaint)); return true; }
  if (cmd === '/player') {
    const id = await findId(env, args[0]);
    const t = id && (await playerText(env, id));
    await say(t || 'Игрок не найден. Формат: /player &lt;id|@ник&gt;');
    return true;
  }
  if (cmd === '/give') {
    const id = await findId(env, args[0]);
    const cur = String(args[1] || '').toLowerCase();
    const kind = cur === 'ton' ? 'ton' : cur === 'star' || cur === 'stars' ? 'star' : null;
    const amt = parseFloat(String(args[2] || '').replace(',', '.'));
    if (!id || !kind || !(amt > 0) || amt > 1e9) { await say('Формат: /give &lt;id|@ник&gt; star|ton &lt;сумма&gt;'); return true; }
    const row = await env.DB.prepare('SELECT uname FROM players WHERE id = ?').bind(id).first();
    if (!row) { await say('Игрок не найден'); return true; }
    await d.runAct(env, id, row.uname, true, 'admGrant', [kind + ':' + amt], null, false);
    await say(`✅ Выдано <b>${kind === 'ton' ? amt + ' 💎' : nf(amt) + ' ⭐'}</b> игроку ${row.uname ? '@' + esc(row.uname) : id}`);
    return true;
  }
  if (cmd === '/reset') {
    const id = await findId(env, args[0]);
    const t = id && (await playerText(env, id));
    if (!t) { await say('Игрок не найден. Формат: /reset &lt;id|@ник&gt;'); return true; }
    await say(t + '\n\n⚠️ <b>Сбросить прогресс этого игрока?</b> Действие необратимо.', {
      inline_keyboard: [[{ text: '🗑 Да, сбросить', callback_data: 'r:' + id }, { text: 'Отмена', callback_data: 'a:menu' }]],
    });
    return true;
  }
  if (cmd === '/giveall') {
    const cur = String(args[0] || '').toLowerCase();
    const kind = cur === 'ton' ? 'ton' : cur === 'star' || cur === 'stars' ? 'star' : null;
    const amt = parseFloat(String(args[1] || '').replace(',', '.'));
    if (!kind || !(amt > 0) || amt > (kind === 'ton' ? 100 : 1e6)) { await say('Формат: /giveall star|ton &lt;сумма&gt; (до 1 000 000 ⭐ или 100 💎)'); return true; }
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM players').first();
    await say(`⚠️ <b>Выдать всем (${nf(n.n)} игроков) по ${kind === 'ton' ? amt + ' 💎' : nf(amt) + ' ⭐'}?</b>`, {
      inline_keyboard: [[{ text: '✅ Да, выдать', callback_data: `g:${kind}:${amt}` }, { text: 'Отмена', callback_data: 'a:menu' }]],
    });
    return true;
  }
  if (cmd === '/market') { await say(await marketText(env)); return true; }
  if (cmd === '/dellot') {
    const id = Math.round(+args[0]);
    const l = id > 0 && (await env.DB.prepare("SELECT * FROM listings WHERE id = ? AND status = 'active'").bind(id).first());
    if (!l) { await say('Активный лот не найден. Формат: /dellot &lt;номер&gt;'); return true; }
    const c = await env.DB.prepare("UPDATE listings SET status = 'cancelled' WHERE id = ? AND status = 'active'").bind(id).run();
    if (!(c && c.meta && c.meta.changes)) { await say('Лот уже закрыт'); return true; }
    const ins = (to, kind, payload) => env.DB.prepare('INSERT INTO inbox (to_id, from_name, kind, payload, ts) VALUES (?, ?, ?, ?, ?)').bind(to, 'админ', kind, JSON.stringify(payload), Date.now());
    const batch = [ins(l.seller, l.kind === 'gift' ? 'gift' : 'nick', { ...JSON.parse(l.nick), note: 'Лот снят администратором: предмет вернулся к тебе' })];
    if (l.bidder && l.bid > 0) batch.push(ins(l.bidder, 'cash', { amount: l.bid, cc: l.cc === 'ton' ? 'ton' : 'star', note: 'Лот снят администратором: ставка возвращена' }));
    await env.DB.batch(batch);
    await say(`✅ Лот #${id} (${esc(l.u)}) снят. Продавцу вернули предмет${l.bidder ? ', покупателю ставку' : ''}.`);
    return true;
  }
  if (['/take', '/free', '/nick', '/find', '/ban', '/unban', '/bans', '/notice', '/promo'].includes(cmd)) { await extraMessage(d, cmd, args, say); return true; }
  if (['/chance', '/price', '/craftp', '/cost', '/pool', '/cfg'].includes(cmd)) { await cfgMessage(d, cmd, args, say); return true; }
  if (cmd === '/maint') {
    const a = String(args[0] || '').toLowerCase();
    if (a !== 'on' && a !== 'off') { const mt = await d.readMaint(env); await say(`🛠 Тех. работы: <b>${mt.maint ? 'включены' : 'выключены'}</b>\n/maint on|off [текст]`); return true; }
    const msg = args.slice(1).join(' ').slice(0, 200);
    await setMaint(env, a === 'on', msg);
    await say(a === 'on' ? '🛠 Тех. работы <b>включены</b>' : '✅ Тех. работы <b>выключены</b>');
    return true;
  }
  return false;
}

export async function adminCallback(d, cb) {
  const { env, tg } = d;
  const uid = String(cb.from && cb.from.id);
  const ans = (text) => tg(env, 'answerCallbackQuery', { callback_query_id: cb.id, ...(text ? { text, show_alert: false } : {}) });
  if (!d.isAdmin(env, uid) || !env.DB || !cb.message) { await ans('Нет доступа'); return; }
  await d.ensure(env);
  const edit = (text, kb) => tg(env, 'editMessageText', {
    chat_id: cb.message.chat.id, message_id: cb.message.message_id, parse_mode: 'HTML', text, reply_markup: kb || BACK_KB,
  });
  const data = String(cb.data || '');
  if (data === 'a:menu') await edit('🛡 <b>Админ-панель</b>\n\n' + (await statsText(env, d.readMaint)), PANEL_KB);
  else if (data === 'a:stats') await edit(await statsText(env, d.readMaint));
  else if (data === 'a:top') await edit(await topText(env));
  else if (data === 'a:help') await edit(ADMIN_HELP);
  else if (data === 'a:give') {
    await ans();
    await tg(env, 'sendMessage', { chat_id: cb.message.chat.id, text: '💰 Кому и сколько ⭐ выдать?\nОтветь на это сообщение: @ник 5000 (или id 5000)', reply_markup: { force_reply: true, input_field_placeholder: '@ник 5000' } });
    return;
  }
  else if (data === 'a:giveton') {
    await ans();
    await tg(env, 'sendMessage', { chat_id: cb.message.chat.id, text: '💎 Кому и сколько TON выдать?\nОтветь на это сообщение: @ник 0.5 (или id 0.5)', reply_markup: { force_reply: true, input_field_placeholder: '@ник 0.5' } });
    return;
  }
  else if (data === 'a:giveall') { await edit('🎁 <b>Выдать всем игрокам</b>\n\nКоманда: <code>/giveall star 1000</code> или <code>/giveall ton 0.1</code>\nДеньги придут при следующем входе игрока в игру.', BACK_KB); }
  else if (data === 'a:notice') { await edit('📢 <b>Объявление в игре</b>\n\n<code>/notice текст</code> — показать всем при входе\n<code>/notice off</code> — убрать', BACK_KB); }
  else if (data === 'a:market') { await edit(await marketText(env), BACK_KB); }
  else if (/^g:(star|ton):[0-9.]{1,12}$/.test(data)) {
    const [, kind, raw] = data.split(':'), amt = parseFloat(raw);
    if (!(amt > 0)) { await ans('Неверная сумма'); return; }
    const unit = kind === 'ton' ? Math.round(amt * 1000) : Math.round(amt);
    const note = '🎁 Подарок от админа: +' + (kind === 'ton' ? amt + ' TON' : nf(amt) + ' ⭐');
    const r = await env.DB.prepare("INSERT INTO inbox (to_id, from_name, kind, payload, ts) SELECT id, 'админ', 'cash', ?, ? FROM players").bind(JSON.stringify({ amount: unit, cc: kind === 'ton' ? 'ton' : 'star', note }), Date.now()).run();
    await ans('Отправлено');
    await edit(`✅ Выдано всем игрокам: <b>${kind === 'ton' ? amt + ' 💎' : nf(amt) + ' ⭐'}</b> (${(r && r.meta && r.meta.changes) || 0} чел.). Получат при следующем входе.`);
    return;
  }
  else if (data === 'a:chance') { d.E.setConfig(await gameCfg(env, true)); await edit(chanceTable(d.E)); }
  else if (data === 'c:reset') {
    await saveCfg(env, {}); d.E.setConfig({});
    await ans('Сброшено'); await edit('↩️ Настройки игры вернулись к заводским\n\n' + chanceTable(d.E)); return;
  }
  else if (data === 'a:maint') {
    const mt = await d.readMaint(env);
    await edit(`🛠 Тех. работы: <b>${mt.maint ? 'включены' : 'выключены'}</b>`, {
      inline_keyboard: [[{ text: mt.maint ? '✅ Выключить' : '🛠 Включить', callback_data: mt.maint ? 'a:moff' : 'a:mon' }], [{ text: '‹ Меню', callback_data: 'a:menu' }]],
    });
  } else if (data === 'a:mon' || data === 'a:moff') {
    await setMaint(env, data === 'a:mon', '');
    await ans(data === 'a:mon' ? 'Включены' : 'Выключены');
    await edit(`🛠 Тех. работы: <b>${data === 'a:mon' ? 'включены' : 'выключены'}</b>`, {
      inline_keyboard: [[{ text: data === 'a:mon' ? '✅ Выключить' : '🛠 Включить', callback_data: data === 'a:mon' ? 'a:moff' : 'a:mon' }], [{ text: '‹ Меню', callback_data: 'a:menu' }]],
    });
    return;
  } else if (/^r:\d{1,15}$/.test(data)) {
    const id = data.slice(2);
    const row = await env.DB.prepare('SELECT uname FROM players WHERE id = ?').bind(id).first();
    if (!row) { await ans('Игрок не найден'); return; }
    await d.runAct(env, id, row.uname, true, 'resetAll', [], null, false);
    await ans('Сброшено');
    await edit(`🗑 Прогресс игрока ${row.uname ? '@' + esc(row.uname) : id} сброшен`);
    return;
  }
  await ans();
}

const TIER_IDS = ['common', 'norm', 'rare', 'epic', 'legend', 'mythic', 'divine'];
async function targetRow(env, q) {
  const id = await findId(env, q);
  if (!id) return null;
  const row = await env.DB.prepare('SELECT id, uname FROM players WHERE id = ?').bind(id).first();
  return row || null;
}
const who = (r) => (r.uname ? '@' + esc(r.uname) : r.id);

async function extraMessage(d, cmd, args, say) {
  const { env } = d;
  if (cmd === '/take') {
    const t = await targetRow(env, args[0]);
    const cur = String(args[1] || '').toLowerCase();
    const kind = cur === 'ton' ? 'ton' : cur === 'star' || cur === 'stars' ? 'star' : null;
    const amt = parseFloat(String(args[2] || '').replace(',', '.'));
    if (!t || !kind || !(amt > 0) || amt > 1e9) { await say('Формат: /take &lt;id|@ник&gt; star|ton &lt;сумма&gt;'); return; }
    await d.runAct(env, t.id, t.uname, true, 'admTake', [kind + ':' + amt], null, false);
    await say(`✅ Списано <b>${kind === 'ton' ? amt + ' 💎' : nf(amt) + ' ⭐'}</b> у ${who(t)}`);
    return;
  }
  if (cmd === '/free') {
    const t = await targetRow(env, args[0]);
    const n = Math.round(+args[1]);
    if (!t || !(n > 0 && n <= 10000)) { await say('Формат: /free &lt;id|@ник&gt; &lt;1–10000&gt;'); return; }
    await d.runAct(env, t.id, t.uname, true, 'admFree', [n], null, false);
    await say(`✅ ${who(t)}: +${n} бесплатных прокруток`);
    return;
  }
  if (cmd === '/nick') {
    const t = await targetRow(env, args[0]);
    const tr = tierId(args[1]), nm = String(args[2] || '').toLowerCase().replace(/^@/, '');
    const k = args[3] ? +args[3] : 0;
    if (!t || !tr || !/^[a-z0-9_]{1,32}$/.test(nm)) { await say('Формат: /nick &lt;id|@ник&gt; &lt;редкость&gt; &lt;ник&gt; [бонус 1–100]'); return; }
    const r = await d.runAct(env, t.id, t.uname, true, 'admNick', [{ tier: tr, u: nm, k }], null, false);
    const res = r.out.res;
    await say(res && res.ok ? `✅ @${esc(nm)} (${tr}${res.r.k > 1 ? ', бонус ×' + res.r.k : ''}) выдан ${who(t)}` : res && res.err === 'dup' ? 'У игрока уже есть такой ник' : 'Не получилось выдать ник');
    return;
  }
  if (cmd === '/find') {
    const nm = String(args[0] || '').toLowerCase().replace(/^@/, '');
    if (!/^[a-z0-9_]{1,32}$/.test(nm)) { await say('Формат: /find &lt;ник&gt;'); return; }
    const r = await env.DB.prepare("SELECT id, uname FROM players WHERE state LIKE ? LIMIT 10").bind('%"u":"' + nm + '"%').all();
    const rows = (r.results || []).map((x) => `• ${who(x)} · <code>${x.id}</code>`);
    await say(rows.length ? `🔎 @${esc(nm)} лежит у:\n${rows.join('\n')}` : `@${esc(nm)} ни у кого не найден`);
    return;
  }
  if (cmd === '/ban') {
    const id = await findId(env, args[0]);
    if (!id) { await say('Формат: /ban &lt;id|@ник&gt; [причина]'); return; }
    if (d.isAdmin(env, id)) { await say('Админа банить нельзя'); return; }
    await env.DB.prepare('INSERT INTO bans (id, reason, ts) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET reason = excluded.reason, ts = excluded.ts').bind(id, args.slice(1).join(' ').slice(0, 200), Date.now()).run();
    await say(`⛔ Игрок <code>${id}</code> заблокирован`);
    return;
  }
  if (cmd === '/unban') {
    const id = await findId(env, args[0]);
    if (!id) { await say('Формат: /unban &lt;id|@ник&gt;'); return; }
    await env.DB.prepare('DELETE FROM bans WHERE id = ?').bind(id).run();
    await say(`✅ Игрок <code>${id}</code> разблокирован`);
    return;
  }
  if (cmd === '/bans') {
    const r = await env.DB.prepare('SELECT b.id AS id, b.reason AS reason, p.uname AS uname FROM bans b LEFT JOIN players p ON p.id = b.id ORDER BY b.ts DESC LIMIT 30').all();
    const rows = (r.results || []).map((x) => `• ${x.uname ? '@' + esc(x.uname) : x.id} <code>${x.id}</code>${x.reason ? ' — ' + esc(x.reason) : ''}`);
    await say('⛔ <b>Блокировки</b>\n\n' + (rows.join('\n') || 'Пока никого'));
    return;
  }
  if (cmd === '/notice') {
    const text = args.join(' ').trim();
    if (!text) { const r = await env.DB.prepare("SELECT v FROM config WHERE k = 'notice'").first(); await say(r && r.v ? '📢 Сейчас в игре:\n' + esc(r.v) : 'Объявления нет. /notice &lt;текст&gt; — показать, /notice off — убрать'); return; }
    const off = text.toLowerCase() === 'off';
    await env.DB.prepare('INSERT INTO config (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind('notice', off ? '' : text.slice(0, 400)).run();
    await say(off ? '✅ Объявление убрано' : '📢 Объявление опубликовано: игроки увидят его при входе');
    return;
  }
  if (cmd === '/promo') {
    const act = String(args[0] || '').toLowerCase();
    if (act === 'list' || !act) {
      const r = await env.DB.prepare('SELECT code, kind, amount, uses FROM promos ORDER BY ts DESC LIMIT 30').all();
      const rows = (r.results || []).map((x) => `<code>${esc(x.code)}</code> — ${x.kind === 'spins' ? nf(x.amount) + ' прокруток' : x.kind === 'ton' ? x.amount + ' 💎' : nf(x.amount) + ' ⭐'}, осталось ${x.uses}`);
      await say('🎟 <b>Промокоды</b>\n\n' + (rows.join('\n') || 'Пока нет') + '\n\n/promo add КОД star|spins N ЛИМИТ');
      return;
    }
    if (act === 'del') { await env.DB.prepare('DELETE FROM promos WHERE code = ?').bind(String(args[1] || '').toUpperCase()).run(); await say('✅ Удалён'); return; }
    if (act === 'add') {
      const code = String(args[1] || '').toUpperCase(), kind = String(args[2] || '').toLowerCase() === 'spins' ? 'spins' : String(args[2] || '').toLowerCase().startsWith('star') ? 'star' : String(args[2] || '').toLowerCase() === 'ton' ? 'ton' : null;
      const amt = kind === 'ton' ? parseFloat(String(args[3]).replace(',', '.')) : Math.round(+args[3]), uses = Math.round(+args[4]);
      if (!/^[A-Z0-9_]{3,20}$/.test(code) || !kind || !(amt > 0 && amt <= (kind === 'ton' ? 100 : 1e7)) || !(uses > 0 && uses <= 1e6)) { await say('Формат: /promo add КОД star|spins N ЛИМИТ (код: A–Z, 0–9, _)'); return; }
      await env.DB.prepare('INSERT INTO promos (code, kind, amount, uses, ts) VALUES (?, ?, ?, ?, ?) ON CONFLICT(code) DO UPDATE SET kind = excluded.kind, amount = excluded.amount, uses = excluded.uses').bind(code, kind, amt, uses, Date.now()).run();
      await say(`🎟 Промокод <code>${code}</code>: ${kind === 'spins' ? nf(amt) + ' прокруток' : kind === 'ton' ? amt + ' 💎' : nf(amt) + ' ⭐'}, ${uses} активаций.\nИгроки вводят в боте: <code>/code ${code}</code>`);
      return;
    }
    await say('Формат: /promo add|del|list');
  }
}

// Игрок вводит /code КОД в боте
export async function adminCode(d, m) {
  const { env, tg } = d;
  const reply = (text) => tg(env, 'sendMessage', { chat_id: m.chat.id, parse_mode: 'HTML', text });
  if (!env.DB) return;
  await d.ensure(env);
  const uid = String(m.from && m.from.id);
  const code = String(m.text.trim().split(/\s+/)[1] || '').toUpperCase();
  if (!/^[A-Z0-9_]{3,20}$/.test(code)) { await reply('Отправь код так: <code>/code КОД</code>'); return; }
  if (await env.DB.prepare('SELECT 1 AS x FROM bans WHERE id = ?').bind(uid).first()) return;
  const p = await env.DB.prepare('SELECT kind, amount, uses FROM promos WHERE code = ?').bind(code).first();
  if (!p || p.uses <= 0) { await reply('Такого промокода нет или он закончился'); return; }
  const had = await env.DB.prepare('SELECT 1 AS x FROM players WHERE id = ?').bind(uid).first();
  if (!had) { await reply('Сначала открой игру, потом вводи код'); return; }
  const used = await env.DB.prepare('INSERT OR IGNORE INTO promo_used (code, id) VALUES (?, ?)').bind(code, uid).run();
  if (!(used && used.meta && used.meta.changes)) { await reply('Ты уже активировал этот код'); return; }
  const dec = await env.DB.prepare('UPDATE promos SET uses = uses - 1 WHERE code = ? AND uses > 0').bind(code).run();
  if (!(dec && dec.meta && dec.meta.changes)) { await env.DB.prepare('DELETE FROM promo_used WHERE code = ? AND id = ?').bind(code, uid).run(); await reply('Промокод закончился'); return; }
  const u = await env.DB.prepare('SELECT uname FROM players WHERE id = ?').bind(uid).first();
  if (p.kind === 'spins') await d.runAct(env, uid, u && u.uname, true, 'admFree', [p.amount], null, false);
  else await d.runAct(env, uid, u && u.uname, true, 'admGrant', [(p.kind === 'ton' ? 'ton:' : 'star:') + p.amount], null, false);
  await reply(`🎉 Промокод принят: +${p.kind === 'spins' ? nf(p.amount) + ' прокруток' : p.kind === 'ton' ? p.amount + ' 💎' : nf(p.amount) + ' ⭐'}`);
}
