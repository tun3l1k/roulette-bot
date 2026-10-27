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
    if (S.pending) run(S, 'sellPending'); // коллекция может быть полной
    assert.ok(S.coll.length <= 50, 'лимит коллекции');
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

test('подарки за TON: покупка, продажа за 70%, передача другу', () => {
  const S = E.fresh();
  assert.equal(run(S, 'buyGift', ['candy-cane']).res.err, 'closed'); // покупка закрыта для игроков
  const adm = { adm: true };
  assert.equal(run(S, 'buyGift', ['candy-cane'], adm).res.err, 'poor');
  S.ton = 1;
  assert.equal(run(S, 'buyGift', ['nope'], adm).res.err, 'item');
  assert.equal(run(S, 'buyGift', ['candy-cane'], adm).res.ok, 1);
  assert.equal(S.ton, 0.95);
  assert.equal(S.gf.length, 1);
  const n = S.gf[0].n;
  const sent = run(S, 'giftSend', ['gift', n, 'bob'], { internal: true });
  assert.equal(sent.res.ok, 1);
  assert.equal(S.gf.length, 0);
  run(S, 'giftRefund', ['gift', sent.res.rec], { internal: true });
  assert.equal(S.gf.length, 1);
  assert.equal(run(S, 'sellGift', [n]).res.ok, 1);
  assert.equal(S.gf.length, 0);
  assert.equal(S.ton, 0.985); // 0.95 + 70% от 0.05
  assert.equal(run(S, 'sellGift', [n]).res.err, 'item');
});

test('залог в TON: p2pPay/p2pRefund и входящие подарок/деньги', () => {
  const S = E.fresh();
  S.ton = 1;
  assert.equal(run(S, 'p2pPay', [1500, 'gift', 'ton'], { internal: true }).res.err, 'poor');
  assert.equal(run(S, 'p2pPay', [400, 'gift', 'ton'], { internal: true }).res.ok, 1);
  assert.equal(S.ton, 0.6);
  run(S, 'p2pRefund', [400, 'ton'], { internal: true });
  assert.equal(S.ton, 1);
  run(S, '__noop', [], { inbox: [{ id: 1, from: 'x', k: 'cash', p: { amount: 250, cc: 'ton', note: 'ok' } }, { id: 2, from: 'x', k: 'gift', p: { g: 'hex-pot', n: 'z1', ts: 1 } }] });
  assert.equal(S.ton, 1.25);
  assert.equal(S.gf[0].g, 'hex-pot');
});

