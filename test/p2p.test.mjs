// Торговля между игроками: лоты, аукцион, перебитые ставки, завершение, отмена.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import worker from '../worker.js';
import { createEngine } from '../engine.js';

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
globalThis.fetch = async (url, o) => {
  const m = String(url).split('/').pop();
  sent.push({ m, b: JSON.parse(o.body) });
  return new Response(m === 'createInvoiceLink' ? '{"ok":true,"result":"https://t.me/$inv123"}' : '{"ok":true}');
};
const env = { BOT_TOKEN: 'tok', SECRET: 's', ADMIN_IDS: '1', DB: makeDB() };
const E = createEngine();

function init(id, name) {
  const p = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id, username: name, first_name: name }) });
  const check = [...p.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => k + '=' + v).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update('tok').digest();
  p.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
  return p.toString();
}
const api = async (id, name, path, body = {}) => {
  const r = await worker.fetch(new Request('https://x' + path, { method: 'POST', body: JSON.stringify({ initData: init(id, name), ...body }) }), env);
  return r.json();
};
async function player(id, name, yuz, coll) {
  await api(id, name, '/api/load');
  const row = await env.DB.prepare('SELECT state FROM players WHERE id = ?').bind(String(id)).first();
  const st = JSON.parse(row.state);
  st.yuz = yuz; st.coll = coll || [];
  await env.DB.prepare('UPDATE players SET state = ?, uname = ? WHERE id = ?').bind(JSON.stringify(st), name, String(id)).run();
}
const bal = async (id) => { const j = await api(id, 'u' + id, '/api/load'); return j.state; };
const nick = (u, base) => ({ u, tier: 'legend', base, k: 1, odds: 0.01, ts: 1 });

test('фикс-цена: выставить, купить, комиссия 5%, ник приходит покупателю', async () => {
  await player(11, 'seller', 0, [nick('wolfking', 100)]);
  await player(12, 'buyer', 1000, []);
  let j = await api(11, 'seller', '/api/p2p/list', { u: 'wolfking', mode: 'fixed', price: 400, dur: 3600 });
  assert.ok(j.ok);
  assert.equal((await bal(11)).coll.length, 0);
  j = await api(12, 'buyer', '/api/p2p/browse', {});
  assert.equal(j.list.length, 1);
  const lot = j.list[0];
  assert.equal(lot.price, 400);
  assert.equal((await api(11, 'seller', '/api/p2p/buy', { id: lot.id })).err, 'self');
  const b = await api(12, 'buyer', '/api/p2p/buy', { id: lot.id });
  assert.ok(b.ok, JSON.stringify(b));
  const s12 = await bal(12);
  assert.equal(s12.yuz, 600);
  assert.equal(s12.coll[0].u, 'wolfking');
  const s11 = await bal(11);
  assert.equal(s11.yuz, 380);
  assert.equal((await api(12, 'buyer', '/api/p2p/buy', { id: lot.id })).err, 'gone');
});

test('покупка без денег: лот остаётся доступным', async () => {
  await player(21, 'rich', 0, [nick('cheapone', 10)]);
  await player(22, 'poor', 5, []);
  await api(21, 'rich', '/api/p2p/list', { u: 'cheapone', mode: 'fixed', price: 50, dur: 3600 });
  const lot = (await api(22, 'poor', '/api/p2p/browse', { q: 'cheapone' })).list[0];
  assert.equal((await api(22, 'poor', '/api/p2p/buy', { id: lot.id })).err, 'poor');
  assert.equal((await api(22, 'poor', '/api/p2p/browse', { q: 'cheapone' })).list.length, 1);
});

