// Скриншоты для визуальной проверки. Замена браузерному MCP на статике.
//
// Использование:  npm run shot                — вся страница целиком
//                 npm run shot -- hero        — секция с id="hero"
//                 npm run shot -- hero myths  — несколько секций за раз
//
// Установка:  npm i -D playwright && npx playwright install chromium
//
// Вьюпорт 360×640 выбран намеренно: он жёстче и по ширине, и по высоте, чем
// всё, что встречается на практике (iPhone SE — 375×667). Прошло на нём —
// прошло везде. См. docs/sections.md.

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const targets = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const base = process.env.SHOT_URL ?? 'http://localhost:4321';
const out = '.screens';

const viewports = [
  { name: 'mobile', width: 360, height: 640 },
  { name: 'desktop', width: 1440, height: 900 },
];

let failed = false;

await mkdir(out, { recursive: true });
const browser = await chromium.launch();

for (const vp of viewports) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  });

  try {
    await page.goto(base, { waitUntil: 'networkidle' });
  } catch (e) {
    console.error(`\nНе открылся ${base}`);
    console.error('Запущен ли dev-сервер? В соседнем терминале: npm run dev');
    console.error(`(${e.message.split('\n')[0]})\n`);
    await page.close();
    await browser.close();
    process.exit(1);
  }

  // Ждём загрузки шрифтов. Возвращаем примитив: FontFaceSet через границу
  // page.evaluate не сериализуется.
  await page.evaluate(() => document.fonts.ready.then(() => true));

  if (targets.length === 0) {
    const file = `${out}/page-${vp.name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
  } else {
    for (const target of targets) {
      const el = page.locator(`#${target}`);
      if ((await el.count()) === 0) {
        console.error(`Нет элемента с id="${target}" — у каждой секции должен быть id`);
        failed = true;
        continue;
      }
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      const file = `${out}/${target}-${vp.name}.png`;
      await el.screenshot({ path: file });
      console.log(file);
    }
  }

  await page.close();
}

await browser.close();
if (failed) process.exit(1);
