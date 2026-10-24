// Сборка серверного движка engine.js из тех же модулей, что и игра.
// Запуск: node tools/build-engine.mjs <папка-с-игрой> [--check]
//   без флага — перезаписывает engine.js;  с --check — только проверяет, что engine.js соответствует игре (код выхода 1, если нет).
// Шапка и хвост (заглушки DOM, список действий ACT) лежат рядом: tools/engine.head.js и tools/engine.tail.js.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Модули игры, которые выполняет сервер (порядок важен)
export const MODULES = ['config', 'util', 'nicks', 'rarity', 'actions', 'economy', 'ledger', 'tasks', 'autosell', 'wheel', 'shop', 'admin', 'refs', 'market', 'generator', 'daily', 'craft'];

export function buildEngine(clientDir, toolsDir) {
  const read = (p) => readFileSync(p, 'utf8');
  const head = read(join(toolsDir, 'engine.head.js'));
  const tail = read(join(toolsDir, 'engine.tail.js'));
  const body = MODULES.map((m) => read(join(clientDir, m + '.js')).replace(/\n+$/, '')).join('\n\n');
  return head + body + '\n' + tail;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const clientDir = args.find((a) => !a.startsWith('--'));
  if (!clientDir) { console.error('Укажи папку с игрой: node tools/build-engine.mjs ../roulette [--check]'); process.exit(2); }
  const toolsDir = dirname(fileURLToPath(import.meta.url));
  const out = join(toolsDir, '..', 'engine.js');
  const next = buildEngine(resolve(clientDir), toolsDir);
  if (check) {
    const same = readFileSync(out, 'utf8') === next;
    console.log(same ? 'engine.js соответствует игре' : 'engine.js устарел: запусти сборку без --check');
    process.exit(same ? 0 : 1);
  }
  writeFileSync(out, next);
  console.log('engine.js собран: ' + next.length + ' символов, модулей: ' + MODULES.length);
}
