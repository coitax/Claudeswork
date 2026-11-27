/*
 * Spec for the imported-pack fill-blank XSS.
 *
 * These tests drive the real page: file import, pack storage, curriculum load,
 * and both ways a fill-blank sentence is painted (a normal level, and a boss
 * that copies fill-blank sentences from the world's other levels).
 *
 * They expect the secure outcome. They fail while sentences are assigned to
 * innerHTML, and they pass once a sentence is rendered as text with a blank
 * span and the event handler does not run.
 *
 * Run from the repo root:
 *   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
 *   npm test
 *
 * Uses the Chrome binary at CHROME_PATH, or /usr/local/bin/google-chrome.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json'
};

function pack({ id, levels }) {
  return {
    manifest: {
      id,
      name: 'Imported ' + id,
      nativeName: 'Imported',
      flag: 'X',
      ttsLocale: 'fr-FR',
      sttLocale: 'fr-FR'
    },
    vocabulary: {
      gato: {
        en: 'cat',
        category: 'animals',
        phonetic: 'GAH-toh',
        example_es: 'el gato',
        example_en: 'the cat'
      }
    },
    curriculum: {
      worlds: [
        {
          id: 'w1',
          name: 'World One',
          description: 'first world',
          icon: 'W',
          cefr: 'A1',
          levels
        }
      ]
    }
  };
}

function fillLevel(id, sentence) {
  return {
    id,
    name: 'Lesson',
    description: 'lesson',
    vocab: ['gato'],
    exercises: [
      {
        type: 'fill-blank',
        sentences: [
          {
            sentence,
            answer: 'hola',
            distractors: ['adios'],
            hint: 'a hint'
          }
        ]
      }
    ]
  };
}

function markupSentence(prefix, flag) {
  return prefix + ' <img src="x" onerror="window.' + flag + '=1"> ___';
}

async function startServer() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(ROOT + path.sep) && file !== ROOT) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      const data = await readFile(file);
      const type = TYPES[path.extname(file)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { server, origin: 'http://127.0.0.1:' + port };
}

async function launch() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  return { browser, page, errors };
}

async function openApp(page, origin) {
  const ready = page.waitForResponse((res) => res.url().includes('achievements.json') && res.ok());
  await page.goto(origin + '/index.html', { waitUntil: 'domcontentloaded' });
  await ready;
}

async function clickUntilActive(page, selector, screenId) {
  const screen = '#' + screenId + '.active';
  for (let i = 0; i < 25; i++) {
    await page.locator(selector).click();
    if (await page.locator(screen).count()) return;
    await page.waitForTimeout(100);
  }
  const active = await page.locator('.screen.active').getAttribute('id');
  throw new Error('click ' + selector + ' did not open ' + screenId + ' (active=' + active + ')');
}

async function importPackFile(page, data) {
  await clickUntilActive(page, '#btn-language', 'screen-language');
  await clickUntilActive(page, '#language-import-btn', 'screen-import');
  await page.locator('#import-container input[type=file]').setInputFiles({
    name: 'quest-pack-' + data.manifest.id + '.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data))
  });
  await page.locator('#import-container').getByText('FULL PACK JSON').waitFor({ timeout: 5000 });
  const reloaded = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  const ready = page.waitForResponse((res) => res.url().includes('achievements.json') && res.ok());
  await page.locator('#import-container button.primary').click();
  await reloaded;
  await ready;
}

async function startWorldLevel(page, levelSelector) {
  await clickUntilActive(page, '#btn-new-game', 'screen-new-game');
  await page.locator('#player-name').fill('Ada');
  await clickUntilActive(page, '#btn-start-adventure', 'screen-world-map');
  await page.locator('.world-node').click();
  await page.locator('#screen-level-select.active').waitFor();
  await page.locator(levelSelector).click();
  await page.locator('#screen-exercise.active').waitFor();
}

async function readSentence(page, flag) {
  const sentence = page.locator('.exercise-sentence');
  try {
    await sentence.waitFor({ state: 'visible', timeout: 8000 });
  } catch (err) {
    const dump = await page.evaluate(() => ({
      active: document.querySelector('.screen.active') && document.querySelector('.screen.active').id,
      text: document.body.innerText.slice(0, 1500),
      lang: localStorage.getItem('sq_lang')
    }));
    throw new Error('fill-blank sentence was not rendered: ' + JSON.stringify(dump));
  }
  await page.waitForTimeout(500);
  return page.evaluate((flagName) => {
    const el = document.querySelector('.exercise-sentence');
    const danger = el.querySelector('img,script,iframe,svg,object,embed,link,math,video,audio,source');
    const blank = el.querySelector('.blank');
    return {
      flag: window[flagName] || 0,
      text: el.textContent,
      hasBlank: !!blank,
      blankIsSpan: !!blank && blank.tagName === 'SPAN',
      dangerTag: danger ? danger.tagName : null,
      html: el.innerHTML.slice(0, 500)
    };
  }, flag);
}

function assertSafeSentence(state, { flag, prefix }) {
  const problems = [];
  if (state.flag) problems.push('event handler ran (' + flag + '=' + state.flag + ')');
  if (state.dangerTag) problems.push('sentence markup was parsed as HTML (' + state.dangerTag + ')');
  if (!state.hasBlank || !state.blankIsSpan) problems.push('sentence has no span.blank placeholder');
  if (!String(state.text).includes(prefix)) {
    problems.push('sentence text lost the plain-text prefix ' + JSON.stringify(prefix));
  }
  assert.equal(
    problems.length,
    0,
    problems.join('; ') + ' html=' + state.html
  );
}

test('a plain fill-blank sentence still renders a blank', async () => {
  const { server, origin } = await startServer();
  const { browser, page } = await launch();
  try {
    const data = pack({
      id: 'ok',
      levels: [fillLevel('ok-1', 'The cat says ___')]
    });
    await openApp(page, origin);
    await importPackFile(page, data);
    await startWorldLevel(page, '.level-node');
    const state = await readSentence(page, '__xssSafe');
    assertSafeSentence(state, { flag: '__xssSafe', prefix: 'The cat says' });
    const options = await page.locator('.fill-option').allTextContents();
    assert.ok(options.includes('hola') && options.includes('adios'), 'answer choices missing: ' + options.join(','));
  } finally {
    await browser.close();
    server.close();
  }
});

test('imported fill-blank markup must not run on the first level', async () => {
  const { server, origin } = await startServer();
  const { browser, page, errors } = await launch();
  try {
    const flag = '__xssLevel';
    const data = pack({
      id: 'xa',
      levels: [fillLevel('xa-1', markupSentence('LevelHello', flag))]
    });
    await openApp(page, origin);
    await importPackFile(page, data);
    const stored = await page.evaluate(() => localStorage.getItem('sq_pack_xa'));
    assert.ok(stored && stored.includes('LevelHello'), 'importer did not keep the curriculum sentence');
    assert.equal(await page.evaluate(() => localStorage.getItem('sq_lang')), JSON.stringify('xa'));
    await startWorldLevel(page, '.level-node');
    const state = await readSentence(page, flag);
    assertSafeSentence(state, { flag, prefix: 'LevelHello' });
    assert.equal(errors.length, 0, 'page errors: ' + errors.join('\n'));
  } finally {
    await browser.close();
    server.close();
  }
});

test('a boss level must not run fill-blank markup copied from another level', async () => {
  const { server, origin } = await startServer();
  const { browser, page, errors } = await launch();
  try {
    const flag = '__xssBoss';
    const data = pack({
      id: 'xb',
      levels: [
        {
          id: 'xb-boss',
          name: 'BOSS',
          isBoss: true,
          timeLimit: 30,
          vocab: [],
          exercises: []
        },
        fillLevel('xb-hidden', markupSentence('BossHello', flag))
      ]
    });
    await openApp(page, origin);
    await importPackFile(page, data);
    await startWorldLevel(page, '.level-node.boss');
    await page.locator('.boss-name-display').waitFor();
    const state = await readSentence(page, flag);
    assertSafeSentence(state, { flag, prefix: 'BossHello' });
    const hiddenStillLocked = await page.evaluate(() => {
      const raw = localStorage.getItem('sq_xb_player');
      const player = raw ? JSON.parse(raw) : null;
      return !player || !player.completedLevels || !player.completedLevels['w1:xb-hidden'];
    });
    assert.equal(hiddenStillLocked, true, 'the level that holds the sentence was opened directly');
    assert.equal(errors.length, 0, 'page errors: ' + errors.join('\n'));
  } finally {
    await browser.close();
    server.close();
  }
});
