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

test('настройка игры из бота: /chance /price /cost /pool /cfg', async () => {
  sent.length = 0;
  await msg(1, '/chance');
  assert.match(sent[0].b.text, /Шансы и цены/);
  await msg(1, '/chance divine 40');
  assert.match(sent.at(-1).b.text, /Шанс обновлён/);
  assert.match(sent.at(-1).b.text, /divine<\/code> божественный: вес <b>40<\/b>/);
  await msg(1, '/chance бож 0');
  assert.match(sent.at(-1).b.text, /Формат/);
  await msg(1, '/price rare 100 300');
  assert.match(sent.at(-1).b.text, /100–300/);
  await msg(1, '/cost 150');
  assert.match(sent.at(-1).b.text, /150 ⭐/);
  await msg(1, '/craftp epic 70');
  assert.match(sent.at(-1).b.text, /крафт 70%/);
  await msg(1, '/pool words add testword another_one BAD!');
  assert.match(sent.at(-1).b.text, /testword/);
  await msg(1, '/pool words show');
  assert.match(sent.at(-1).b.text, /testword/);
  const saved = JSON.parse((await env.DB.prepare("SELECT v FROM config WHERE k='game'").first()).v);
  assert.equal(saved.cost, 150);
  assert.deepEqual(saved.add.words, ['testword', 'another_one']);

  // конфиг доходит до игроков: /api/status и цена прокрутки на сервере
  const st = await worker.fetch(new Request('https://x/api/status', { method: 'POST', body: '{}' }), env);
  const sj = await st.json();
  assert.equal(sj.gc.cost, 150);

  // обычный игрок не может менять настройки
  await msg(99, '/cost 1');
  assert.match(last().b.text, /Нажми кнопку/);

  // сброс с подтверждением
  await msg(1, '/cfg reset');
  const kb = last().b.reply_markup.inline_keyboard[0][0];
  assert.equal(kb.callback_data, 'c:reset');
  await post({ callback_query: { id: 'c', from: { id: 1 }, data: 'c:reset', message: { chat: { id: 1 }, message_id: 9 } } });
  assert.equal(JSON.parse((await env.DB.prepare("SELECT v FROM config WHERE k='game'").first()).v).cost, undefined);
  await msg(1, '/chance');
  assert.match(sent.at(-2).b.text, /Прокрутка: <b>100 ⭐/);
});

test('админ: списание, фри-прокрутки, выдача ника, поиск, бан, объявление, промокод', async () => {
  const { createEngine } = await import('../engine.js');
  const st = createEngine().fresh();
  await env.DB.prepare('INSERT OR REPLACE INTO players (id, sv, state, ver, uname) VALUES (?, ?, ?, 1, ?)').bind('600', Date.now(), JSON.stringify(st), 'petya').run();
  sent.length = 0;
  await msg(1, '/take @petya star 500');
  assert.match(last().b.text, /Списано/);
  await msg(1, '/player 600');
  assert.match(last().b.text, /⭐ 1/); // было 1 500 → 1 000
  await msg(1, '/free 600 7');
  await msg(1, '/nick @petya legend zorroo 5');
  assert.match(last().b.text, /@zorroo.*бонус ×5/);
  await msg(1, '/nick @petya legend zorroo');
  assert.match(last().b.text, /уже есть/);
  await msg(1, '/find zorroo');
  assert.match(last().b.text, /@petya/);
  const state = JSON.parse((await env.DB.prepare('SELECT state FROM players WHERE id = ?').bind('600').first()).state);
  assert.equal(state.free, 7);
  assert.ok(state.coll.some((x) => x.u === 'zorroo' && x.tier === 'legend' && x.k === 5));

  // не-админ не может ни выдавать, ни банить
  await msg(99, '/nick 600 divine hacker');
  assert.match(last().b.text, /Нажми кнопку/);

  await msg(1, '/ban 600 спам');
  assert.match(last().b.text, /заблокирован/);
  await msg(1, '/bans');
  assert.match(last().b.text, /спам/);
  await msg(1, '/unban 600');
  assert.match(last().b.text, /разблокирован/);
  await msg(1, '/ban 1');
  assert.match(last().b.text, /нельзя/);

  await msg(1, '/notice Завтра обновление');
  const s2 = await (await worker.fetch(new Request('https://x/api/status', { method: 'POST', body: '{}' }), env)).json();
  assert.equal(s2.notice, 'Завтра обновление');
  await msg(1, '/notice off');
  assert.equal((await (await worker.fetch(new Request('https://x/api/status', { method: 'POST', body: '{}' }), env)).json()).notice, '');

  // промокод: один раз на игрока, лимит активаций
  await msg(1, '/promo add TEST1 star 1000 1');
  assert.match(last().b.text, /\/code TEST1/);
  await msg(600, '/code test1');
  assert.match(last().b.text, /Промокод принят/);
  await msg(600, '/code TEST1');
  assert.match(last().b.text, /уже активировал|закончился/);
  await msg(1, '/player 600');
  assert.match(last().b.text, /⭐ 2 000/); // 1 000 + 1 000
  await msg(1, '/promo add FREE1 spins 5 10');
  await msg(600, '/code FREE1');
  assert.match(last().b.text, /5 прокруток/);
  await msg(777, '/code TEST1');
  assert.match(last().b.text, /закончился|нет/);

  // кнопка «Выдать ⭐» и ответ на неё
  await post({ callback_query: { id: 'c', from: { id: 1 }, data: 'a:give', message: { chat: { id: 1 }, message_id: 9 } } });
  const prompt = sent.filter((x) => x.m === 'sendMessage').at(-1);
  assert.ok(prompt.b.reply_markup.force_reply);
  await post({ message: { chat: { id: 1 }, from: { id: 1 }, text: '@petya 250', reply_to_message: { text: prompt.b.text } } });
  assert.match(last().b.text, /Выдано <b>250 ⭐/);
});

