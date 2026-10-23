// Админ-меню бота: /admin, /stats, /player, /give, /reset, /maint. Доступ — только ADMIN_IDS.
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const nf = (n) => Math.round(Number(n) || 0).toLocaleString('ru-RU').replace(/\u00a0/g, ' ');
const DAY = 86400000;

const PANEL_KB = {
  inline_keyboard: [
    [{ text: '📊 Статистика', callback_data: 'a:stats' }, { text: '🏆 Топ игроков', callback_data: 'a:top' }],
    [{ text: '🛠 Тех. работы', callback_data: 'a:maint' }, { text: '📖 Команды', callback_data: 'a:help' }],
  ],
};
const BACK_KB = { inline_keyboard: [[{ text: '‹ Меню', callback_data: 'a:menu' }]] };

export const ADMIN_HELP = `🛡 <b>Админ-меню</b>

/admin — панель
/stats — статистика игры
/player &lt;id|@ник&gt; — карточка игрока
/give &lt;id|@ник&gt; star|ton &lt;сумма&gt; — выдать валюту
/reset &lt;id|@ник&gt; — сбросить прогресс (с подтверждением)
/maint on|off [текст] — тех. работы`;

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
