// Тест админ-меню бота: D1-заглушка на node:sqlite + подменённый fetch Telegram.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import worker from '../worker.js';

function makeDB() {
  const db = new DatabaseSync(':memory:');
  const stmt = (sql, b = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => { const r = db.prepare(sql).run(...b); return { meta: { changes: Number(r.changes) } }; },
    first: async () => db.prepare(sql).get(...b) || null,
    all: async () => ({ results: db.prepare(sql).all(...b) }),
  });
  return { prepare: (s) => stmt(s), batch: async (l) => { for (const s of l) await s.run(); return []; } };
}
const sent = [];
globalThis.fetch = async (url, o) => { sent.push({ m: String(url).split('/').pop(), b: JSON.parse(o.body) }); return new Response('{"ok":true}'); };
const env = { BOT_TOKEN: 't', SECRET: 's', ADMIN_IDS: '1, 2', DB: makeDB() };
const post = (u) => worker.fetch(new Request('https://x/', { method: 'POST', headers: { 'X-Telegram-Bot-Api-Secret-Token': 's' }, body: JSON.stringify(u) }), env);
const msg = (id, text) => post({ message: { chat: { id }, from: { id, first_name: 'A' }, text } });
const last = () => sent[sent.length - 1];

test('не-админ не видит админ-команд', async () => {
  sent.length = 0;
  await msg(99, '/stats');
  assert.match(last().b.text, /Нажми кнопку/);
  await post({ callback_query: { id: 'c', from: { id: 99 }, data: 'r:5', message: { chat: { id: 99 }, message_id: 1 } } });
  assert.equal(last().m, 'answerCallbackQuery');
  assert.match(last().b.text, /Нет доступа/);
});

test('панель, статистика, выдача, карточка, сброс, тех. работы', async () => {
  // игрок 500 создаётся через движок
  const { createEngine } = await import('../engine.js');
  const E = createEngine();
  const st = E.fresh(); st.spins = 7; st.coll = [{ u: 'wolf', tier: 'legend', base: 500, ts: 1 }];
  await msg(1, '/admin'); // создаёт таблицы
  await env.DB.prepare('INSERT INTO players (id, sv, state, ver, uname) VALUES (?, ?, ?, 1, ?)').bind('500', Date.now(), JSON.stringify(st), 'vasya').run();
  await env.DB.prepare('INSERT INTO stats (id, spins) VALUES (?, ?)').bind('500', 7).run();

  await msg(1, '/admin');
  assert.match(last().b.text, /Игроков: <b>1<\/b>/);
  assert.ok(last().b.reply_markup.inline_keyboard.length >= 2);

  await msg(1, '/give @vasya star 1000');
  assert.match(last().b.text, /Выдано/);
  await msg(1, '/player 500');
  assert.match(last().b.text, /⭐ 2 500/);
  await msg(1, '/give 500 ton 0.5');
  await msg(1, '/player @vasya');
  assert.match(last().b.text, /💎 0\.50/);
  await msg(1, '/give nobody star 5');
  assert.match(last().b.text, /Формат|не найден/);

  await msg(1, '/reset @vasya');
  const kb = last().b.reply_markup.inline_keyboard[0][0];
  assert.equal(kb.callback_data, 'r:500');
  await post({ callback_query: { id: 'c', from: { id: 1 }, data: kb.callback_data, message: { chat: { id: 1 }, message_id: 9 } } });
  await msg(1, '/player 500');
  assert.match(last().b.text, /⭐ 1 500/);
  assert.match(last().b.text, /Ников: 0/);

  await msg(2, '/maint on Чиним');
  assert.match(last().b.text, /включены/);
  const c = await env.DB.prepare("SELECT v FROM config WHERE k='maint'").first();
  assert.equal(c.v, '1');
  await post({ callback_query: { id: 'c', from: { id: 1 }, data: 'a:moff', message: { chat: { id: 1 }, message_id: 9 } } });
  assert.equal((await env.DB.prepare("SELECT v FROM config WHERE k='maint'").first()).v, '0');
  await post({ callback_query: { id: 'c', from: { id: 1 }, data: 'a:top', message: { chat: { id: 1 }, message_id: 9 } } });
  assert.match(sent.filter((x) => x.m === 'editMessageText').pop().b.text, /vasya/);
});
