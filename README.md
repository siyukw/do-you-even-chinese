# goodbyechinese — Progressive Chinese Web Novel Reader

A lightweight, mobile-first website for reading Chinese web novels in English while learning Chinese inline Pinyin chapter by chapter. Pre-loaded with **Luo Jiu Zhen (《洛九针》)** by Xi Xing (Chapters 1–4).

## Features

- **Progressive Inline Pinyin**: Chapter 1 starts with just 3 everyday words (`rén`, `shuǐ`, `hǎo`) and grows steadily every chapter (`7` words in Ch. 2, `13` in Ch. 3, `21` in Ch. 4, etc.).
- **Tap-to-Learn**: Tap any Pinyin word in the story to see its Chinese character (`汉字`), tone, English meaning, memory note, and hear Mandarin audio pronunciation (`0.85×` and `0.6×`).
- **4 Display Styles**: Switch with one tap between **Inline Pinyin** (`shuǐ`), **Pinyin + 字** (`shuǐ(水)`), **Ruby Above**, and **汉字 Only**.
- **Mobile Chrome Ready**: Rice Paper, Sepia, and Night Ink themes, adjustable font size, thumb-friendly bottom navigation, direct chapter links (`#ch/1`, `#ch/2`, `#ch/3`, `#ch/4`), and Vocab Flashcards.

## Adding New Chapters

Add new chapter objects to `chapters` in `data/luo-jiu-zhen.js` and re-deploy the static folder to Netlify Drop, GitHub Pages, or Vercel.
