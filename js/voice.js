const Voice = (() => {
  const THRESHOLDS = { perfect: 0.85, good: 0.65, partial: 0.4 };

  let sttLocale = 'es-ES';
  let ttsLocale = 'es-ES';
  let primed = false;
  let cachedVoice = null;
  let voicesLoaded = false;
  let listening = false;
  let currentRecognition = null;
  let speakId = 0;

  function getRecognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition;
  }

  function support() {
    return {
      tts: !!(window.speechSynthesis && window.SpeechSynthesisUtterance),
      stt: !!(getRecognitionCtor() && window.isSecureContext)
    };
  }

  function setLocales(stt, tts) {
    if (stt) sttLocale = stt;
    if (tts) ttsLocale = tts;
    cachedVoice = null;
  }

  function loadVoices() {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      if (!synth) {
        resolve([]);
        return;
      }
      const now = synth.getVoices();
      if (now && now.length > 0) {
        voicesLoaded = true;
        resolve(now);
        return;
      }
      let done = false;
      function finish() {
        if (done) return;
        done = true;
        synth.removeEventListener('voiceschanged', finish);
        voicesLoaded = true;
        resolve(synth.getVoices() || []);
      }
      synth.addEventListener('voiceschanged', finish);
      setTimeout(finish, 1500);
    });
  }

  function prime() {
    if (primed) return;
    primed = true;
    if (!support().tts) return;
    const synth = window.speechSynthesis;
    synth.addEventListener('voiceschanged', () => {
      cachedVoice = null;
    });
    loadVoices().then(() => {
      cachedVoice = pickVoice();
    });
    try {
      const unlock = new SpeechSynthesisUtterance('');
      unlock.volume = 0;
      synth.speak(unlock);
    } catch (e) {
      // ignore: priming is best-effort
    }
  }

  const PREFERRED_NAMES = [
    'mónica', 'monica', 'paulina', 'google español', 'google espanol',
    'online (natural)'
  ];

  function isChrome() {
    return /chrome/i.test(navigator.userAgent) && !/edg/i.test(navigator.userAgent);
  }

  function voiceRank(voice) {
    const lang = String(voice.lang || '').toLowerCase().replace('_', '-');
    const wanted = ttsLocale.toLowerCase();
    const langCode = wanted.split('-')[0];
    if (lang.indexOf(langCode) !== 0) return -1;
    let score = 1;
    if (lang === wanted) score += 8;
    if (isChrome() && voice.localService) score += 2;
    const name = String(voice.name || '').toLowerCase();
    for (let i = 0; i < PREFERRED_NAMES.length; i++) {
      if (name.indexOf(PREFERRED_NAMES[i]) !== -1) {
        score += 4;
        break;
      }
    }
    return score;
  }

  function pickVoice() {
    const synth = window.speechSynthesis;
    if (!synth) return null;
    const voices = synth.getVoices() || [];
    let best = null;
    let bestScore = 0;
    for (let i = 0; i < voices.length; i++) {
      const score = voiceRank(voices[i]);
      if (score > bestScore) {
        best = voices[i];
        bestScore = score;
      }
    }
    return best;
  }

  function getVoice() {
    if (!cachedVoice) cachedVoice = pickVoice();
    return cachedVoice;
  }

  function chunkText(text) {
    const MAX = 180;
    const chunks = [];
    const raw = String(text).split(/([.!?;:,…]+\s+)/);
    const parts = [];
    for (let i = 0; i < raw.length; i += 2) {
      const piece = (raw[i] || '') + (raw[i + 1] || '');
      const trimmed = piece.trim();
      if (trimmed) parts.push(trimmed);
    }
    let current = '';
    for (let i = 0; i < parts.length; i++) {
      let part = parts[i];
      while (part.length > MAX) {
        const cut = part.lastIndexOf(' ', MAX);
        const at = cut > 0 ? cut : MAX;
        if (current) {
          chunks.push(current);
          current = '';
        }
        chunks.push(part.slice(0, at).trim());
        part = part.slice(at).trim();
      }
      if (!part) continue;
      if (current && current.length + part.length + 1 > MAX) {
        chunks.push(current);
        current = part;
      } else {
        current = current ? current + ' ' + part : part;
      }
    }
    if (current) chunks.push(current);
    return chunks.filter((c) => c.length > 0);
  }

  function speakChunk(chunk, rate) {
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.lang = ttsLocale;
      u.rate = rate;
      const voice = getVoice();
      if (voice) u.voice = voice;
      let done = false;
      let started = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(startWatch);
        clearTimeout(watchdog);
        resolve();
      };
      u.onstart = () => { started = true; };
      u.onend = finish;
      u.onerror = finish;
      // Watchdogs: some engines silently drop utterances (no events at all).
      // Never let a hung TTS engine freeze a conversation — bail fast if
      // speech never starts, and cap total duration if it never ends.
      const startWatch = setTimeout(() => { if (!started) finish(); }, 1500);
      const watchdog = setTimeout(finish, Math.max(5000, chunk.length * 250 / rate));
      window.speechSynthesis.speak(u);
    });
  }

  function speak(text, opts) {
    opts = opts || {};
    if (!support().tts || !text) return Promise.resolve();
    const rate = Math.max(0.5, Math.min(2, opts.rate || 1));
    const id = ++speakId;
    window.speechSynthesis.cancel();
    const chunks = chunkText(text);
    let chain = Promise.resolve();
    chunks.forEach((chunk) => {
      chain = chain.then(() => {
        if (id !== speakId) return Promise.resolve();
        return speakChunk(chunk, rate);
      });
    });
    return chain;
  }

  function speakSlow(text) {
    return speak(text, { rate: 0.7 });
  }

  const ERROR_MESSAGES = {
    'no-speech': 'No te escuché. ¡Inténtalo otra vez!',
    'not-allowed': 'Micrófono bloqueado. Permite el acceso al micrófono.',
    'audio-capture': 'No se encontró micrófono.',
    'network': 'Error de red. El reconocimiento necesita conexión.',
    'aborted': 'Escucha cancelada.'
  };

  function listen(opts) {
    opts = opts || {};
    return new Promise((resolve, reject) => {
      if (!support().stt) {
        reject({ error: 'not-allowed', message: ERROR_MESSAGES['not-allowed'] });
        return;
      }
      if (listening) {
        reject({ error: 'aborted', message: ERROR_MESSAGES['aborted'] });
        return;
      }
      const Ctor = getRecognitionCtor();
      const rec = new Ctor();
      rec.lang = sttLocale;
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 5;

      let settledResult = null;
      let errorCode = null;
      const timeoutMs = opts.timeout || 8000;
      const timer = setTimeout(() => {
        try {
          rec.stop();
        } catch (e) {
          // already stopped
        }
      }, timeoutMs);

      rec.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            const alternatives = [];
            for (let j = 0; j < result.length; j++) {
              if (result[j].transcript) alternatives.push(result[j].transcript.trim());
            }
            settledResult = {
              transcript: alternatives[0] || '',
              confidence: result[0] ? result[0].confidence : 0,
              alternatives: alternatives
            };
          } else {
            interim += result[0] ? result[0].transcript : '';
          }
        }
        if (interim && typeof opts.onInterim === 'function') {
          opts.onInterim(interim.trim());
        }
      };

      rec.onerror = (event) => {
        errorCode = event.error || 'aborted';
      };

      rec.onend = () => {
        clearTimeout(timer);
        listening = false;
        currentRecognition = null;
        if (settledResult) {
          resolve(settledResult);
        } else {
          const code = errorCode || 'no-speech';
          reject({ error: code, message: ERROR_MESSAGES[code] || ERROR_MESSAGES['no-speech'] });
        }
      };

      try {
        listening = true;
        currentRecognition = rec;
        rec.start();
      } catch (e) {
        clearTimeout(timer);
        listening = false;
        currentRecognition = null;
        reject({ error: 'aborted', message: ERROR_MESSAGES['aborted'] });
      }
    });
  }

  const NUMBER_WORDS = [
    'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho',
    'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis',
    'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidos',
    'veintitres', 'veinticuatro', 'veinticinco', 'veintiseis', 'veintisiete',
    'veintiocho', 'veintinueve', 'treinta'
  ];

  const TENS_WORDS = {
    30: 'treinta', 40: 'cuarenta', 50: 'cincuenta', 60: 'sesenta',
    70: 'setenta', 80: 'ochenta', 90: 'noventa'
  };

  function numberToWords(n) {
    if (n <= 30) return NUMBER_WORDS[n];
    if (n === 100) return 'cien';
    if (n < 100) {
      const tens = Math.floor(n / 10) * 10;
      const unit = n % 10;
      if (unit === 0) return TENS_WORDS[tens];
      return TENS_WORDS[tens] + ' y ' + NUMBER_WORDS[unit];
    }
    return String(n);
  }

  function digitsToWords(text) {
    return text.replace(/\d+/g, (match) => {
      const n = parseInt(match, 10);
      if (isNaN(n) || n > 100) return match;
      return numberToWords(n);
    });
  }

  function normalize(text) {
    let s = String(text).normalize('NFC').toLowerCase();
    s = s.replace(/ñ/g, '');
    s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    s = s.replace(//g, 'ñ');
    s = s.replace(/[¡!¿?.,;:"'«»()\-–—…]/g, ' ');
    s = digitsToWords(s);
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  function phoneticFold(text) {
    let s = text;
    s = s.replace(/qu/g, 'k');
    s = s.replace(/ll/g, 'y');
    s = s.replace(/v/g, 'b');
    s = s.replace(/z/g, 's');
    s = s.replace(/ce/g, 'se');
    s = s.replace(/ci/g, 'si');
    s = s.replace(/h/g, '');
    return s;
  }

  function fold(text) {
    return phoneticFold(normalize(text));
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = [];
    let curr = [];
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      curr[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      const tmp = prev;
      prev = curr;
      curr = tmp;
    }
    return prev[b.length];
  }

  function similarity(a, b) {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - levenshtein(a, b) / maxLen;
  }

  function matchScore(expected, transcript) {
    const ne = fold(expected || '');
    const nt = fold(transcript || '');
    if (!ne && !nt) return 1;
    if (!ne || !nt) return 0;
    if (ne === nt) return 1;

    const charScore = similarity(ne, nt);

    const expTokens = ne.split(' ');
    const trTokens = nt.split(' ');
    let matched = 0;
    for (let i = 0; i < expTokens.length; i++) {
      for (let j = 0; j < trTokens.length; j++) {
        if (similarity(expTokens[i], trTokens[j]) >= 0.75) {
          matched++;
          break;
        }
      }
    }
    const tokenScore = matched / expTokens.length;

    const score = 0.6 * charScore + 0.4 * tokenScore;
    return Math.max(0, Math.min(1, score));
  }

  function scoreBest(expected, alternatives) {
    if (!alternatives || !alternatives.length) return 0;
    let best = 0;
    for (let i = 0; i < alternatives.length; i++) {
      const score = matchScore(expected, alternatives[i]);
      if (score > best) best = score;
    }
    return best;
  }

  function stop() {
    speakId++;
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // ignore
      }
    }
    if (currentRecognition) {
      try {
        currentRecognition.abort();
      } catch (e) {
        // ignore
      }
      currentRecognition = null;
      listening = false;
    }
  }

  return {
    support,
    setLocales,
    prime,
    speak,
    speakSlow,
    listen,
    matchScore,
    scoreBest,
    stop,
    THRESHOLDS
  };
})();
