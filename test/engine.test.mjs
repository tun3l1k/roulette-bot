// Тесты серверного движка. Запуск: node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../engine.js';

const E = createEngine();
const run = (S, fn, args = [], ctx = {}) => E.run(S, fn, args, ctx);

test('движок собирается и создаёт чистое состояние без подарков', () => {
  const S = E.fresh();
  assert.equal(S.yuz, 1500);
  assert.deepEqual(S.coll, []);
  assert.equal(S.gifts, undefined);
});

test('1000 прокруток, продажи и сохранения не падают', () => {
  const S = E.fresh();
  S.yuz = 1e9;
  for (let i = 0; i < 1000; i++) {
    const r = run(S, 'spinRoll');
    assert.ok(!r.res.err, 'spinRoll: ' + r.res.err);
    run(S, i % 3 ? 'sellPending' : 'keepPending');
    if (S.coll.length > 40) run(S, 'sellBulk');
  }
  assert.ok(S.spins >= 1000);
  assert.equal(S.gifts, undefined, 'подарки больше не выдаются');
});

test('колесо фортуны: нет приза-подарка, все выигрыши применяются', () => {
  const S = E.fresh();
  const seen = new Set();
  for (let i = 0; i < 400; i++) {
    S.wt = 3; S.wl = Date.now();
    const r = run(S, 'wheelRoll');
    assert.ok(!r.res.err, 'wheelRoll: ' + r.res.err);
    seen.add(r.res.prize);
  }
  assert.ok(![...seen].some((p) => /подарок/i.test(p)), 'призов-подарков быть не должно: ' + [...seen]);
  assert.equal(S.gifts, undefined);
});

test('бонус дня на 7-й день не падает (раньше выдавал подарок)', () => {
  const S = E.fresh();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const dk = (d) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  S.streak = 6; S.lastChest = dk(y);
  S.tq = { day: dk(new Date()), p: {}, c: {} };
  ['spin10', 'keep3', 'sell5', 'rare1', 'bid1', 'list1', 'wheel'].forEach((id) => { S.tq.c[id] = 1; });
  const before = S.ton || 0;
  const r = run(S, 'claimChest');
  assert.ok(!r.res.err, 'claimChest: ' + r.res.err);
  assert.ok(S.ton > before, 'на 7-й день полагается TON');
  assert.equal(S.gifts, undefined);
});

test('старые подарки один раз превращаются в звёзды', () => {
  const S = E.fresh();
  S.gifts = [
    { id: 'a', type: 'candy', up: 0 },
    { id: 'b', type: 'snoop', up: 1, md: ['Неон', 2], bd: ['Небо', '#4aa3ff', '#1b4fa8', 1], sy: ['🔥', 2], ser: 5 },
  ];
  S.glog = [{ t: 1, x: 'старое' }]; S.cl = { farm: { d: 'x', n: 1 } }; S.gt = 'shop';
  const y0 = S.yuz;
  const r = run(S, '__load');
  const expected = Math.round(50 * 0.7) + Math.round(200 * (1 + 0.8 + 0.3 + 0.8 + 2) * 0.7);
  assert.equal(S.yuz - y0, expected);
  assert.ok(r.msgs.some((m) => /Подарки убраны/.test(m)));
  for (const k of ['gifts', 'glog', 'cl', 'gt']) assert.equal(S[k], undefined, k + ' должен быть удалён');
  const y1 = S.yuz;
  run(S, '__load');
  assert.equal(S.yuz, y1, 'повторная загрузка не должна платить снова');
});

test('действия с подарками больше недоступны', () => {
  for (const fn of ['buyGift', 'upgradeGift', 'sellGift']) assert.equal(E.allowed(fn), false, fn);
  const S = E.fresh();
  assert.deepEqual(run(S, 'giftSend', ['gift', 'x', 'bob'], { internal: true }).res, { err: 'item' });
});

test('передача ника другу: списание и возврат', () => {
  const S = E.fresh();
  S.coll = [{ u: 'wolf', tier: 'legend', base: 500, ts: 1 }];
  const sent = run(S, 'giftSend', ['nick', 'wolf', 'bob'], { internal: true });
  assert.equal(sent.res.ok, 1);
  assert.equal(S.coll.length, 0);
  run(S, 'giftRefund', ['nick', sent.res.rec], { internal: true });
  assert.equal(S.coll.length, 1);
});

test('входящий ник от друга попадает в коллекцию, чужие виды вложений игнорируются', () => {
  const S = E.fresh();
  const items = [
    { id: 1, from: 'bob', k: 'nick', p: { u: 'fox', tier: 'rare', base: 40, ts: 1 } },
    { id: 2, from: 'bob', k: 'gift', p: { id: 'g', type: 'candy' } },
  ];
  const r = run(S, '__load', [], { inbox: items });
  assert.equal(S.coll.length, 1);
  assert.equal(S.coll[0].u, 'fox');
  assert.equal(S.gifts, undefined);
  assert.ok(r.msgs.some((m) => /fox/.test(m)));
});

test('сброс прогресса доступен только админу и сохраняет настройки', () => {
  const S = E.fresh();
  S.yuz = 99999; S.coll = [{ u: 'x', tier: 'mythic', base: 1000, ts: 1 }]; S.theme = 'dark'; S.haptic = false;
  assert.deepEqual(run(S, 'resetAll', [], { adm: false }).res, { err: 'forbidden' });
  assert.equal(S.yuz, 99999, 'без прав ничего не меняется');
  const r = run(S, 'resetAll', [], { adm: true });
  assert.equal(r.res.ok, 1);
  assert.equal(r.S.yuz, 1500);
  assert.deepEqual(r.S.coll, []);
  assert.equal(r.S.theme, 'dark');
  assert.equal(r.S.haptic, false);
});

test('выдача звёзд и TON работает только для админа', () => {
  const S = E.fresh();
  run(S, 'admGrant', ['star:1000'], { adm: false });
  assert.equal(S.yuz, 1500);
  run(S, 'admGrant', ['star:1000'], { adm: true });
  assert.equal(S.yuz, 2500);
  run(S, 'admGrant', ['ton:0.5'], { adm: true });
  assert.equal(S.ton, 0.5);
});

test('маркет и таймеры: сутки симуляции без ошибок', () => {
  const S = E.fresh();
  S.yuz = 1e7;
  for (let i = 0; i < 40; i++) {
    S.tkAt = Date.now() - 120000;
    run(S, 'tickNow');
    for (const l of (S.lots || []).filter((x) => !x.mine).slice(0, 2)) run(S, 'bid', [l.id]);
  }
  assert.ok(Array.isArray(S.lots));
});
