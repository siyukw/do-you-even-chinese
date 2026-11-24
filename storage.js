/**
 * goodbyechinese Storage Layer
 * Lightweight localStorage persistence for reader settings, current chapter, and learned vocabulary.
 */
window.InkStorage = (function () {
  const KEYS = {
    SETTINGS: 'goodbyechinese_settings_v1',
    CHAPTER: 'goodbyechinese_chapter_v1',
    MASTERED: 'goodbyechinese_mastered_v1',
    ENCOUNTERED: 'goodbyechinese_encountered_v1'
  };

  function getSettings() {
    const defaults = {
      theme: 'paper',
      pace: 'standard',
      displayMode: 'inline-pinyin',
      highlightNew: true,
      toneColors: true,
      fontSize: 18
    };
    try {
      const saved = JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
      return { ...defaults, ...saved };
    } catch {
      return defaults;
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }

  function getCurrentChapter() {
    const num = parseInt(localStorage.getItem(KEYS.CHAPTER) || '1', 10);
    return Number.isFinite(num) && num >= 1 ? num : 1;
  }

  function saveCurrentChapter(chapterNum) {
    localStorage.setItem(KEYS.CHAPTER, String(chapterNum));
  }

  function getMasteredSet() {
    try {
      const arr = JSON.parse(localStorage.getItem(KEYS.MASTERED) || '[]');
      return new Set(arr);
    } catch {
      return new Set();
    }
  }

  function saveMasteredSet(set) {
    localStorage.setItem(KEYS.MASTERED, JSON.stringify(Array.from(set)));
  }

  function getEncounteredSet() {
    try {
      const arr = JSON.parse(localStorage.getItem(KEYS.ENCOUNTERED) || '[]');
      return new Set(arr);
    } catch {
      return new Set();
    }
  }

  function addEncountered(ids) {
    const set = getEncounteredSet();
    let changed = false;
    for (const id of ids) {
      if (!set.has(id)) {
        set.add(id);
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(KEYS.ENCOUNTERED, JSON.stringify(Array.from(set)));
    }
    return set;
  }

  return {
    getSettings,
    saveSettings,
    getCurrentChapter,
    saveCurrentChapter,
    getMasteredSet,
    saveMasteredSet,
    getEncounteredSet,
    addEncountered
  };
})();
