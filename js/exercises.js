const Exercises = (() => {
  let vocabData = {};
  let dialogueData = {};
  let activeTimer = null;
  let activeBossState = null;
  let activeTimeouts = [];
  let activeDialog = null;

  function setData(vocab, dialogues) {
    vocabData = vocab;
    dialogueData = dialogues;
  }

  // Timeouts that advance exercise state must be cancellable, or an exercise
  // abandoned mid-run (exit button, street encounter aborted) fires its
  // completion callback later against live game state.
  function schedule(fn, ms) {
    const id = setTimeout(() => {
      activeTimeouts = activeTimeouts.filter((t) => t !== id);
      fn();
    }, ms);
    activeTimeouts.push(id);
    return id;
  }

  function cancelActive() {
    if (activeTimer !== null) {
      clearInterval(activeTimer);
      activeTimer = null;
    }
    activeTimeouts.forEach((id) => clearTimeout(id));
    activeTimeouts = [];
    if (activeDialog) {
      activeDialog.cancelled = true;
      activeDialog = null;
    }
    if (activeBossState) {
      activeBossState.cancelled = true;
      activeBossState = null;
    }
    if (typeof Voice !== 'undefined') {
      Voice.stop();
    }
  }

  function hasTTS() {
    return typeof Voice !== 'undefined' && Voice.support().tts;
  }

  function hasSTT() {
    return typeof Voice !== 'undefined' && Voice.support().stt;
  }

  function speechText(text) {
    return String(text).replace(/_/g, ' ');
  }

  function createVoiceButtons(text) {
    const row = UI.create('span', 'voice-btn-row');
    const play = UI.create('button', 'icon-btn small voice-btn', '🔊');
    play.addEventListener('click', (e) => {
      e.stopPropagation();
      Voice.speak(speechText(text)).catch(() => {});
    });
    const slow = UI.create('button', 'icon-btn small voice-btn', '🐢');
    slow.addEventListener('click', (e) => {
      e.stopPropagation();
      Voice.speakSlow(speechText(text));
    });
    row.appendChild(play);
    row.appendChild(slow);
    return row;
  }

  // Deterministic pixel portrait per NPC name (Kenney RPG Urban Pack).
  // Falls back to the CSS face if the image fails to load.
  const PORTRAIT_IDS = [0, 3, 4, 6, 9, 12, 14, 15, 17, 7, 10, 16];

  function npcPortrait(name) {
    const wrap = UI.create('div', 'dialogue-npc-portrait');
    const s = String(name || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    const idx = PORTRAIT_IDS[h % PORTRAIT_IDS.length];
    const img = document.createElement('img');
    img.className = 'npc-portrait-img';
    img.alt = '';
    img.src = 'assets/sprites/npcs/npc' + String(idx).padStart(2, '0') + '.png';
    img.addEventListener('error', () => img.remove());
    wrap.appendChild(img);
    return wrap;
  }

  function voicePrefs() {
    return {
      autoplay: Storage.get('voice_autoplay', true),
      autolisten: Storage.get('voice_autolisten', false)
    };
  }

  function vibrate(pattern) {
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch { /* unsupported */ }
    }
  }

  // Conversation mic: the player can say ANY of the options. Speech is
  // scored against every option and the best match is selected — saying
  // the wrong thing gets its feedback, like a real conversation.
  function appendMicRow(container, options, isAnswered, selectByOption) {
    const micRow = UI.create('div', 'voice-mic-row');
    const micBtn = UI.create('button', 'retro-btn voice-btn voice-mic-btn', '🎤 SAY IT');
    const micStatus = UI.create('div', 'voice-status');
    let attempts = 0;
    let listening = false;

    function startListening() {
      if (isAnswered() || listening) return;
      listening = true;
      micBtn.classList.add('listening');
      micBtn.textContent = '🎤 ...';
      micStatus.textContent = 'Listening...';
      Voice.listen({
        timeout: 8000,
        onInterim: (text) => {
          micStatus.textContent = text;
        }
      }).then((res) => {
        stopUI();
        if (isAnswered()) return;
        let best = null;
        let bestScore = 0;
        options.forEach((opt) => {
          const score = Voice.scoreBest(speechText(opt.text), res.alternatives);
          if (score > bestScore) { bestScore = score; best = opt; }
        });
        if (best && bestScore >= Voice.THRESHOLDS.partial) {
          const perfect = best.correct && bestScore >= Voice.THRESHOLDS.perfect;
          micStatus.textContent = perfect ? '¡Perfecto!' : '';
          selectByOption(best, perfect);
        } else {
          attempts++;
          micStatus.textContent = 'Heard: "' + (res.transcript || '?') + '"' +
            (attempts >= 2 ? ' — or tap your answer' : ' — try again');
        }
      }).catch((err) => {
        stopUI();
        if (isAnswered()) return;
        attempts++;
        let msg = (err && err.error === 'no-speech')
          ? 'Didn\'t hear you — try again'
          : 'Mic error — try again';
        if (attempts >= 2) msg += ' (or tap your answer)';
        micStatus.textContent = msg;
      });
    }

    function stopUI() {
      listening = false;
      micBtn.classList.remove('listening');
      micBtn.textContent = '🎤 SAY IT';
    }

    micBtn.addEventListener('click', () => {
      Audio8Bit.select();
      startListening();
    });

    micRow.appendChild(micBtn);
    micRow.appendChild(micStatus);
    container.appendChild(micRow);
    return startListening;
  }

  function renderFlashcard(container, words, onComplete) {
    let idx = 0;
    let results = { correct: 0, total: words.length };

    function showCard() {
      UI.clear(container);
      if (idx >= words.length) { onComplete(results); return; }

      const wordKey = words[idx];
      const data = vocabData[wordKey];
      if (!data) { idx++; showCard(); return; }

      const card = UI.create('div', 'exercise-card');

      const prompt = UI.create('div', 'exercise-prompt', 'What does this word mean?');
      card.appendChild(prompt);

      const flashcard = UI.create('div', 'flashcard');

      const front = UI.create('div', 'card-front');
      front.appendChild(UI.create('div', 'exercise-word', wordKey));
      if (data.phonetic) front.appendChild(UI.create('div', 'exercise-phonetic', data.phonetic));
      if (hasTTS()) front.appendChild(createVoiceButtons(wordKey));
      front.appendChild(UI.create('div', 'flashcard-tap-hint', 'TAP TO REVEAL'));

      const back = UI.create('div', 'card-back');
      back.appendChild(UI.create('div', 'exercise-word', wordKey));
      if (hasTTS()) back.appendChild(createVoiceButtons(wordKey));
      back.appendChild(UI.create('div', 'exercise-translation', data.en));
      if (data.example_es) {
        const ex = UI.create('div', 'exercise-phonetic');
        ex.textContent = '"' + data.example_es + '"';
        back.appendChild(ex);
      }

      flashcard.appendChild(front);
      flashcard.appendChild(back);

      flashcard.addEventListener('click', () => {
        if (!flashcard.classList.contains('flipped')) {
          flashcard.classList.add('flipped');
          Audio8Bit.select();
          showSRSButtons(card, wordKey);
        }
      });

      card.appendChild(flashcard);
      container.appendChild(card);
    }

    function showSRSButtons(card, wordKey) {
      const btns = UI.create('div', 'srs-buttons');
      ['again', 'hard', 'good', 'easy'].forEach((label) => {
        const btn = UI.create('button', 'srs-btn ' + label, label.toUpperCase());
        btn.addEventListener('click', () => {
          const quality = SRS.qualityFromButton(label);
          const srsData = Storage.getSRS();
          SRS.initWord(srsData, wordKey);
          srsData[wordKey] = SRS.review(srsData[wordKey], quality);
          Storage.saveSRS(srsData);

          if (quality >= 3) {
            results.correct++;
            Audio8Bit.correct();
          } else {
            Audio8Bit.wrong();
          }
          idx++;
          showCard();
        });
        btns.appendChild(btn);
      });
      card.appendChild(btns);
    }

    showCard();
  }

  function renderMatch(container, words, onComplete) {
    UI.clear(container);
    const results = { correct: 0, total: words.length };

    const pairs = words.slice(0, Math.min(words.length, 6)).map((w) => ({
      word: w,
      en: vocabData[w] ? vocabData[w].en : w
    }));
    results.total = pairs.length;

    const card = UI.create('div', 'exercise-card');
    card.appendChild(UI.create('div', 'exercise-prompt', 'Match the pairs'));

    const grid = UI.create('div', 'match-grid');
    const leftItems = shuffle(pairs.map((p) => ({ text: p.word, id: p.word, side: 'es' })));
    const rightItems = shuffle(pairs.map((p) => ({ text: p.en, id: p.word, side: 'en' })));
    const allItems = interleave(leftItems, rightItems);

    let selected = null;
    let matchedCount = 0;

    allItems.forEach((item) => {
      const tile = UI.create('div', 'match-tile', item.text);
      tile.dataset.id = item.id;
      tile.dataset.side = item.side;

      tile.addEventListener('click', () => {
        if (tile.classList.contains('matched')) return;

        if (!selected) {
          selected = tile;
          tile.classList.add('selected');
          Audio8Bit.select();
        } else if (selected === tile) {
          selected.classList.remove('selected');
          selected = null;
        } else if (selected.dataset.side === tile.dataset.side) {
          selected.classList.remove('selected');
          selected = tile;
          tile.classList.add('selected');
          Audio8Bit.select();
        } else {
          if (selected.dataset.id === tile.dataset.id) {
            selected.classList.remove('selected');
            selected.classList.add('matched');
            tile.classList.add('matched');
            matchedCount++;
            results.correct++;
            Audio8Bit.correct();
            selected = null;
            if (matchedCount === pairs.length) {
              schedule(() => onComplete(results), 500);
            }
          } else {
            tile.classList.add('wrong');
            selected.classList.add('wrong');
            Audio8Bit.wrong();
            const s = selected;
            setTimeout(() => {
              s.classList.remove('selected', 'wrong');
              tile.classList.remove('wrong');
            }, 500);
            selected = null;
          }
        }
      });

      grid.appendChild(tile);
    });

    card.appendChild(grid);
    container.appendChild(card);
  }

  function renderFillBlank(container, exerciseData, levelVocab, onComplete) {
    let idx = 0;
    const sentences = exerciseData.sentences || [];
    const results = { correct: 0, total: sentences.length };

    function showSentence() {
      UI.clear(container);
      if (idx >= sentences.length) { onComplete(results); return; }

      const item = sentences[idx];
      const card = UI.create('div', 'exercise-card');
      card.appendChild(UI.create('div', 'exercise-prompt', 'Fill in the blank'));

      const sentenceEl = UI.create('div', 'exercise-sentence');
      sentenceEl.innerHTML = item.sentence.replace('___', '<span class="blank">?</span>');
      card.appendChild(sentenceEl);

      if (item.hint) {
        card.appendChild(UI.create('div', 'exercise-phonetic', item.hint));
      }

      const options = UI.create('div', 'fill-options');
      const allOptions = shuffle([item.answer, ...item.distractors]);

      let answered = false;
      allOptions.forEach((opt) => {
        const btn = UI.create('div', 'fill-option', opt);
        btn.addEventListener('click', () => {
          if (answered) return;
          answered = true;

          if (opt === item.answer) {
            btn.classList.add('correct');
            results.correct++;
            Audio8Bit.correct();
            sentenceEl.querySelector('.blank').textContent = item.answer;
            UI.showFeedback(card, true);
          } else {
            btn.classList.add('wrong');
            Audio8Bit.wrong();
            options.querySelectorAll('.fill-option').forEach((o) => {
              if (o.textContent === item.answer) o.classList.add('correct');
            });
            sentenceEl.querySelector('.blank').textContent = item.answer;
            UI.showFeedback(card, false, item.feedback || ('The answer is "' + item.answer + '"'));
          }

          UI.addNextButton(card, () => { idx++; showSentence(); });
        });
        options.appendChild(btn);
      });

      card.appendChild(options);
      container.appendChild(card);
    }

    showSentence();
  }

  function renderDialogue(container, sceneId, onComplete) {
    UI.clear(container);
    const scene = dialogueData[sceneId];
    if (!scene) { onComplete({ correct: 0, total: 0 }); return; }

    let lineIdx = 0;
    let results = { correct: 0, total: 0 };
    const dialogState = { cancelled: false };
    activeDialog = dialogState;
    const dialogueContainer = UI.create('div', 'dialogue-container');
    container.appendChild(dialogueContainer);

    function scrollToEnd() {
      const scroller = container.closest('.exercise-area, .street-encounter-content') || container;
      scroller.scrollTop = scroller.scrollHeight;
    }

    function showLine() {
      if (dialogState.cancelled) return;
      if (lineIdx >= scene.lines.length) { onComplete(results); return; }

      const line = scene.lines[lineIdx];

      if (line.speaker === 'npc') {
        const box = UI.create('div', 'dialogue-box anim-fade-in');
        box.appendChild(npcPortrait(scene.npc));
        box.appendChild(UI.create('div', 'dialogue-speaker', scene.npc));
        box.appendChild(UI.create('div', 'dialogue-text', line.text));
        if (hasTTS()) box.appendChild(createVoiceButtons(line.text));
        if (line.translation) {
          box.appendChild(UI.create('div', 'dialogue-translation-hint', line.translation));
        }
        dialogueContainer.appendChild(box);
        scrollToEnd();
        lineIdx++;
        if (hasTTS() && voicePrefs().autoplay) {
          // Speak the line, then advance — the NPC talks to you.
          Voice.speak(line.text).catch(() => {}).then(() => {
            if (!dialogState.cancelled) schedule(showLine, 250);
          });
        } else {
          schedule(showLine, 300);
        }
      } else if (line.speaker === 'player') {
        results.total++;
        const optionsDiv = UI.create('div', 'dialogue-options anim-fade-in');
        let answered = false;
        let correctBtn = null;

        function selectOption(opt, btn) {
          if (answered) return;
          answered = true;

          if (opt.correct) {
            btn.classList.add('correct');
            results.correct++;
            Audio8Bit.correct();
            vibrate(20);
          } else {
            btn.classList.add('wrong');
            Audio8Bit.wrong();
            vibrate([40, 40, 40]);
            optionsDiv.querySelectorAll('.dialogue-option').forEach((o) => {
              const matchingOpt = line.options.find((lo) => lo.text === o.textContent);
              if (matchingOpt && matchingOpt.correct) o.classList.add('correct');
            });
          }

          if (opt.feedback) {
            const fb = UI.create('div', 'exercise-feedback ' + (opt.correct ? 'correct' : 'wrong'));
            fb.textContent = opt.correct ? '✓ ' + (opt.feedback || 'Correct!') : opt.feedback;
            dialogueContainer.appendChild(fb);
          }

          const playerBox = UI.create('div', 'dialogue-box anim-fade-in');
          playerBox.appendChild(UI.create('div', 'dialogue-speaker', 'You'));
          playerBox.appendChild(UI.create('div', 'dialogue-text', opt.text));
          dialogueContainer.appendChild(playerBox);

          lineIdx++;
          schedule(() => {
            optionsDiv.remove();
            showLine();
          }, 800);
        }

        const optionButtons = new Map();
        line.options.forEach((opt) => {
          const btn = UI.create('div', 'dialogue-option', opt.text);
          if (opt.correct) correctBtn = btn;
          optionButtons.set(opt, btn);
          btn.addEventListener('click', () => {
            selectOption(opt, btn);
          });
          optionsDiv.appendChild(btn);
        });

        if (hasSTT()) {
          const startListening = appendMicRow(optionsDiv, line.options, () => answered, (opt, perfect) => {
            selectOption(opt, optionButtons.get(opt) || correctBtn);
            if (perfect) {
              const fb = UI.create('div', 'exercise-feedback correct anim-pop-in', '¡Perfecto! 🌟');
              dialogueContainer.appendChild(fb);
            }
          });
          // Hands-free mode: start listening as soon as it's your turn.
          if (voicePrefs().autolisten) {
            schedule(() => { if (!dialogState.cancelled && !answered) startListening(); }, 500);
          }
        }

        dialogueContainer.appendChild(optionsDiv);
        scrollToEnd();
      }
    }

    const settingBox = UI.create('div', 'dialogue-box');
    settingBox.appendChild(UI.create('div', 'exercise-prompt', scene.setting));
    if (hasTTS()) settingBox.appendChild(buildVoiceToggles());
    dialogueContainer.appendChild(settingBox);
    showLine();
  }

  // Toggle row: auto-voice (NPC lines spoken aloud) and hands-free
  // (mic starts automatically on your turn). Persisted across sessions.
  function buildVoiceToggles() {
    const row = UI.create('div', 'voice-toggle-row');

    function makeToggle(key, label, fallback) {
      const btn = UI.create('button', 'voice-toggle' + (Storage.get(key, fallback) ? ' on' : ''), label);
      btn.addEventListener('click', () => {
        const next = !Storage.get(key, fallback);
        Storage.set(key, next);
        btn.classList.toggle('on', next);
        Audio8Bit.select();
      });
      return btn;
    }

    row.appendChild(makeToggle('voice_autoplay', '🔊 AUTO-VOICE', true));
    if (hasSTT()) row.appendChild(makeToggle('voice_autolisten', '🎤 HANDS-FREE', false));
    return row;
  }

  function renderTranslate(container, exerciseData, onComplete) {
    let idx = 0;
    const items = exerciseData.items || [];
    const results = { correct: 0, total: items.length };

    function showItem() {
      UI.clear(container);
      if (idx >= items.length) { onComplete(results); return; }

      const item = items[idx];
      const card = UI.create('div', 'exercise-card');

      const dir = item.direction === 'en-es' ? 'English → Spanish' : 'Spanish → English';
      card.appendChild(UI.create('div', 'translate-direction', dir));
      card.appendChild(UI.create('div', 'translate-source', item.source));

      const answerArea = UI.create('div', 'translate-answer-area');
      const placeholder = UI.create('span', 'translate-answer-placeholder', 'Tap words to build your answer...');
      answerArea.appendChild(placeholder);

      const bank = UI.create('div', 'word-bank');
      const bankWords = shuffle([...item.words]);
      const selectedWords = [];

      bankWords.forEach((w) => {
        const word = UI.create('div', 'word-bank-word', w);
        word.addEventListener('click', () => {
          if (word.classList.contains('used')) return;
          Audio8Bit.select();
          word.classList.add('used');
          selectedWords.push(w);
          updateAnswer();
        });
        bank.appendChild(word);
      });

      answerArea.addEventListener('click', (e) => {
        if (e.target.classList.contains('word-bank-word')) {
          const w = e.target.textContent;
          e.target.remove();
          selectedWords.splice(selectedWords.indexOf(w), 1);
          bank.querySelectorAll('.word-bank-word').forEach((bw) => {
            if (bw.textContent === w && bw.classList.contains('used')) {
              bw.classList.remove('used');
            }
          });
          updateAnswer();
        }
      });

      function updateAnswer() {
        answerArea.innerHTML = '';
        if (selectedWords.length === 0) {
          answerArea.appendChild(UI.create('span', 'translate-answer-placeholder', 'Tap words to build your answer...'));
        } else {
          selectedWords.forEach((w) => {
            answerArea.appendChild(UI.create('div', 'word-bank-word', w));
          });
        }
      }

      const checkBtn = UI.create('button', 'retro-btn primary translate-check-btn', 'CHECK');
      let answered = false;
      checkBtn.addEventListener('click', () => {
        if (answered || selectedWords.length === 0) return;
        answered = true;

        const answer = selectedWords.join(' ').toLowerCase().trim();
        const correct = item.answer.toLowerCase().trim();

        if (answer === correct) {
          results.correct++;
          Audio8Bit.correct();
          UI.showFeedback(card, true);
        } else {
          Audio8Bit.wrong();
          UI.showFeedback(card, false, 'Correct answer: "' + item.answer + '"');
        }

        UI.addNextButton(card, () => { idx++; showItem(); });
      });

      card.appendChild(answerArea);
      card.appendChild(bank);
      card.appendChild(checkBtn);
      container.appendChild(card);
    }

    showItem();
  }

  function renderBoss(container, words, dialogues, fillData, translateData, timeLimit, onComplete) {
    UI.clear(container);
    const results = { correct: 0, total: 0 };
    let timeLeft = timeLimit;

    const card = UI.create('div', 'exercise-card');
    card.appendChild(UI.create('div', 'boss-name-display', '⚔ BOSS BATTLE ⚔'));

    const timer = UI.create('div', 'boss-timer', timeLeft + 's');
    card.appendChild(timer);

    const healthBar = UI.create('div', 'boss-health-bar');
    const healthFill = UI.create('div', 'boss-health-fill');
    healthFill.style.width = '100%';
    healthBar.appendChild(healthFill);
    card.appendChild(healthBar);

    container.appendChild(card);

    const exerciseArea = UI.create('div', 'exercise-area');
    container.appendChild(exerciseArea);

    const bossState = { cancelled: false, finished: false };
    activeBossState = bossState;

    function finishBoss() {
      if (bossState.cancelled || bossState.finished) return;
      bossState.finished = true;
      if (activeTimer !== null) {
        clearInterval(activeTimer);
        activeTimer = null;
      }
      activeBossState = null;
      onComplete(results);
    }

    activeTimer = setInterval(() => {
      timeLeft--;
      timer.textContent = timeLeft + 's';
      if (timeLeft <= 10) timer.classList.add('warning');
      if (timeLeft <= 0) finishBoss();
    }, 1000);

    const exercises = [];
    if (words.length > 0) {
      exercises.push({ type: 'match', words: words.slice(0, 6) });
    }
    if (fillData && fillData.sentences) {
      fillData.sentences.forEach((s) => exercises.push({ type: 'fill', sentence: s }));
    }
    if (translateData && translateData.items) {
      translateData.items.forEach((t) => exercises.push({ type: 'translate', item: t }));
    }

    let exIdx = 0;
    const totalExercises = exercises.length || 1;

    function nextExercise() {
      if (bossState.cancelled) return;
      if (exIdx >= exercises.length || timeLeft <= 0) {
        finishBoss();
        return;
      }

      const ex = exercises[exIdx];
      exIdx++;
      healthFill.style.width = Math.max(0, (1 - results.correct / totalExercises) * 100) + '%';

      if (ex.type === 'match') {
        renderMatch(exerciseArea, ex.words, (r) => {
          results.correct += r.correct;
          results.total += r.total;
          nextExercise();
        });
      } else if (ex.type === 'fill') {
        renderFillBlank(exerciseArea, { sentences: [ex.sentence] }, [], (r) => {
          results.correct += r.correct;
          results.total += r.total;
          nextExercise();
        });
      } else if (ex.type === 'translate') {
        renderTranslate(exerciseArea, { items: [ex.item] }, (r) => {
          results.correct += r.correct;
          results.total += r.total;
          nextExercise();
        });
      }
    }

    Audio8Bit.bossIntro();
    setTimeout(nextExercise, 1500);
  }

  // Helpers
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function interleave(a, b) {
    const result = [];
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      if (i < a.length) result.push(a[i]);
      if (i < b.length) result.push(b[i]);
    }
    return result;
  }

  return { setData, cancelActive, npcPortrait, renderFlashcard, renderMatch, renderFillBlank, renderDialogue, renderTranslate, renderBoss };
})();
