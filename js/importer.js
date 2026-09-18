/*
 * Importer — dictionary importer front end.
 *
 * Turns a pasted or uploaded english -> target word list into a playable
 * language pack and hands it to LangPack.saveImportedPack (js/langpack.js).
 *
 *   Importer.render(container, { onDone(packId), onCancel })
 *   Importer.exportPack(id)   — download an imported pack as a JSON backup
 *
 * Accepted input: delimited text (tab / semicolon / comma, quoted fields OK,
 * optional header row) with columns english, target, [category], [phonetic],
 * [example] — or JSON (full pack {manifest, vocabulary}, a flat
 * { "targetWord": "english" } object, or an array of {en, target} objects).
 */
const Importer = (() => {
  const MAX_WORDS_WARN = 3000;
  const PREVIEW_ROWS = 10;

  const LANGS = [
    { code: 'fr', name: 'French', locale: 'fr-FR', flag: '🇫🇷' },
    { code: 'de', name: 'German', locale: 'de-DE', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', locale: 'it-IT', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', locale: 'pt-BR', flag: '🇧🇷' },
    { code: 'ja', name: 'Japanese', locale: 'ja-JP', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', locale: 'ko-KR', flag: '🇰🇷' },
    { code: 'zh', name: 'Chinese', locale: 'zh-CN', flag: '🇨🇳' },
    { code: 'ru', name: 'Russian', locale: 'ru-RU', flag: '🇷🇺' },
    { code: 'ar', name: 'Arabic', locale: 'ar-SA', flag: '🇸🇦' },
    { code: 'hi', name: 'Hindi', locale: 'hi-IN', flag: '🇮🇳' },
    { code: 'nl', name: 'Dutch', locale: 'nl-NL', flag: '🇳🇱' },
    { code: 'sv', name: 'Swedish', locale: 'sv-SE', flag: '🇸🇪' },
    { code: 'pl', name: 'Polish', locale: 'pl-PL', flag: '🇵🇱' },
    { code: 'tr', name: 'Turkish', locale: 'tr-TR', flag: '🇹🇷' },
    { code: 'en', name: 'English', locale: 'en-US', flag: '🇺🇸' }
  ];

  let state = null;      // last successful parse, awaiting import
  let inputs = null;     // form input elements
  let previewEl = null;  // preview container
  let importBtnEl = null;

  // ===== PARSER =====

  function parseInput(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return { rows: [], skipped: ['Nothing to import — paste a word list or load a file first.'], fullPack: null };
    }
    if (trimmed[0] === '{' || trimmed[0] === '[') {
      let data;
      try {
        data = JSON.parse(trimmed);
      } catch (e) {
        return { rows: [], skipped: ['Invalid JSON: ' + e.message], fullPack: null };
      }
      return parseJson(data);
    }
    return parseDelimited(trimmed);
  }

  function parseJson(data) {
    const rows = [];
    const skipped = [];

    // Full pack { manifest, vocabulary }: sanity check, then save as-is.
    if (data && !Array.isArray(data) && data.manifest && data.vocabulary) {
      const m = data.manifest;
      const vocabKeys = typeof data.vocabulary === 'object' && data.vocabulary !== null
        ? Object.keys(data.vocabulary) : [];
      if (typeof m !== 'object' || typeof m.id !== 'string' || !m.id || !vocabKeys.length) {
        return { rows: [], skipped: ['Pack JSON failed sanity check: needs a manifest with a string id and a non-empty vocabulary object.'], fullPack: null };
      }
      vocabKeys.forEach((key) => {
        const v = data.vocabulary[key] || {};
        rows.push({
          en: String(v.en || ''),
          target: key.replace(/_/g, ' '),
          category: String(v.category || ''),
          phonetic: String(v.phonetic || ''),
          example: String(v.example_es || '')
        });
      });
      return { rows, skipped, fullPack: data };
    }

    // Array of { en|english, target|es|word, ... } objects.
    if (Array.isArray(data)) {
      data.forEach((item, i) => {
        if (!item || typeof item !== 'object') {
          skipped.push('Item ' + (i + 1) + ': not an object');
          return;
        }
        const en = item.en || item.english || '';
        const target = item.target || item.es || item.word || '';
        if (!en || !target) {
          skipped.push('Item ' + (i + 1) + ': missing english or target word');
          return;
        }
        rows.push({
          en: String(en),
          target: String(target),
          category: String(item.category || ''),
          phonetic: String(item.phonetic || ''),
          example: String(item.example || '')
        });
      });
      return { rows, skipped, fullPack: null };
    }

    // Flat { "targetWord": "english" } object.
    if (data && typeof data === 'object') {
      Object.keys(data).forEach((target) => {
        if (target && typeof data[target] === 'string' && data[target]) {
          rows.push({ en: data[target], target: target, category: '', phonetic: '', example: '' });
        } else {
          skipped.push('"' + target + '": value is not a string');
        }
      });
      return { rows, skipped, fullPack: null };
    }

    return { rows: [], skipped: ['Unrecognized JSON shape.'], fullPack: null };
  }

  function parseDelimited(text) {
    const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim() !== '');
    const delim = detectDelimiter(lines);
    const rows = [];
    const skipped = [];
    let start = 0;

    const first = splitLine(lines[0], delim);
    if (first.length >= 2 && first.some((c) => /english|target|word|translation|category/i.test(c.trim()))) {
      start = 1; // header row
    }
    for (let i = start; i < lines.length; i++) {
      const cells = splitLine(lines[i], delim).map((c) => c.trim());
      if (cells.length < 2 || !cells[0] || !cells[1]) {
        skipped.push('Line ' + (i + 1) + ': needs at least english + target columns');
        continue;
      }
      rows.push({
        en: cells[0],
        target: cells[1],
        category: cells[2] || '',
        phonetic: cells[3] || '',
        example: cells[4] || ''
      });
    }
    return { rows, skipped, fullPack: null };
  }

  // Pick the delimiter that splits the most sampled lines into >= 2 columns,
  // preferring the one with the most consistent column count.
  function detectDelimiter(lines) {
    const sample = lines.slice(0, 50);
    let best = '\t';
    let bestScore = -1;
    ['\t', ';', ','].forEach((d) => {
      const counts = {};
      let multi = 0;
      sample.forEach((l) => {
        const n = splitLine(l, d).length;
        if (n >= 2) {
          multi++;
          counts[n] = (counts[n] || 0) + 1;
        }
      });
      let consistency = 0;
      Object.keys(counts).forEach((n) => {
        if (counts[n] > consistency) consistency = counts[n];
      });
      const score = multi * 10 + consistency;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    });
    return best;
  }

  // Split one line on delim, honoring "quoted fields" with "" escapes.
  function splitLine(line, delim) {
    const cells = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"' && cur === '') {
        inQuotes = true;
      } else if (ch === delim) {
        cells.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    return cells;
  }

  // ===== PACK BUILDING =====

  function buildPack(rows, manifest) {
    const vocabulary = {};
    const seen = {};
    const skipped = [];
    let rank = 0;
    rows.forEach((r) => {
      const target = String(r.target || '').trim();
      const en = String(r.en || '').trim();
      if (!target || !en) return;
      const dupe = target.toLowerCase() + '' + en.toLowerCase();
      if (seen[dupe]) {
        skipped.push('Duplicate skipped: ' + target);
        return;
      }
      seen[dupe] = true;
      const key = target.replace(/\s+/g, '_'); // es pack convention
      if (vocabulary[key]) {
        skipped.push('Key collision skipped: ' + target);
        return;
      }
      rank++;
      vocabulary[key] = {
        en: en,
        category: String(r.category || '').trim() || 'imported',
        phonetic: String(r.phonetic || '').trim(),
        example_es: String(r.example || '').trim(),
        example_en: '',
        rank: rank
      };
    });
    return { pack: { manifest: manifest, vocabulary: vocabulary }, skipped: skipped };
  }

  function readManifest() {
    const name = inputs.name.value.trim();
    const code = inputs.code.value.trim().toLowerCase();
    const locale = inputs.locale.value.trim();
    return {
      id: code,
      name: name,
      nativeName: inputs.native.value.trim() || name,
      flag: inputs.flag.value.trim() || '🌍',
      ttsLocale: locale || code,
      sttLocale: locale || code
    };
  }

  function validateManifest() {
    const errors = [];
    if (!inputs.name.value.trim()) errors.push('Language name is required.');
    const code = inputs.code.value.trim().toLowerCase();
    if (!code) {
      errors.push('Language code is required (e.g. fr).');
    } else if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(code)) {
      errors.push('Code should be a 2-letter or BCP-47 code (e.g. fr, pt-br).');
    }
    if (code === 'es') errors.push('Code "es" is reserved for the built-in Spanish pack — pick another.');
    return errors;
  }

  // ===== RENDER =====

  function render(container, opts) {
    opts = opts || {};
    state = null;
    inputs = {};
    UI.clear(container);

    const box = UI.create('div', 'importer');
    box.appendChild(UI.create('h2', 'importer-title', 'BUILD A LANGUAGE PACK'));
    box.appendChild(UI.create('p', 'importer-hint',
      'Columns: english, target, category?, phonetic?, example? — tab, semicolon or comma separated. JSON works too.'));

    box.appendChild(buildLangFields());
    box.appendChild(buildSourceInputs());

    const buttons = UI.create('div', 'importer-buttons');
    const previewBtn = UI.create('button', 'retro-btn', 'PREVIEW');
    importBtnEl = UI.create('button', 'retro-btn primary', 'IMPORT');
    importBtnEl.disabled = true;
    const cancelBtn = UI.create('button', 'retro-btn secondary', 'CANCEL');
    buttons.appendChild(previewBtn);
    buttons.appendChild(importBtnEl);
    buttons.appendChild(cancelBtn);
    box.appendChild(buttons);

    previewEl = UI.create('div', 'importer-preview');
    box.appendChild(previewEl);

    previewBtn.addEventListener('click', () => {
      Audio8Bit.select();
      runPreview();
    });
    importBtnEl.addEventListener('click', () => {
      Audio8Bit.select();
      doImport(opts);
    });
    cancelBtn.addEventListener('click', () => {
      Audio8Bit.select();
      if (opts.onCancel) opts.onCancel();
    });

    container.appendChild(box);
  }

  function buildLangFields() {
    const wrap = UI.create('div', 'importer-lang');

    const datalist = document.createElement('datalist');
    datalist.id = 'importer-lang-list';
    LANGS.forEach((l) => {
      const opt = document.createElement('option');
      opt.value = l.name;
      datalist.appendChild(opt);
    });
    wrap.appendChild(datalist);

    const grid = UI.create('div', 'importer-lang-grid');
    inputs.name = addField(grid, 'LANGUAGE', 'French');
    inputs.name.setAttribute('list', 'importer-lang-list');
    inputs.native = addField(grid, 'NATIVE NAME', 'Français');
    inputs.code = addField(grid, 'CODE', 'fr');
    inputs.code.maxLength = 12;
    inputs.locale = addField(grid, 'TTS/STT LOCALE', 'fr-FR');
    inputs.flag = addField(grid, 'FLAG', '🇫🇷');
    inputs.flag.maxLength = 8;
    wrap.appendChild(grid);

    // Picking a known language auto-fills code, locale and flag.
    // Any of them can still be edited by hand afterwards.
    inputs.name.addEventListener('input', () => {
      const typed = inputs.name.value.trim().toLowerCase();
      const match = LANGS.find((l) => l.name.toLowerCase() === typed);
      if (!match) return;
      inputs.code.value = match.code;
      inputs.locale.value = match.locale;
      inputs.flag.value = match.flag;
    });
    return wrap;
  }

  function addField(parent, labelText, placeholder) {
    const field = UI.create('div', 'importer-field');
    field.appendChild(UI.create('label', 'importer-label', labelText));
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'importer-input';
    input.placeholder = placeholder;
    input.autocomplete = 'off';
    field.appendChild(input);
    parent.appendChild(field);
    return input;
  }

  function buildSourceInputs() {
    const wrap = UI.create('div', 'importer-source');
    wrap.appendChild(UI.create('label', 'importer-label', 'PASTE YOUR WORD LIST'));

    const ta = document.createElement('textarea');
    ta.className = 'importer-textarea';
    ta.rows = 8;
    ta.spellcheck = false;
    ta.placeholder = 'hello, bonjour\ncat, chat, animals\nthank you, merci, phrases';
    wrap.appendChild(ta);
    inputs.text = ta;

    const fileRow = UI.create('div', 'importer-file-row');
    fileRow.appendChild(UI.create('label', 'importer-label', 'OR LOAD A FILE'));
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = '.csv,.tsv,.txt,.json';
    file.className = 'importer-file';
    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = function () {
        ta.value = String(reader.result || '');
        runPreview();
      };
      reader.onerror = function () {
        showError('Could not read that file — try pasting its contents instead.');
      };
      reader.readAsText(f);
    });
    fileRow.appendChild(file);
    wrap.appendChild(fileRow);
    return wrap;
  }

  // ===== PREVIEW + IMPORT =====

  function runPreview() {
    state = null;
    importBtnEl.disabled = true;
    UI.clear(previewEl);

    const parsed = parseInput(inputs.text.value);
    if (!parsed.rows.length) {
      renderWarnings(parsed.skipped.length ? parsed.skipped : ['No usable rows found.'], true);
      return;
    }
    state = parsed;

    previewEl.appendChild(UI.create('div', 'importer-summary',
      parsed.rows.length + ' WORDS READY' + (parsed.fullPack ? ' (FULL PACK JSON)' : '')));

    if (parsed.rows.length > MAX_WORDS_WARN) {
      previewEl.appendChild(UI.create('div', 'importer-warn',
        '! ' + parsed.rows.length + ' words is a lot — the game may load slowly. Importing anyway is fine.'));
    }
    renderWarnings(parsed.skipped, false);

    previewEl.appendChild(buildPreviewTable(parsed.rows.slice(0, PREVIEW_ROWS)));
    if (parsed.rows.length > PREVIEW_ROWS) {
      previewEl.appendChild(UI.create('div', 'importer-more',
        '… and ' + (parsed.rows.length - PREVIEW_ROWS) + ' more'));
    }
    importBtnEl.disabled = false;
  }

  function renderWarnings(msgs, isError) {
    if (!msgs.length) return;
    const box = UI.create('div', isError ? 'importer-error' : 'importer-warn');
    msgs.slice(0, 5).forEach((m) => box.appendChild(UI.create('div', 'importer-warn-line', m)));
    if (msgs.length > 5) {
      box.appendChild(UI.create('div', 'importer-warn-line', '… and ' + (msgs.length - 5) + ' more skipped'));
    }
    previewEl.appendChild(box);
  }

  function buildPreviewTable(rows) {
    const table = UI.create('table', 'importer-table');
    const thead = UI.create('thead');
    const hr = UI.create('tr');
    ['ENGLISH', 'TARGET', 'CATEGORY'].forEach((h) => hr.appendChild(UI.create('th', '', h)));
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = UI.create('tbody');
    rows.forEach((r) => {
      const tr = UI.create('tr');
      tr.appendChild(UI.create('td', '', r.en));
      tr.appendChild(UI.create('td', 'importer-td-target', r.target));
      tr.appendChild(UI.create('td', 'importer-td-dim', r.category || '—'));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return table;
  }

  function showError(msg) {
    const old = previewEl.querySelector('.importer-error');
    if (old) old.remove();
    const box = UI.create('div', 'importer-error');
    box.appendChild(UI.create('div', 'importer-warn-line', msg));
    previewEl.insertBefore(box, previewEl.firstChild);
  }

  function doImport(opts) {
    if (!state) return;

    let pack;
    if (state.fullPack) {
      pack = state.fullPack; // already sanity-checked in parseJson
      if (String(pack.manifest.id).trim().toLowerCase() === 'es') {
        showError('Code "es" is reserved for the built-in Spanish pack — change the "id" in the pack JSON and try again.');
        Audio8Bit.wrong();
        return;
      }
    } else {
      const errors = validateManifest();
      if (errors.length) {
        showError(errors.join(' '));
        Audio8Bit.wrong();
        return;
      }
      const built = buildPack(state.rows, readManifest());
      pack = built.pack;
      if (!Object.keys(pack.vocabulary).length) {
        showError('Nothing left to import after removing duplicates.');
        return;
      }
    }

    try {
      LangPack.saveImportedPack(pack);
      // Storage.set swallows quota errors, so verify the pack round-trips.
      const saved = Storage.get('pack_' + pack.manifest.id, null);
      if (!saved || !saved.vocabulary || !Object.keys(saved.vocabulary).length) {
        LangPack.removeImportedPack(pack.manifest.id);
        const quotaErr = new Error('QuotaExceededError');
        quotaErr.name = 'QuotaExceededError';
        throw quotaErr;
      }
      Audio8Bit.levelUp();
      if (opts.onDone) opts.onDone(pack.manifest.id);
    } catch (e) {
      const quota = e && (e.name === 'QuotaExceededError' || e.code === 22 || /quota/i.test(String(e.message)));
      showError(quota
        ? 'STORAGE FULL — this pack does not fit. Delete another imported pack from the language screen, or import a shorter list.'
        : 'Import failed: ' + (e && e.message ? e.message : 'unknown error'));
      Audio8Bit.wrong();
    }
  }

  // ===== EXPORT =====

  // Download an imported pack as JSON (roundtrip backup: the same file can
  // be pasted or loaded back into the importer later).
  function exportPack(id) {
    const pack = Storage.get('pack_' + id, null);
    if (!pack || !pack.manifest) return false;
    try {
      const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'quest-pack-' + id + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch {
      return false;
    }
  }

  return { render, exportPack };
})();
