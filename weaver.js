/**
 * InkWeave Progressive Diglot Weave Engine
 * Replaces selected English words with interactive Chinese + Ruby Pinyin tokens,
 * increasing vocabulary density progressively every chapter.
 */
window.InkWeaver = (function () {
  const VOCAB = window.INKWEAVE_VOCAB || [];
  const VOCAB_BY_ID = Object.fromEntries(VOCAB.map((v) => [v.id, v]));

  // Proper nouns that should remain untouched so character/place names stay clear
  const PROTECTED_PHRASES = [
    'Luo Jiuzhen',
    'Luo Jiu Zhen',
    'Baiquan County',
    'Baiquan City',
    'Baiquan',
    'Great Zhou',
    'Little Jiangnan',
    'Jiangnan',
    'Qi Alley',
    'Mohist School',
    'Qi Xing',
    'A-Qi',
    'Miss A-Qi',
    'Miss Yue',
    'Old Master Yue',
    'Old Master Lu',
    'Old Master Qi',
    'Old Madam Lu',
    'Eldest Master Lu',
    'First Madam Lu',
    'Second Madam Lu',
    'Second Aunt',
    'Lu Kangshi',
    'Lu Ningshi',
    'Madam Sun',
    'Nanny Yang',
    'Third Young Master Lu',
    'Third Young Master',
    'Third Brother',
    'Prince of Jin',
    'Duke of Yingchuan',
    'Yucheng',
    'Lu Cloth Firm',
    'Lu Rui',
    'Rui-rui',
    'Sixth Miss',
    'Zhou Liuniang',
    'Yi-ge\'er',
    'Qingzhi',
    'Wang\'ao Village',
    'Xucheng',
    'Xu City',
    'Apricot Blossom Mountain',
    'Apricot Blossom Academy',
    'Lu Sheng',
    'Old Scholar Yue',
    'Xi Xing'
  ];

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function wordCountForChapter(ch, pace) {
    if (ch <= 0) return 0;
    if (pace === 'gentle') {
      // Ch 1: 2, Ch 2: 5, Ch 3: 9, Ch 4: 14, Ch 5: 20, Ch 6: 27...
      return Math.min(VOCAB.length, 2 + (ch - 1) * 3 + Math.floor(((ch - 1) * (ch - 2)) / 2));
    }
    if (pace === 'immersive') {
      // Ch 1: 4, Ch 2: 10, Ch 3: 19, Ch 4: 31, Ch 5: 46, Ch 6: 64...
      return Math.min(VOCAB.length, 4 + (ch - 1) * 6 + Math.floor((ch - 1) * (ch - 2) * 1.5));
    }
    // Standard: Ch 1: 3, Ch 2: 7, Ch 3: 13, Ch 4: 21, Ch 5: 31, Ch 6: 43, Ch 7: 57, Ch 8: 73...
    return Math.min(VOCAB.length, 3 + (ch - 1) * 4 + (ch - 1) * (ch - 2));
  }

  /**
   * Returns { activeWords, newWords } for a given chapter index (1-based) and pace.
   */
  function getVocabularyForChapter(chapterNum, pace = 'standard') {
    const ch = Math.max(1, Number(chapterNum) || 1);
    const prevCount = wordCountForChapter(ch - 1, pace);
    const currCount = wordCountForChapter(ch, pace);

    const activeWords = VOCAB.slice(0, currCount);
    const newWords = VOCAB.slice(prevCount, currCount);
    return { activeWords, newWords };
  }

  /**
   * Builds a safe single-pass regex matcher for the active vocabulary slice.
   */
  function buildMatcher(activeWords) {
    const triggerMap = new Map();
    const patterns = [];

    // Protected phrases come first so they match whole and stay un-replaced
    const sortedProtected = [...PROTECTED_PHRASES].sort((a, b) => b.length - a.length);
    for (const p of sortedProtected) {
      patterns.push(escapeRegex(p));
    }

    // Collect all triggers paired with their vocab entry
    const entries = [];
    for (const word of activeWords) {
      for (const trig of word.triggers) {
        entries.push({ trig: trig.toLowerCase(), word });
      }
    }

    // Sort longest trigger first (e.g. "straw sandals" before "sandals", "young master" before "master")
    entries.sort((a, b) => b.trig.length - a.trig.length);

    for (const { trig, word } of entries) {
      if (!triggerMap.has(trig)) {
        triggerMap.set(trig, word);
        patterns.push(escapeRegex(trig));
      }
    }

    if (patterns.length === 0) {
      return { regex: null, triggerMap };
    }

    const regex = new RegExp(`\\b(${patterns.join('|')})\\b`, 'gi');
    return { regex, triggerMap };
  }

  function capitalizeFirst(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function renderToken(word, matchedText, isNew, masteredSet, highlightNew, displayMode) {
    const isMastered = masteredSet.has(word.id);
    const classes = ['hanzi-token', `mode-${displayMode}`];
    if (isNew && highlightNew) classes.push('is-new');
    if (isMastered) classes.push('is-mastered');

    const toneClass = `tone-${word.tone || 5}`;
    const safeMatched = escapeHtml(matchedText);

    // Preserve sentence-initial capitalization for inline pinyin
    const startsUpper = /^[A-Z]/.test(matchedText);
    const pyText = startsUpper ? capitalizeFirst(word.pinyin) : word.pinyin;

    let innerHtml = '';
    if (displayMode === 'ruby') {
      innerHtml = `<ruby><rb>${word.hanzi}</rb><rp>(</rp><rt class="${toneClass}">${word.pinyin}</rt><rp>)</rp></ruby>`;
    } else if (displayMode === 'inline-both') {
      innerHtml = `<span class="tok-py ${toneClass}">${pyText}</span><span class="tok-hz-inline">(${word.hanzi})</span>`;
    } else if (displayMode === 'hanzi') {
      innerHtml = `<span class="tok-hz">${word.hanzi}</span>`;
    } else {
      // Default: 'inline-pinyin' — clean inline pinyin, tap to reveal hanzi & audio
      innerHtml = `<span class="tok-py ${toneClass}">${pyText}</span>`;
    }

    return (
      `<button type="button" class="${classes.join(' ')}" ` +
      `data-vocab-id="${word.id}" data-matched="${safeMatched}" ` +
      `aria-label="${word.hanzi} (${word.pinyin}): ${word.meaning}">` +
      innerHtml +
      `</button>`
    );
  }

  /**
   * Weaves a raw English chapter string into an array of HTML paragraph strings.
   */
  function weaveChapter(text, chapterNum, options = {}) {
    const pace = options.pace || 'standard';
    const masteredSet = options.masteredSet || new Set();
    const highlightNew = options.highlightNew !== false;
    const displayMode = options.displayMode || 'inline-pinyin';

    const { activeWords, newWords } = getVocabularyForChapter(chapterNum, pace);
    const newWordIds = new Set(newWords.map((w) => w.id));
    const { regex, triggerMap } = buildMatcher(activeWords);

    const protectedSet = new Set(PROTECTED_PHRASES.map((p) => p.toLowerCase()));
    const paragraphs = String(text || '')
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    let totalReplacements = 0;
    let totalEnglishWords = 0;
    const encounteredIds = new Set();

    const htmlParagraphs = paragraphs.map((para) => {
      totalEnglishWords += para.split(/\s+/).filter(Boolean).length;
      const escaped = escapeHtml(para);
      if (!regex) return escaped;

      // Reset regex lastIndex
      regex.lastIndex = 0;
      return escaped.replace(regex, (match) => {
        const lower = match.toLowerCase();
        if (protectedSet.has(lower)) {
          return match;
        }
        const word = triggerMap.get(lower);
        if (!word) return match;

        totalReplacements += 1;
        encounteredIds.add(word.id);
        return renderToken(
          word,
          match,
          newWordIds.has(word.id),
          masteredSet,
          highlightNew,
          displayMode
        );
      });
    });

    const newWordsUsed = newWords.filter((w) => encounteredIds.has(w.id));
    const immersionPct =
      totalEnglishWords > 0
        ? Math.min(99, Math.max(1, Math.round((totalReplacements / totalEnglishWords) * 100)))
        : 0;

    return {
      htmlParagraphs,
      activeWords,
      newWords,
      newWordsUsed,
      encounteredIds: Array.from(encounteredIds),
      stats: {
        activePoolSize: activeWords.length,
        newUnlockedCount: newWords.length,
        totalReplacements,
        totalEnglishWords,
        immersionPct
      }
    };
  }

  function getWordById(id) {
    return VOCAB_BY_ID[id] || null;
  }

  return {
    VOCAB,
    getVocabularyForChapter,
    weaveChapter,
    getWordById
  };
})();