test('аукцион: ставки, перебитая ставка возвращается, победитель получает ник', async () => {
  await player(31, 'auc', 0, [nick('rarename', 200)]);
  await player(32, 'bidA', 1000, []);
  await player(33, 'bidB', 1000, []);
  await api(31, 'auc', '/api/p2p/list', { u: 'rarename', mode: 'auction', price: 100, dur: 3600 });
  const lot = (await api(32, 'bidA', '/api/p2p/browse', { q: 'rarename' })).list[0];
  assert.equal((await api(32, 'bidA', '/api/p2p/bid', { id: lot.id, amount: 50 })).err, 'low');
  assert.ok((await api(32, 'bidA', '/api/p2p/bid', { id: lot.id, amount: 100 })).ok);
  assert.equal((await bal(32)).yuz, 900);
  assert.equal((await api(32, 'bidA', '/api/p2p/bid', { id: lot.id, amount: 300 })).err, 'top');
  assert.equal((await api(33, 'bidB', '/api/p2p/bid', { id: lot.id, amount: 101 })).err, 'low');
  assert.ok((await api(33, 'bidB', '/api/p2p/bid', { id: lot.id, amount: 105 })).ok);
  assert.equal((await bal(32)).yuz, 1000); // ставку вернули
  assert.equal((await bal(33)).yuz, 895);
  assert.equal((await api(31, 'auc', '/api/p2p/cancel', { id: lot.id })).err, 'has_bids');
  await env.DB.prepare('UPDATE listings SET end_at = ? WHERE id = ?').bind(Date.now() - 1, lot.id).run();
  const j = await api(33, 'bidB', '/api/p2p/browse', {}); // завершает торги
  assert.ok(!j.list.find((x) => x.id === lot.id));
  const sb = await bal(33);
  assert.equal(sb.coll.find((x) => x.u === 'rarename').u, 'rarename');
  assert.equal((await bal(31)).yuz, 99); // 105 − 5%
});

test('отмена лота без ставок и возврат непроданного', async () => {
  await player(41, 'canc', 0, [nick('aaaaa1', 5), nick('bbbbb2', 5)]);
  await api(41, 'canc', '/api/p2p/list', { u: 'aaaaa1', mode: 'fixed', price: 9, dur: 3600 });
  await api(41, 'canc', '/api/p2p/list', { u: 'bbbbb2', mode: 'auction', price: 9, dur: 3600 });
  const mine = (await api(41, 'canc', '/api/p2p/mine')).list;
  assert.equal(mine.length, 2);
  assert.ok((await api(41, 'canc', '/api/p2p/cancel', { id: mine[0].id })).ok);
  assert.equal((await bal(41)).coll.length, 1);
  await env.DB.prepare('UPDATE listings SET end_at = ? WHERE id = ?').bind(Date.now() - 1, mine[1].id).run();
  await api(41, 'canc', '/api/p2p/browse', {});
  assert.equal((await bal(41)).coll.length, 2);
});

test('нельзя выставить чужой/несуществующий ник и неверные параметры', async () => {
  await player(51, 'chk', 0, [nick('realnick', 5)]);
  assert.equal((await api(51, 'chk', '/api/p2p/list', { u: 'nonick', mode: 'fixed', price: 5, dur: 3600 })).err, 'item');
  assert.equal((await api(51, 'chk', '/api/p2p/list', { u: 'realnick', mode: 'fixed', price: -5, dur: 3600 })).err, 'arg');
  assert.equal((await api(51, 'chk', '/api/p2p/list', { u: 'realnick', mode: 'fixed', price: 5, dur: 7 })).err, 'arg');
  assert.equal((await bal(51)).coll.length, 1);
});

test('ежедневный вход и уровень: награды начисляются на сервере', async () => {
  await player(61, 'daily', 0, []);
  const tz = 0;
  const a = await api(61, 'daily', '/api/act', { fn: 'claimLogin', args: [tz] });
  assert.ok(a.ok);
  assert.equal((await bal(61)).yuz, 200);
  const b = await api(61, 'daily', '/api/act', { fn: 'claimLogin', args: [tz] });
  assert.equal(b.res.err, 'done');
  assert.equal((await bal(61)).yuz, 200);
});

