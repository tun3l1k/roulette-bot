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
async function api(request, env, url) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return json({ ok: false, err: 'method' }, 405);
  if (!env.DB) return json({ ok: false, err: 'no_db' }, 503);
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, err: 'json' }, 400); }
  const uid = await verify(String(body.initData || ''), env.BOT_TOKEN);
  if (!uid) return json({ ok: false, err: 'auth' }, 401);
  if (!ready) {
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, sv INTEGER, state TEXT)').run();
    ready = true;
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
    return json({ ok: true, sv });
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
        await tg(env, 'sendMessage', { ...base, text: HELLO(esc((m.from && m.from.first_name) || 'друг')) });
      } else if (cmd === '/help') {
        await tg(env, 'sendMessage', { ...base, text: HELP });
      } else {
        await tg(env, 'sendMessage', { ...base, text: 'Нажми кнопку ниже, чтобы открыть игру 👇' });
      }
    }
    return new Response('ok');
  },
};
