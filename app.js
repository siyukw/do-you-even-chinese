/**
 * goodbyechinese — Main Reader Controller
 */
(function () {
  const { InkStorage, InkWeaver } = window;
  const NOVEL = (window.INKWEAVE_STARTER_NOVELS || [])[0];

  const state = {
    settings: InkStorage.getSettings(),
    currentChapter: InkStorage.getCurrentChapter(),
    masteredSet: InkStorage.getMasteredSet(),
    encounteredSet: InkStorage.getEncounteredSet(),
    currentView: 'library',
    activeWordId: null,
    vocabTab: 'list',
    flashcardIndex: 0,
    flashcardFlipped: false,
    newWordsOpen: true
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const els = {
    viewLibrary: $('#view-library'),
    viewReader: $('#view-reader'),
    bottomNav: $('#reader-bottom-nav'),
    headerSubtitle: $('#header-subtitle'),
    readProgressFill: $('#read-progress-fill'),
    toast: $('#toast'),
    backdrop: $('#sheet-backdrop'),

    // Home / TOC
    btnStartReading: $('#btn-start-reading'),
    btnViewVocabHome: $('#btn-view-vocab-home'),
    homeMasteredCount: $('#home-mastered-count'),
    paceSummaryLabel: $('#pace-summary-label'),
    ladderPreview: $('#ladder-preview'),
    tocNovelTitle: $('#toc-novel-title'),
    homeChapterList: $('#home-chapter-list'),

    // Reader
    chapterBadge: $('#reader-chapter-badge'),
    immersionBadge: $('#reader-immersion-badge'),
    btnCycleDisplay: $('#btn-cycle-display'),
    chapterTitle: $('#reader-chapter-title'),
    chapterZhTitle: $('#reader-chapter-zh-title'),
    newWordsBanner: $('#new-words-banner'),
    btnToggleNewWords: $('#btn-toggle-new-words'),
    newWordsSummary: $('#new-words-summary'),
    newWordsChevron: $('#new-words-chevron'),
    newWordsChips: $('#new-words-chips'),
    readerProse: $('#reader-prose'),
    recapStats: $('#recap-stats'),
    btnNextChapterCard: $('#btn-next-chapter-card'),
    btnPrevChapter: $('#btn-prev-chapter'),
    btnNextChapter: $('#btn-next-chapter'),
    navVocabCount: $('#nav-vocab-count'),

    // Word Sheet
    wordSheet: $('#word-sheet'),
    wsHanzi: $('#ws-hanzi'),
    wsPinyin: $('#ws-pinyin'),
    wsHsk: $('#ws-hsk'),
    wsTier: $('#ws-tier'),
    wsMeaning: $('#ws-meaning'),
    wsContext: $('#ws-context'),
    wsNote: $('#ws-note'),
    wsExample: $('#ws-example'),
    wsToggleMastered: $('#ws-toggle-mastered'),

    // Settings Sheet
    settingsSheet: $('#settings-sheet'),
    paceHint: $('#pace-hint'),
    displayHint: $('#display-hint'),
    toggleHighlightNew: $('#toggle-highlight-new'),
    toggleToneColors: $('#toggle-tone-colors'),
    rangeFontSize: $('#range-font-size'),
    fontSizeReadout: $('#font-size-readout'),

    // Chapters & Vocab Drawers
    chaptersSheet: $('#chapters-sheet'),
    chaptersSheetTitle: $('#chapters-sheet-title'),
    chaptersSheetList: $('#chapters-sheet-list'),
    vocabSheet: $('#vocab-sheet'),
    vocabSheetBody: $('#vocab-sheet-body')
  };

  let toastTimer = null;
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.add('hidden'), 2600);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function handleHashRoute() {
    const hash = window.location.hash;
    if (hash.startsWith('#ch/')) {
      const chNum = parseInt(hash.split('/')[1], 10) || 1;
      if (state.currentView !== 'reader' || state.currentChapter !== chNum) {
        openReader(chNum);
      }
    } else if (hash.startsWith('#read/')) {
      const chNum = parseInt(hash.split('/')[2], 10) || 1;
      if (state.currentView !== 'reader' || state.currentChapter !== chNum) {
        openReader(chNum);
      }
    } else if (!hash && state.currentView === 'reader') {
      renderLibraryView();
    }
  }

  function init() {
    applySettingsToDOM();
    bindEvents();
    renderLibraryView();
    window.addEventListener('hashchange', handleHashRoute);
    handleHashRoute();
  }

  // =========================================================================
  // Settings
  // =========================================================================
  function applySettingsToDOM() {
    const s = state.settings;
    if (!s.displayMode) s.displayMode = 'inline-pinyin';

    document.documentElement.setAttribute('data-theme', s.theme);
    const themeMetaColors = { paper: '#FAF6EE', sepia: '#F3EAD8', ink: '#141311' };
    const metaTheme = $('#meta-theme-color');
    if (metaTheme) metaTheme.setAttribute('content', themeMetaColors[s.theme] || '#FAF6EE');

    document.documentElement.style.setProperty('--reader-font-size', `${s.fontSize}px`);
    document.body.classList.toggle('display-ruby', s.displayMode === 'ruby');
    document.body.classList.toggle('tone-colors-on', !!s.toneColors);

    $$('#theme-selector .seg-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.themeChoice === s.theme)
    );
    $$('#pace-selector .seg-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.pace === s.pace)
    );
    $$('#display-mode-selector .seg-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.displayMode === s.displayMode)
    );
    els.toggleHighlightNew.checked = !!s.highlightNew;
    els.toggleToneColors.checked = !!s.toneColors;
    els.rangeFontSize.value = s.fontSize;
    els.fontSizeReadout.textContent = `${s.fontSize}px`;

    const paceHints = {
      gentle: 'Starts with just 2 words in Ch. 1 (Ch. 2: 5, Ch. 3: 9)—super relaxed reading.',
      standard: 'Starts with 3 words in Ch. 1 (Ch. 2: 7, Ch. 3: 13) and expands every chapter.',
      immersive: 'Starts with 4 words in Ch. 1 and ramps up faster (Ch. 2: 10, Ch. 3: 19).'
    };
    const paceLabels = { gentle: 'Gentle Pace', standard: 'Standard Pace', immersive: 'Intensive Pace' };
    els.paceHint.textContent = paceHints[s.pace] || paceHints.standard;
    els.paceSummaryLabel.textContent = paceLabels[s.pace] || 'Standard Pace';

    const displayHints = {
      'inline-pinyin': 'Shows Pinyin cleanly inline (e.g. shuǐ). Tap any word to see its character & audio.',
      'inline-both': 'Shows Pinyin with its character beside it inline: shuǐ(水).',
      ruby: 'Stacks Pinyin above each Chinese character using Ruby annotations.',
      hanzi: 'Shows Chinese characters only (水)—tap any character for Pinyin and meaning.'
    };
    const displayLabels = {
      'inline-pinyin': 'Style: Inline Pinyin ↻',
      'inline-both': 'Style: Pinyin + 字 ↻',
      ruby: 'Style: Ruby Above ↻',
      hanzi: 'Style: 汉字 Only ↻'
    };
    if (els.displayHint) els.displayHint.textContent = displayHints[s.displayMode];
    if (els.btnCycleDisplay) els.btnCycleDisplay.textContent = displayLabels[s.displayMode];
  }

  // =========================================================================
  // Home / Table of Contents
  // =========================================================================
  function renderLibraryView() {
    state.currentView = 'library';
    els.viewLibrary.classList.remove('hidden');
    els.viewReader.classList.add('hidden');
    els.bottomNav.classList.add('hidden');
    els.readProgressFill.style.width = '0%';
    els.headerSubtitle.textContent = `${NOVEL.title} · ${NOVEL.zhTitle}`;

    const chapters = NOVEL.chapters;
    const resumeCh = Math.min(state.currentChapter, chapters.length);
    els.btnStartReading.textContent =
      resumeCh > 1 ? `Continue Chapter ${resumeCh}` : `Start Reading Chapter 1`;

    els.homeMasteredCount.textContent = state.masteredSet.size;
    els.navVocabCount.textContent = state.encounteredSet.size;

    const previewChapters = chapters.slice(0, 4).map((c) => c.number);
    els.ladderPreview.innerHTML = previewChapters
      .map((ch) => {
        const { activeWords, newWords } = InkWeaver.getVocabularyForChapter(ch, state.settings.pace);
        const previewSample = (newWords.length ? newWords : activeWords)
          .slice(0, 4)
          .map((w) => w.pinyin)
          .join(' · ');
        return `
          <div class="ladder-step">
            <div class="ladder-step-top">
              <span class="ladder-ch">Chapter ${ch}</span>
              <span class="ladder-count">${activeWords.length} words</span>
            </div>
            <div class="ladder-words">${previewSample}…</div>
          </div>
        `;
      })
      .join('');

    els.tocNovelTitle.textContent = `${NOVEL.title} — ${chapters.length} Chapters`;
    els.homeChapterList.innerHTML = chapters
      .map((ch) => {
        const { activeWords } = InkWeaver.getVocabularyForChapter(ch.number, state.settings.pace);
        const isCurr = ch.number === resumeCh;
        return `
          <button type="button" class="chapter-card ${isCurr ? 'is-current' : ''}" data-open-chapter="${ch.number}">
            <div class="cc-left">
              <div class="cc-num">Chapter ${ch.number}${isCurr ? ' · Current' : ''}</div>
              <div class="cc-title">${escapeHtml(ch.title.replace(/^Chapter\s+\d+\s*:\s*/i, ''))}</div>
              ${ch.zhTitle ? `<div class="cc-zh">${escapeHtml(ch.zhTitle)}</div>` : ''}
            </div>
            <span class="cc-badge">${activeWords.length} 字</span>
          </button>
        `;
      })
      .join('');
  }

  // =========================================================================
  // Reader View
  // =========================================================================
  function openReader(chapterNumber) {
    const sortedChapters = [...NOVEL.chapters].sort((a, b) => a.number - b.number);
    const chapter = sortedChapters.find((c) => c.number === chapterNumber) || sortedChapters[0];
    if (!chapter) return;

    state.currentView = 'reader';
    state.currentChapter = chapter.number;
    InkStorage.saveCurrentChapter(chapter.number);
    window.location.hash = `#ch/${chapter.number}`;

    els.viewLibrary.classList.add('hidden');
    els.viewReader.classList.remove('hidden');
    els.bottomNav.classList.remove('hidden');
    els.headerSubtitle.textContent = `${NOVEL.title} · Ch. ${chapter.number}`;

    const woven = InkWeaver.weaveChapter(chapter.text, chapter.number, {
      pace: state.settings.pace,
      masteredSet: state.masteredSet,
      highlightNew: state.settings.highlightNew,
      displayMode: state.settings.displayMode || 'inline-pinyin'
    });

    state.encounteredSet = InkStorage.addEncountered(woven.encounteredIds);
    els.navVocabCount.textContent = state.encounteredSet.size;

    els.chapterBadge.textContent = `Chapter ${chapter.number} of ${sortedChapters.length}`;
    els.immersionBadge.textContent = `${woven.stats.activePoolSize} active words · ~${woven.stats.immersionPct}% Chinese`;
    els.chapterTitle.textContent = chapter.title;
    els.chapterZhTitle.textContent = chapter.zhTitle || '';
    els.chapterZhTitle.classList.toggle('hidden', !chapter.zhTitle);

    const chipsList = woven.newWordsUsed.length ? woven.newWordsUsed : woven.newWords;
    if (chipsList.length > 0) {
      els.newWordsBanner.classList.remove('hidden');
      els.newWordsSummary.textContent = `${chipsList.length} New Word${chipsList.length === 1 ? '' : 's'} Unlocked in Ch. ${chapter.number}`;
      els.newWordsChips.innerHTML = chipsList
        .map(
          (w) => `
          <button type="button" class="new-word-chip" data-vocab-id="${w.id}">
            <span class="chip-py">${w.pinyin}</span>
            <span class="chip-zh">${w.hanzi}</span>
            <span class="chip-en">${escapeHtml(w.meaning.split(';')[0])}</span>
          </button>
        `
        )
        .join('');
    } else {
      els.newWordsBanner.classList.add('hidden');
    }

    els.readerProse.innerHTML = woven.htmlParagraphs.map((p) => `<p>${p}</p>`).join('');

    const idx = sortedChapters.findIndex((c) => c.number === chapter.number);
    const prevChap = idx > 0 ? sortedChapters[idx - 1] : null;
    const nextChap = idx < sortedChapters.length - 1 ? sortedChapters[idx + 1] : null;

    els.btnPrevChapter.disabled = !prevChap;
    els.btnPrevChapter.dataset.targetCh = prevChap ? prevChap.number : '';
    els.btnNextChapter.disabled = !nextChap;
    els.btnNextChapter.dataset.targetCh = nextChap ? nextChap.number : '';

    if (nextChap) {
      const nextPool = InkWeaver.getVocabularyForChapter(nextChap.number, state.settings.pace);
      els.btnNextChapterCard.textContent = `Continue to Chapter ${nextChap.number} →`;
      els.btnNextChapterCard.dataset.targetCh = nextChap.number;
      els.recapStats.textContent = `You read ${woven.stats.totalReplacements} Chinese words in this chapter. Chapter ${nextChap.number} expands your vocabulary to ${nextPool.activeWords.length} words!`;
    } else {
      els.btnNextChapterCard.textContent = 'Back to Chapters';
      els.btnNextChapterCard.dataset.targetCh = 'HOME';
      els.recapStats.textContent = `You've caught up with all ${sortedChapters.length} translated chapters (${woven.stats.activePoolSize} words unlocked). Check back when the next chapter link is shared!`;
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
    updateScrollProgress();
  }

  function updateScrollProgress() {
    if (state.currentView !== 'reader') return;
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    const pct = scrollHeight > 0 ? Math.min(100, Math.round((scrollTop / scrollHeight) * 100)) : 0;
    els.readProgressFill.style.width = `${pct}%`;
  }

  // =========================================================================
  // Word Inspector & Mandarin Speech
  // =========================================================================
  function speakChinese(text, rate = 0.85) {
    if (!('speechSynthesis' in window)) {
      showToast('Speech synthesis is not supported on this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-CN';
    utter.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find((v) => v.lang.startsWith('zh'));
    if (zhVoice) utter.voice = zhVoice;
    window.speechSynthesis.speak(utter);
  }

  function openWordSheet(wordId, matchedText = '') {
    const word = InkWeaver.getWordById(wordId);
    if (!word) return;

    state.activeWordId = wordId;
    els.wsHanzi.textContent = word.hanzi;
    els.wsPinyin.textContent = word.pinyin;
    els.wsHsk.textContent = `HSK ${word.hsk}`;
    els.wsTier.textContent = `Tier ${word.tier}`;
    els.wsMeaning.textContent = word.meaning;
    els.wsContext.textContent = matchedText
      ? `Replaced "${matchedText}" in this sentence`
      : 'Core vocabulary word';
    els.wsNote.textContent = word.note || '';

    if (word.example) {
      els.wsExample.innerHTML = `<strong>Example:</strong> ${word.example.zh} (${word.example.pinyin}) — <em>${escapeHtml(word.example.en)}</em>`;
      els.wsExample.classList.remove('hidden');
    } else {
      els.wsExample.classList.add('hidden');
    }

    syncMasteredButton();
    openSheet(els.wordSheet);
  }

  function syncMasteredButton() {
    const isMastered = state.masteredSet.has(state.activeWordId);
    els.wsToggleMastered.textContent = isMastered ? '✓ Mastered (Tap to Undo)' : 'Mark as Mastered';
    els.wsToggleMastered.classList.toggle('btn-secondary', isMastered);
    els.wsToggleMastered.classList.toggle('btn-primary', !isMastered);
  }

  // =========================================================================
  // Chapters Drawer & Vocab / Flashcard Drawer
  // =========================================================================
  function openChaptersSheet() {
    els.chaptersSheetTitle.textContent = `${NOVEL.title} — Chapters`;
    els.chaptersSheetList.innerHTML = NOVEL.chapters
      .map((ch) => {
        const isCurr = ch.number === state.currentChapter;
        return `
          <button type="button" class="chapter-card ${isCurr ? 'is-current' : ''}" data-drawer-ch="${ch.number}">
            <div class="cc-left">
              <div class="cc-num">Chapter ${ch.number}</div>
              <div class="cc-title">${escapeHtml(ch.title)}</div>
              ${ch.zhTitle ? `<div class="cc-zh">${escapeHtml(ch.zhTitle)}</div>` : ''}
            </div>
            ${isCurr ? '<span class="cc-badge">Reading</span>' : ''}
          </button>
        `;
      })
      .join('');
    openSheet(els.chaptersSheet);
  }

  function openVocabSheet(initialTab = 'list') {
    state.vocabTab = initialTab;
    $$('.vocab-tab').forEach((t) => t.classList.toggle('active', t.dataset.vtab === initialTab));
    renderVocabSheetBody();
    openSheet(els.vocabSheet);
  }

  function getDeckWords() {
    const encountered = InkWeaver.VOCAB.filter((w) => state.encounteredSet.has(w.id));
    if (encountered.length > 0) return encountered;
    return InkWeaver.getVocabularyForChapter(1, state.settings.pace).activeWords;
  }

  function renderVocabSheetBody() {
    const words = getDeckWords();

    if (state.vocabTab === 'list') {
      els.vocabSheetBody.innerHTML = words
        .map((w) => {
          const mastered = state.masteredSet.has(w.id);
          return `
            <div class="vocab-row">
              <div class="vocab-row-left">
                <span class="vocab-row-zh">${w.hanzi}</span>
                <div>
                  <div class="vocab-row-py">${w.pinyin} · HSK ${w.hsk}</div>
                  <div class="vocab-row-en">${escapeHtml(w.meaning)}</div>
                </div>
              </div>
              <div class="vocab-row-actions">
                <button type="button" class="icon-btn" data-speak-word="${w.hanzi}" title="Listen">🔊</button>
                <button type="button" class="icon-btn" data-toggle-word-mastered="${w.id}" title="Toggle Mastered">${mastered ? '✓' : '○'}</button>
              </div>
            </div>
          `;
        })
        .join('');
      return;
    }

    if (state.flashcardIndex >= words.length) state.flashcardIndex = 0;
    const card = words[state.flashcardIndex];
    const mastered = state.masteredSet.has(card.id);

    els.vocabSheetBody.innerHTML = `
      <div class="flashcard-stage">
        <div class="section-note">Card ${state.flashcardIndex + 1} of ${words.length} · Tap card to flip</div>
        <div class="flashcard" id="flashcard-tap">
          <div class="fc-hanzi">${card.hanzi}</div>
          <div class="fc-reveal ${state.flashcardFlipped ? '' : 'hidden'}">
            <div class="fc-pinyin">${card.pinyin}</div>
            <div class="fc-meaning">${escapeHtml(card.meaning)}</div>
          </div>
          ${state.flashcardFlipped ? '' : '<div class="setting-hint">Tap to reveal Pinyin & English</div>'}
        </div>
        <div class="fc-controls">
          <button type="button" class="btn-secondary" id="fc-listen">🔊 Listen</button>
          <button type="button" class="btn-primary" id="fc-next">${mastered ? 'Next Card →' : 'Got It & Next →'}</button>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // Sheets & Events
  // =========================================================================
  function openSheet(sheetEl) {
    closeAllSheets(false);
    els.backdrop.classList.remove('hidden');
    sheetEl.classList.remove('hidden');
  }

  function closeAllSheets(hideBackdrop = true) {
    [els.wordSheet, els.settingsSheet, els.chaptersSheet, els.vocabSheet].forEach((el) =>
      el.classList.add('hidden')
    );
    if (hideBackdrop) els.backdrop.classList.add('hidden');
  }

  function bindEvents() {
    window.addEventListener('scroll', updateScrollProgress, { passive: true });

    $('#btn-back-library').addEventListener('click', () => {
      window.location.hash = '';
      renderLibraryView();
    });

    els.btnStartReading.addEventListener('click', () => {
      openReader(Math.min(state.currentChapter, NOVEL.chapters.length));
    });

    els.btnViewVocabHome.addEventListener('click', () => openVocabSheet('list'));
    $('#btn-open-vocab').addEventListener('click', () => openVocabSheet('list'));
    $('#btn-chapter-quiz').addEventListener('click', () => openVocabSheet('flashcards'));

    $('#btn-open-settings').addEventListener('click', () => openSheet(els.settingsSheet));
    $('#btn-close-settings').addEventListener('click', () => closeAllSheets());
    $('#btn-open-chapters').addEventListener('click', openChaptersSheet);
    $('#btn-close-chapters').addEventListener('click', () => closeAllSheets());
    $('#btn-close-vocab').addEventListener('click', () => closeAllSheets());
    $('#ws-close').addEventListener('click', () => closeAllSheets());
    els.backdrop.addEventListener('click', () => closeAllSheets());

    els.homeChapterList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open-chapter]');
      if (btn) openReader(parseInt(btn.dataset.openChapter, 10));
    });

    els.chaptersSheetList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-drawer-ch]');
      if (!btn) return;
      closeAllSheets();
      openReader(parseInt(btn.dataset.drawerCh, 10));
    });

    els.btnPrevChapter.addEventListener('click', () => {
      const ch = parseInt(els.btnPrevChapter.dataset.targetCh, 10);
      if (ch) openReader(ch);
    });

    els.btnNextChapter.addEventListener('click', () => {
      const ch = parseInt(els.btnNextChapter.dataset.targetCh, 10);
      if (ch) openReader(ch);
    });

    els.btnNextChapterCard.addEventListener('click', () => {
      const target = els.btnNextChapterCard.dataset.targetCh;
      if (target === 'HOME') {
        window.location.hash = '';
        renderLibraryView();
      } else if (target) {
        openReader(parseInt(target, 10));
      }
    });

    els.btnToggleNewWords.addEventListener('click', () => {
      state.newWordsOpen = !state.newWordsOpen;
      els.newWordsChips.classList.toggle('hidden', !state.newWordsOpen);
      els.newWordsChevron.textContent = state.newWordsOpen ? '▾' : '▸';
      els.btnToggleNewWords.setAttribute('aria-expanded', String(state.newWordsOpen));
    });

    els.readerProse.addEventListener('click', (e) => {
      const tok = e.target.closest('.hanzi-token');
      if (tok) openWordSheet(tok.dataset.vocabId, tok.dataset.matched);
    });

    els.newWordsChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.new-word-chip');
      if (chip) openWordSheet(chip.dataset.vocabId, '');
    });

    $('#ws-speak-normal').addEventListener('click', () => {
      const w = InkWeaver.getWordById(state.activeWordId);
      if (w) speakChinese(w.hanzi, 0.85);
    });

    $('#ws-speak-slow').addEventListener('click', () => {
      const w = InkWeaver.getWordById(state.activeWordId);
      if (w) speakChinese(w.hanzi, 0.58);
    });

    els.wsToggleMastered.addEventListener('click', () => {
      if (!state.activeWordId) return;
      if (state.masteredSet.has(state.activeWordId)) state.masteredSet.delete(state.activeWordId);
      else state.masteredSet.add(state.activeWordId);
      InkStorage.saveMasteredSet(state.masteredSet);
      syncMasteredButton();
      els.homeMasteredCount.textContent = state.masteredSet.size;
      if (state.currentView === 'reader') {
        $$(`.hanzi-token[data-vocab-id="${state.activeWordId}"]`).forEach((el) => {
          el.classList.toggle('is-mastered', state.masteredSet.has(state.activeWordId));
        });
      }
    });

    $('#theme-selector').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-theme-choice]');
      if (!btn) return;
      state.settings.theme = btn.dataset.themeChoice;
      InkStorage.saveSettings(state.settings);
      applySettingsToDOM();
    });

    $('#pace-selector').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pace]');
      if (!btn) return;
      state.settings.pace = btn.dataset.pace;
      InkStorage.saveSettings(state.settings);
      applySettingsToDOM();
      if (state.currentView === 'reader') openReader(state.currentChapter);
      else renderLibraryView();
    });

    const setDisplayMode = (mode) => {
      state.settings.displayMode = mode;
      InkStorage.saveSettings(state.settings);
      applySettingsToDOM();
      if (state.currentView === 'reader') {
        const y = window.scrollY;
        openReader(state.currentChapter);
        window.scrollTo({ top: y, behavior: 'instant' });
      }
    };

    $('#display-mode-selector').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-display-mode]');
      if (btn) setDisplayMode(btn.dataset.displayMode);
    });

    if (els.btnCycleDisplay) {
      const cycleOrder = ['inline-pinyin', 'inline-both', 'ruby', 'hanzi'];
      els.btnCycleDisplay.addEventListener('click', () => {
        const curr = state.settings.displayMode || 'inline-pinyin';
        const next = cycleOrder[(cycleOrder.indexOf(curr) + 1) % cycleOrder.length];
        setDisplayMode(next);
      });
    }

    els.toggleHighlightNew.addEventListener('change', () => {
      state.settings.highlightNew = els.toggleHighlightNew.checked;
      InkStorage.saveSettings(state.settings);
      if (state.currentView === 'reader') openReader(state.currentChapter);
    });

    els.toggleToneColors.addEventListener('change', () => {
      state.settings.toneColors = els.toggleToneColors.checked;
      InkStorage.saveSettings(state.settings);
      applySettingsToDOM();
    });

    els.rangeFontSize.addEventListener('input', () => {
      state.settings.fontSize = parseInt(els.rangeFontSize.value, 10) || 18;
      InkStorage.saveSettings(state.settings);
      applySettingsToDOM();
    });

    $$('.vocab-tab').forEach((t) =>
      t.addEventListener('click', () => {
        state.vocabTab = t.dataset.vtab;
        $$('.vocab-tab').forEach((b) => b.classList.toggle('active', b === t));
        renderVocabSheetBody();
      })
    );

    els.vocabSheetBody.addEventListener('click', (e) => {
      const speakBtn = e.target.closest('[data-speak-word]');
      if (speakBtn) {
        speakChinese(speakBtn.dataset.speakWord, 0.85);
        return;
      }
      const toggleBtn = e.target.closest('[data-toggle-word-mastered]');
      if (toggleBtn) {
        const id = toggleBtn.dataset.toggleWordMastered;
        if (state.masteredSet.has(id)) state.masteredSet.delete(id);
        else state.masteredSet.add(id);
        InkStorage.saveMasteredSet(state.masteredSet);
        els.homeMasteredCount.textContent = state.masteredSet.size;
        renderVocabSheetBody();
        return;
      }
      if (e.target.closest('#flashcard-tap')) {
        state.flashcardFlipped = !state.flashcardFlipped;
        renderVocabSheetBody();
        return;
      }
      if (e.target.closest('#fc-listen')) {
        const deck = getDeckWords();
        const card = deck[state.flashcardIndex % deck.length];
        if (card) speakChinese(card.hanzi, 0.85);
        return;
      }
      if (e.target.closest('#fc-next')) {
        const deck = getDeckWords();
        const card = deck[state.flashcardIndex % deck.length];
        if (card && !state.masteredSet.has(card.id)) {
          state.masteredSet.add(card.id);
          InkStorage.saveMasteredSet(state.masteredSet);
          els.homeMasteredCount.textContent = state.masteredSet.size;
        }
        state.flashcardIndex = (state.flashcardIndex + 1) % deck.length;
        state.flashcardFlipped = false;
        renderVocabSheetBody();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