async function giftPlayer(id, name, ton, gf, yuz = 0) {
  await player(id, name, yuz, []);
  const row = await env.DB.prepare('SELECT state FROM players WHERE id = ?').bind(String(id)).first();
  const st = JSON.parse(row.state);
  st.ton = ton; st.gf = gf;
  await env.DB.prepare('UPDATE players SET state = ? WHERE id = ?').bind(JSON.stringify(st), String(id)).run();
}

test('подарок за TON: выставить, купить, комиссия 5% в TON', async () => {
  await giftPlayer(71, 'gseller', 0, [{ g: 'plush-pepe', n: 'g1', ts: 1 }]);
  await giftPlayer(72, 'gbuyer', 2, []);
  let j = await api(71, 'gseller', '/api/p2p/list', { kind: 'gift', u: 'g1', mode: 'fixed', price: 1500, dur: 3600 }); // 1,5 TON
  assert.ok(j.ok, JSON.stringify(j));
  assert.equal((await bal(71)).gf.length, 0);
  const lot = (await api(72, 'gbuyer', '/api/p2p/browse', { kind: 'gift' })).list[0];
  assert.equal(lot.kind, 'gift');
  assert.equal(lot.cc, 'ton');
  assert.equal(lot.g, 'plush-pepe');
  assert.equal((await api(72, 'gbuyer', '/api/p2p/browse', { kind: 'nick' })).list.filter((x) => x.kind === 'gift').length, 0);
  const b = await api(72, 'gbuyer', '/api/p2p/buy', { id: lot.id });
  assert.ok(b.ok, JSON.stringify(b));
  const s2 = await bal(72);
  assert.equal(s2.ton, 0.5);
  assert.equal(s2.gf[0].g, 'plush-pepe');
  assert.equal((await bal(71)).ton, 1.425);
});

test('аукцион подарка за TON: перебитая ставка возвращается в TON', async () => {
  await giftPlayer(81, 'gauc', 0, [{ g: 'hex-pot', n: 'h1', ts: 1 }]);
  await giftPlayer(82, 'gbidA', 3, []);
  await giftPlayer(83, 'gbidB', 3, []);
  await api(81, 'gauc', '/api/p2p/list', { kind: 'gift', u: 'h1', mode: 'auction', price: 1000, dur: 3600 });
  const lot = (await api(82, 'gbidA', '/api/p2p/browse', { kind: 'gift', q: 'hex' })).list[0];
  assert.ok((await api(82, 'gbidA', '/api/p2p/bid', { id: lot.id, amount: 1000 })).ok);
  assert.equal((await bal(82)).ton, 2);
  assert.ok((await api(83, 'gbidB', '/api/p2p/bid', { id: lot.id, amount: 1100 })).ok);
  assert.equal((await bal(82)).ton, 3);
  assert.equal((await api(83, 'gbidB', '/api/p2p/bid', { id: lot.id, amount: 1500 })).err, 'top');
  await env.DB.prepare('UPDATE listings SET end_at = ? WHERE id = ?').bind(Date.now() - 1, lot.id).run();
  await api(83, 'gbidB', '/api/p2p/browse', {});
  assert.equal((await bal(83)).gf[0].g, 'hex-pot');
  assert.equal((await bal(81)).ton, 1.045); // 1,1 − 5%
});

test('подарок: отмена лота и передача другу через /api/send', async () => {
  await giftPlayer(91, 'gsend', 0, [{ g: 'ion-gem', n: 'i1', ts: 1 }, { g: 'candy-cane', n: 'c1', ts: 2 }]);
  await giftPlayer(92, 'gfriend', 0, []);
  await api(91, 'gsend', '/api/p2p/list', { kind: 'gift', u: 'i1', mode: 'fixed', price: 900, dur: 3600 });
  const mine = (await api(91, 'gsend', '/api/p2p/mine')).list[0];
  assert.ok((await api(91, 'gsend', '/api/p2p/cancel', { id: mine.id })).ok);
  assert.equal((await bal(91)).gf.length, 2);
  const s = await api(91, 'gsend', '/api/send', { kind: 'gift', id: 'c1', to: 'gfriend' });
  assert.ok(s.ok, JSON.stringify(s));
  assert.equal((await bal(91)).gf.length, 1);
  assert.equal((await bal(92)).gf[0].g, 'candy-cane');
});