test('старые симулированные лоты исчезают, ники и ставки возвращаются', () => {
  const S = E.fresh();
  S.yuz = 100;
  S.lots = [
    { id: 'a', u: 'mine1', tier: 'rare', base: 10, k: 1, cc: 'star', mine: 1, fx: 0, price: 50, endsAt: Date.now() + 1e6 },
    { id: 'b', u: 'bot1', tier: 'rare', base: 10, k: 1, cc: 'star', fx: 0, price: 70, bidder: 'me', endsAt: Date.now() + 1e6 },
    { id: 'c', u: 'bot2', tier: 'rare', base: 10, k: 1, cc: 'star', fx: 1, price: 30, endsAt: Date.now() + 1e6 },
  ];
  S.offers = [{ id: 'o' }];
  run(S, 'tickNow');
  assert.equal(S.lots, undefined);
  assert.equal(S.offers, undefined);
  assert.equal(S.yuz, 170);
  assert.deepEqual(S.coll.map((x) => x.u), ['mine1']);
  for (const fn of ['bid', 'buyLot', 'listLot']) assert.equal(E.allowed(fn), false, fn);
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

test('таймеры: сутки симуляции без ошибок и без ботов-лотов', () => {
  const S = E.fresh();
  for (let i = 0; i < 40; i++) {
    S.tkAt = Date.now() - 120000;
    run(S, 'tickNow');
  }
  assert.equal(S.lots, undefined);
});

test('крафт: успех повышает редкость, провал даёт ту же, ники сгорают', () => {
  const tiers = ['common', 'norm', 'rare', 'epic', 'legend', 'mythic', 'divine'];
  let wins = 0, loses = 0;
  for (let n = 0; n < 400; n++) {
    const S = E.fresh();
    const t = tiers[n % 6];
    S.coll = ['aaa1', 'bbb2', 'ccc3', 'keep'].map((u, i) => ({ u, tier: i < 3 ? t : 'rare', base: 5, ts: 1 }));
    const r = run(S, 'craftRoll', [['aaa1', 'bbb2', 'ccc3']]).res;
    assert.ok(r.ok, JSON.stringify(r));
    assert.equal(S.coll.length, 2, 'три сгорели, один новый');
    assert.ok(!S.coll.some((x) => ['aaa1', 'bbb2', 'ccc3'].includes(x.u)));
    const want = r.win ? tiers[tiers.indexOf(t) + 1] : t;
    assert.equal(r.r.tier, want);
    r.win ? wins++ : loses++;
  }
  assert.ok(wins > 50 && loses > 50, 'и успехи, и провалы случаются: ' + wins + '/' + loses);
});

test('крафт: некорректные запросы отклоняются без потерь', () => {
  const S = E.fresh();
  S.coll = [{ u: 'a1', tier: 'common', base: 1 }, { u: 'b2', tier: 'common', base: 1 }, { u: 'c3', tier: 'rare', base: 30 }, { u: 'd4', tier: 'divine', base: 9000 }];
  const before = JSON.stringify(S.coll);
  assert.equal(run(S, 'craftRoll', [['a1', 'b2']]).res.err, 'arg');
  assert.equal(run(S, 'craftRoll', [['a1', 'a1', 'b2']]).res.err, 'arg');
  assert.equal(run(S, 'craftRoll', [['a1', 'b2', 'zz']]).res.err, 'item');
  assert.equal(run(S, 'craftRoll', [['a1', 'b2', 'c3']]).res.err, 'tier');
  S.coll.push({ u: 'e5', tier: 'divine', base: 9000 }, { u: 'f6', tier: 'divine', base: 9000 });
  assert.equal(run(S, 'craftRoll', [['d4', 'e5', 'f6']]).res.err, 'max');
  assert.equal(JSON.stringify(S.coll.slice(0, 4)), before);
});

test('настройки: шансы, цена прокрутки, словари применяются и сбрасываются', () => {
  const base = E.cfgInfo();
  assert.equal(base.cost, 100);
  E.setConfig({ w: { divine: 50 }, rng: { rare: [100, 200] }, cost: 250, craft: { rare: 0.9 }, add: { words: ['zzqux'] }, del: { words: ['fox'] } });
  const i = E.cfgInfo();
  assert.equal(i.cost, 250);
  assert.ok(i.tiers.find((t) => t.id === 'divine').pct > 20, 'божественные теперь частые');
  assert.deepEqual(i.tiers.find((t) => t.id === 'rare').rng, [100, 200]);
  assert.equal(i.tiers.find((t) => t.id === 'rare').craft, 0.9);
  const w = E.poolWords('words');
  assert.ok(w.includes('zzqux') && !w.includes('fox'));
  const S = E.fresh(); S.yuz = 1e6;
  const before = S.yuz; run(S, 'spinRoll'); assert.equal(before - S.yuz, 250, 'списывается новая цена');
  // мусор отбрасывается
  E.setConfig({ w: { rare: -5, epic: 'x' }, cost: 0, add: { words: ['Bad Word', '', 'ok_1'] } });
  assert.ok(E.poolWords('words').includes('ok_1') && !E.poolWords('words').includes('Bad Word'));
  assert.equal(E.cfgInfo().cost, 100);
  E.setConfig({});
  const back = E.cfgInfo();
  assert.deepEqual(back.tiers.map((t) => t.w), base.tiers.map((t) => t.w));
  assert.equal(E.poolWords('words').includes('fox'), true);
  assert.equal(E.poolWords('words').includes('zzqux'), false);
});

test('бонус прокрутки: множитель выпадает, цена ника умножается, распределение разумное', () => {
  const S = E.fresh(); S.yuz = 1e9;
  const cnt = {}; let withBonus = 0;
  for (let i = 0; i < 4000; i++) {
    run(S, 'spinRoll');
    const r = S.pending;
    assert.ok([1, 1.5, 2, 3, 5, 10, 25, 100].includes(r.k), 'k=' + r.k);
    cnt[r.k] = (cnt[r.k] || 0) + 1; if (r.k > 1) withBonus++;
    run(S, 'sellPending');
  }
  assert.ok(withBonus > 1500 && withBonus < 2500, 'бонус примерно в половине прокруток: ' + withBonus);
  assert.ok(cnt[1] > cnt[2] && cnt[2] > cnt[10], 'чем больше множитель, тем реже');
});

test('лимит коллекции: 50 ников, дальше нельзя оставлять', () => {
  const S = E.fresh(); S.yuz = 1e9;
  for (let i = 0; i < 50; i++) S.coll.push({ u: 'nick' + i, tier: 'common', base: 3, ts: 1 });
  run(S, 'spinRoll');
  const before = S.pending.u;
  const r = run(S, 'keepPending');
  assert.equal(r.res.err, 'full');
  assert.equal(S.coll.length, 50);
  assert.equal(S.pending.u, before, 'ник остаётся на выбор: продать');
  run(S, 'sellPending');
  assert.equal(S.pending, null);
});

test('рефералы: награды в звёздах, прокрутках и никах, без TON', () => {
  const S = E.fresh(); const y0 = S.yuz, f0 = S.free || 0;
  const r = run(S, 'refsApply', [{ total: 10, act: 10, list: [], inviter: null }], { internal: true });
  assert.equal(S.refPaid, 10);
  assert.equal(S.yuz - y0, 1500 + 5000);
  assert.equal(S.free - f0, 5 + 10);
  assert.equal(S.coll.filter((x) => x.tier === 'epic').length, 1);
  assert.equal(S.coll.filter((x) => x.tier === 'legend').length, 1);
  assert.ok(!S.ton, 'TON за друзей больше не выдаётся');
  const again = run(S, 'refsApply', [{ total: 10, act: 10, list: [], inviter: null }], { internal: true });
  assert.equal(S.yuz - y0, 6500, 'повторно не платит');
});

test('экономика: возврат при продаже всего ≈ 75–90% от цены прокрутки', () => {
  const S = E.fresh(); S.yuz = 1e12; const y0 = S.yuz; let n = 120000;
  for (let i = 0; i < n; i++) { run(S, 'spinRoll'); run(S, 'sellPending'); }
  const rtp = (S.yuz - y0 + n * 100) / (n * 100);
  assert.ok(rtp > 0.68 && rtp < 0.97, 'RTP ' + rtp.toFixed(3));
});

test('гарант удачи: ×2 каждые 50 прокруток, ×50 каждые 150', () => {
  const S = E.fresh();
  S.yuz = 1e9;
  const seen = {};
  for (let i = 0; i < 300; i++) {
    run(S, 'spinRoll');
    run(S, 'sellPending');
    if (S.pity) seen[S.spins] = S.pity;
  }
  assert.equal(seen[50], 2);
  assert.equal(seen[100], 2);
  assert.equal(seen[150], 50);
  assert.equal(seen[300], 50);
  assert.equal(seen[500], undefined);
});

test('множители ников: длина, буквы, цифры, лесенка, подчёркивание', () => {
  const E = createEngine();
  const m = (u) => E.mult(u);
  const lbl = (u) => m(u).parts.map((p) => p[0]);
  assert.ok(lbl('abc').includes('лесенка'));
  assert.ok(lbl('abc123x').includes('лесенка')); // цифры 123 внутри ника
  assert.ok(!lbl('alexander').includes('лесенка'));
  assert.ok(lbl('hello').includes('две одинаковые буквы'));
  assert.ok(lbl('aaab').includes('три одинаковые буквы'));
  assert.ok(lbl('user1111').includes('четыре одинаковые цифры'));
  assert.ok(lbl('user77').includes('две одинаковые цифры'));
  assert.ok(lbl('some_name').includes('подчёркивание'));
  assert.ok(lbl('user48261').includes('много цифр'));
  assert.ok(!lbl('user2024').includes('много цифр'));
  assert.ok(lbl('abccba').includes('зеркальный ник'));
  assert.ok(lbl('boss').includes('статусное слово'));
  assert.equal(m('qxkmvb').m, 1.1); // 6 символов без особенностей
});
