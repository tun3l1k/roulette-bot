// Бот «Юзерок: Рулетка» для Cloudflare Workers
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
3. Чем реже ник и больше множителей (имя, зеркало, короткий), тем он дороже.
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

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Бот работает ✅\nТокен: ' + (env.BOT_TOKEN ? 'есть' : 'НЕТ') + '\nСекрет: ' + (env.SECRET ? 'есть' : 'НЕТ'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
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
