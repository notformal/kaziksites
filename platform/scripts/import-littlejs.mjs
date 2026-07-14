import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'vendor-candidates', 'LittleJSArcade');
const publicRoot = path.join(root, 'apps', 'lobby', 'public', 'games', 'littlejs');
const generated = path.join(root, 'apps', 'lobby', 'src', 'littlejs.generated.json');

await fs.rm(publicRoot, { recursive: true, force: true });
await fs.mkdir(publicRoot, { recursive: true });
for (const directory of ['games', 'templates', 'dist']) {
  await fs.cp(path.join(source, directory), path.join(publicRoot, directory), { recursive: true });
}
await fs.copyFile(path.join(source, 'LICENSE'), path.join(publicRoot, 'LICENSE'));

const filenames = (await fs.readdir(path.join(source, 'games')))
  .filter((name) => name.endsWith('.html'))
  .sort((a, b) => a.localeCompare(b));
const title = (filename) => filename
  .replace(/\.html$/, '')
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/^./, (letter) => letter.toUpperCase());
const records = filenames.map((filename, index) => ({
  id: `littlejs-${filename.replace(/\.html$/, '').toLowerCase()}`,
  title: title(filename),
  studio: 'LittleJS Arcade',
  category: 'Arcade',
  icon: ['🎮', '🕹️', '🚀', '🧩', '🎯', '🏁'][index % 6],
  url: `./games/littlejs/games/${filename}`,
  license: 'MIT',
  freePlay: true,
}));
await fs.writeFile(generated, `${JSON.stringify(records, null, 2)}\n`);
console.log(`Imported ${records.length} MIT LittleJS games.`);