test('админ: TON ответом на кнопку, выдача всем, маркет, снятие лота, промокод в TON', async () => {
  sent.length = 0;
  await post({ callback_query: { id: 'c', from: { id: 1 }, data: 'a:giveton', message: { chat: { id: 1 }, message_id: 3 } } });
  const ask = sent.find((x) => x.m === 'sendMessage');
  assert.match(ask.b.text, /^💎 Кому и сколько TON/);
  const { createEngine } = await import('../engine.js');
  const E = createEngine();
  const st = E.fresh();
  await env.DB.prepare('INSERT OR REPLACE INTO players (id, sv, state, ver, uname) VALUES (?, ?, ?, 1, ?)').bind('700', Date.now(), JSON.stringify(st), 'tonuser').run();
  await post({ message: { chat: { id: 1 }, from: { id: 1, first_name: 'A' }, text: '@tonuser 2.5', reply_to_message: { text: ask.b.text } } });
  assert.match(sent.at(-1).b.text, /Выдано <b>2\.5 💎/);
  assert.equal(JSON.parse((await env.DB.prepare("SELECT state FROM players WHERE id = '700'").first()).state).ton, 2.5);

  await msg(1, '/giveall ton 0.1');
  const kb = sent.at(-1).b.reply_markup.inline_keyboard[0][0];
  assert.equal(kb.callback_data, 'g:ton:0.1');
  await post({ callback_query: { id: 'c', from: { id: 1 }, data: kb.callback_data, message: { chat: { id: 1 }, message_id: 4 } } });
  const row = await env.DB.prepare("SELECT payload FROM inbox WHERE to_id = '700' ORDER BY id DESC").first();
  assert.deepEqual([JSON.parse(row.payload).amount, JSON.parse(row.payload).cc], [100, 'ton']);
  await msg(99, '/giveall star 5');
  assert.match(sent.at(-1).b.text, /Нажми кнопку/);

  await env.DB.prepare("INSERT INTO listings (seller, seller_name, nick, u, tier, mode, price, bid, bidder, bids, end_at, status, created, cc, kind) VALUES ('700', 'tonuser', ?, 'wolfx', 'legend', 'auction', 50, 60, '701', 1, ?, 'active', 1, 'star', 'nick')")
    .bind(JSON.stringify({ u: 'wolfx', tier: 'legend', base: 100, k: 1 }), Date.now() + 1e6).run();
  const lot = await env.DB.prepare("SELECT id FROM listings WHERE u = 'wolfx'").first();
  await msg(1, '/market');
  assert.match(sent.at(-1).b.text, /Активных лотов: <b>1<\/b>/);
  await msg(1, '/dellot ' + lot.id);
  assert.match(sent.at(-1).b.text, /снят/);
  assert.equal((await env.DB.prepare('SELECT status FROM listings WHERE id = ?').bind(lot.id).first()).status, 'cancelled');
  const back = await env.DB.prepare("SELECT kind, payload FROM inbox WHERE to_id = '701'").first();
  assert.equal(back.kind, 'cash');
  assert.equal(JSON.parse(back.payload).amount, 60);

  await msg(1, '/promo add TONCODE ton 0.3 5');
  assert.match(sent.at(-1).b.text, /0\.3 💎/);
  await post({ message: { chat: { id: 700 }, from: { id: 700, first_name: 'T' }, text: '/code TONCODE' } });
  assert.match(sent.at(-1).b.text, /0\.3 💎/);
});

test('админ: /sales и /paysupport', async () => {
  await env.DB.prepare("INSERT OR REPLACE INTO payments (charge, uid, item, amount, ts) VALUES ('t1', '700', 'p2', 250, ?)").bind(Date.now()).run();
  await msg(1, '/sales');
  assert.match(sent.at(-1).b.text, /Всего: <b>1<\/b> платежей · <b>250<\/b>/);
  await msg(99, '/paysupport');
  assert.match(sent.at(-1).b.text, /Поддержка по платежам/);
});