test('покупка подарков в магазине закрыта (раздел в разработке)', async () => {
  await giftPlayer(95, 'shopper', 1, []);
  const r = await api(95, 'shopper', '/api/act', { fn: 'buyGift', args: ['ion-gem'] });
  assert.equal(r.res.err, 'closed');
  const st = await bal(95);
  assert.equal(st.ton, 1);
  assert.equal((st.gf || []).length, 0);
});

test('рейтинг: только реальные игроки, место считается по таблице', async () => {
  await player(101, 'topone', 9e9, []);
  await player(102, 'toptwo', 5, []);
  const r = await api(102, 'toptwo', '/api/top', { cat: 'bal' });
  assert.ok(r.ok);
  assert.equal(r.top[0].n, '@topone');
  assert.ok(r.top.every((x) => !/crypto_king|neo_wolf/.test(x.n)));
  assert.ok(r.rank > 1);
  assert.equal(r.mine, 5);
  assert.equal((await api(101, 'topone', '/api/top', { cat: 'bal' })).rank, 1);
});

const hook = (u) => worker.fetch(new Request('https://x/', { method: 'POST', headers: { 'X-Telegram-Bot-Api-Secret-Token': 's' }, body: JSON.stringify(u) }), env);

test('оплата Stars: счёт, проверка, зачисление один раз', async () => {
  await player(201, 'payer', 0, []);
  const inv = await api(201, 'payer', '/api/invoice', { id: 'p1' });
  assert.equal(inv.link, 'https://t.me/$inv123');
  const req = sent.filter((x) => x.m === 'createInvoiceLink').pop().b;
  assert.equal(req.currency, 'XTR');
  assert.equal(req.prices[0].amount, 50);
  assert.equal(req.payload, 'p1:201');
  assert.equal((await api(201, 'payer', '/api/invoice', { id: 'nope' })).err, 'item');

  await hook({ pre_checkout_query: { id: 'q1', from: { id: 201 }, currency: 'XTR', total_amount: 50, invoice_payload: 'p1:201' } });
  assert.equal(sent.at(-1).b.ok, true);
  await hook({ pre_checkout_query: { id: 'q2', from: { id: 201 }, currency: 'XTR', total_amount: 1, invoice_payload: 'p1:201' } });
  assert.equal(sent.at(-1).b.ok, false);
  await hook({ pre_checkout_query: { id: 'q3', from: { id: 999 }, currency: 'XTR', total_amount: 50, invoice_payload: 'p1:201' } });
  assert.equal(sent.at(-1).b.ok, false);

  const before = (await bal(201)).yuz;
  const pay = { message: { chat: { id: 201 }, from: { id: 201 }, successful_payment: { currency: 'XTR', total_amount: 50, invoice_payload: 'p1:201', telegram_payment_charge_id: 'ch1' } } };
  await hook(pay);
  await hook(pay); // повтор от Telegram не должен выдать второй раз
  const st = await bal(201);
  assert.equal(st.yuz - before, 1000);
  assert.equal(st.spent, 50);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM payments').first()).n, 1);

  await hook({ message: { chat: { id: 201 }, from: { id: 201 }, successful_payment: { currency: 'XTR', total_amount: 1, invoice_payload: 'prem:201', telegram_payment_charge_id: 'ch2' } } });
  assert.equal((await bal(201)).prem, undefined); // неверная сумма: Premium не выдан
  await hook({ message: { chat: { id: 201 }, from: { id: 201 }, successful_payment: { currency: 'XTR', total_amount: 150, invoice_payload: 'prem:201', telegram_payment_charge_id: 'ch3' } } });
  assert.ok((await bal(201)).prem > Date.now());
});
