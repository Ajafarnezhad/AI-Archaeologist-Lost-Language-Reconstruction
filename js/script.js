/* =========================================================
   TRANSLITERATION -> CUNEIFORM  (client-side sign generator)
   Most dictionary entries have no stored cuneiform glyph (only ~6% do). This
   fills the gap: it segments a transliteration into cuneiform signs using the
   sign table in data/akkadian/cuneiform_signs.js (built from Unicode names,
   mirroring the engine's transliteration_to_cuneiform + base-reading aliases).
   Words already hyphenated are split on '-'; plain citation forms are segmented
   greedily (longest sign first). The result is an approximate syllabic spelling.
   Exposed as window.translitToCuneiform(text).
   ========================================================= */
(function () {
  const FOLD = { 'š':'sh','ṣ':'s','ṭ':'t','ḫ':'h','ĝ':'g','ŋ':'g',
    'à':'a','á':'a','â':'a','ā':'a','è':'e','é':'e','ê':'e','ē':'e',
    'ì':'i','í':'i','î':'i','ī':'i','ù':'u','ú':'u','û':'u','ū':'u',
    'ʾ':'','ʿ':'',"'":'','’':'' };
  function norm(s) {
    s = String(s).normalize('NFC').toLowerCase();
    let out = '';
    for (const ch of s) out += (Object.prototype.hasOwnProperty.call(FOLD, ch) ? FOLD[ch] : ch);
    return out.replace(/[^a-z0-9]/g, '');
  }
  function numeral(n) {   // Old-Babylonian 1..59: U(10)*tens + DIŠ(1)*ones
    if (!(n >= 1 && n <= 59)) return '';
    return '\u{1230B}'.repeat(Math.floor(n / 10)) + '\u{12079}'.repeat(n % 10);
  }
  function signOf(k) {
    const S = window.CUNEIFORM_SIGNS || {};
    if (!k) return '';
    if (/^\d+$/.test(k)) return numeral(parseInt(k, 10));
    const homo = { p:'b', t:'d', k:'g', q:'k' };            // voiced/voiceless homophones
    const cands = [k, k.replace(/\d+$/, '')];
    if (homo[k[0]]) cands.push(homo[k[0]] + k.slice(1));
    for (const c of cands) if (S[c]) return S[c];
    return '';
  }
  function segment(word) {                                   // greedy longest-sign-first
    const out = []; let i = 0; const MAX = 4;
    while (i < word.length) {
      let matched = false;
      for (let len = Math.min(MAX, word.length - i); len >= 1; len--) {
        const g = signOf(word.slice(i, i + len));
        if (g) { out.push(g); i += len; matched = true; break; }
      }
      if (!matched) i++;                                     // drop a char with no sign
    }
    return out.join('');
  }
  window.translitToCuneiform = function (t) {
    if (!t) return '';
    const raw = String(t);
    if (/[-–.]/.test(raw)) {                                 // already segmented into signs
      return raw.split(/\s+/).map((w) =>
        w.split(/[-–.]/).filter(Boolean).map((syl) => signOf(norm(syl))).join('')
      ).join(' ').trim();
    }
    return raw.split(/\s+/).map((w) => segment(norm(w))).join(' ').trim();
  };
})();

/* =========================================================
   MOBILE NAV TOGGLE
   ========================================================= */
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', isOpen);
  });

  // allow tapping a nav item with a dropdown to expand it on mobile
  document.querySelectorAll('.nav-list > li').forEach((item) => {
    const link = item.querySelector('a');
    const dropdown = item.querySelector('.dropdown');
    if (dropdown && link) {
      link.addEventListener('click', (e) => {
        if (window.innerWidth <= 760) {
          e.preventDefault();
          item.classList.toggle('is-open');
        }
      });
    }
  });
}

/* =========================================================
   HERO ACCORDION
   Matches the reference site: the first panel is expanded by
   default; hovering (or keyboard-focusing) another panel expands
   it and the rest collapse back to narrow strips. No autoplay,
   no arrows, no dots — purely hover/focus driven.
   ========================================================= */
(function () {
  const accordion = document.getElementById('mainAccordion');
  if (!accordion) return;

  const items = Array.from(accordion.querySelectorAll('.accordion-item'));
  const defaultItem = items.find((i) => i.classList.contains('is-active')) || items[0];

  function activate(item) {
    items.forEach((i) => i.classList.toggle('is-active', i === item));
  }

  items.forEach((item) => {
    item.addEventListener('mouseenter', () => activate(item));
    item.addEventListener('focus', () => activate(item));
  });

  // revert to the default panel once the mouse leaves the whole strip
  accordion.addEventListener('mouseleave', () => activate(defaultItem));

  // revert once keyboard focus leaves the strip entirely
  accordion.addEventListener('focusout', (e) => {
    if (!accordion.contains(e.relatedTarget)) activate(defaultItem);
  });
})();

/* =========================================================
   ACCORDION DETAIL PANELS
   Clicking an accordion item opens its matching panel below
   the strip with a fade-in. Only one panel is open at a time.
   ========================================================= */
(function () {
  const items = document.querySelectorAll('.accordion-item[data-panel]');
  const panels = document.querySelectorAll('.detail-panel');
  if (!items.length || !panels.length) return;

  function openPanel(targetId) {
    panels.forEach((panel) => {
      const isTarget = panel.id === targetId;
      panel.classList.toggle('is-open', isTarget);
      if (!isTarget) panel.classList.remove('is-visible');
    });
    // wait a frame so the browser registers display:block before fading in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = document.getElementById(targetId);
        if (target) target.classList.add('is-visible');
      });
    });
  }

  items.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.dataset.panel;
      openPanel(targetId);
      const target = document.getElementById(targetId);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
})();

/* =========================================================
   TRANSLATE TOOL (Akkadian dictionary)
   - akk->en : tap the cuneiform keyboard; the TOP box shows
     cuneiform (with the transliteration underneath), the BOTTOM
     box shows the English meaning live.
   - en->akk : type English in the TOP box; the BOTTOM box shows
     the Akkadian equivalent(s), word-by-word for phrases.
   - dictionary lazy-loaded from data/akkadian/akkadian_dictionary.js
     (works over file://); keys from cuneiform_keys.js.
   ========================================================= */
(function () {
  const tool = document.getElementById('translateTool');
  if (!tool) return;

  const cuneBox   = document.getElementById('trCuneBox');
  const cuneLine  = document.getElementById('trCuneLine');
  const translitLine = document.getElementById('trTranslitLine');
  const input     = document.getElementById('trInput');   // English textarea
  const kb        = document.getElementById('trKeyboard');
  const output    = document.getElementById('trOutput');
  const toggleBtn = document.getElementById('trToggle');
  const copyBtn   = document.getElementById('trCopy');
  const clearBtn  = document.getElementById('trClear');
  const fromEl    = document.getElementById('trFrom');
  const toEl      = document.getElementById('trTo');
  const topLabel  = document.getElementById('trTopLabel');
  const botLabel  = document.getElementById('trBotLabel');
  const accItem   = document.querySelector('.accordion-item[data-panel="panel-translation"]');
  const speakBtn  = document.getElementById('trSpeak');
  const voiceSel  = document.getElementById('trVoice');
  const rateInput = document.getElementById('trRate');
  const sylChk    = document.getElementById('trSyl');

  let tokens = [];                 // cuneiform input: [{c:'𒁀', t:'ba'}, ...]
  let caret = 0;                   // insertion index (mouse/keyboard editable)
  let DICT = null, loaded = false, loading = false;
  let timer = null;
  let lastEnglish = '', lastEntry = null, lastAkk = [];   // lastAkk: full Akkadian phrase to carry on Swap
  let savedEn = '', savedAkk = [], sideEdited = false;    // Swap memory: original source per side + user-edit flag

  /* ---------- keyboard ---------- */
  function baseReading(k) {
    if (k.label.length === 1 && 'aeiu'.includes(k.label)) return k.label; // vowel sign
    if (k.label === 'ʾ') return 'ʾ';
    return k.label + 'a';           // consonant base key = the "Ca" syllable
  }
  function makeKey(k) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tr-key';
    b.innerHTML = (k.c ? '<span class="tr-kc">' + k.c + '</span>' : '') +
                  '<span class="tr-kl">' + k.label + '</span>';
    b.addEventListener('click', () => pushToken(k.c || '', baseReading(k)));
    if (k.v && k.v.length) {
      const pop = document.createElement('span');
      pop.className = 'tr-pop';
      k.v.forEach(([r, c]) => {
        const vi = document.createElement('button');
        vi.type = 'button'; vi.className = 'tr-pi';
        vi.innerHTML = (c ? '<span class="tr-pc">' + c + '</span>' : '') +
                       '<span class="tr-pr">' + r + '</span>';
        vi.addEventListener('click', (ev) => { ev.stopPropagation(); pushToken(c || '', r); });
        pop.appendChild(vi);
      });
      b.appendChild(pop);
    }
    return b;
  }
  function buildKeyboard() {
    kb.innerHTML = '';
    const keys = window.AKKADIAN_KEYS;
    if (keys && keys.length) {
      keys.forEach((k) => kb.appendChild(makeKey(k)));
    } else {
      'a e i u b d g ḫ k l m n p q r s ṣ š t ṭ w y z'.split(' ')
        .forEach((ch) => kb.appendChild(makeKey({ label: ch, c: '', v: [] })));
    }
    const sp = document.createElement('button');
    sp.type = 'button'; sp.className = 'tr-key tr-key--wide tr-key--util'; sp.textContent = 'Space';
    sp.addEventListener('click', () => pushToken(' ', ' '));
    kb.appendChild(sp);
    const bs = document.createElement('button');
    bs.type = 'button'; bs.className = 'tr-key tr-key--util'; bs.textContent = '⌫';
    bs.setAttribute('aria-label', 'Backspace');
    bs.addEventListener('click', popToken);
    kb.appendChild(bs);
  }
  buildKeyboard();

  function pushToken(c, t) { tokens.splice(caret, 0, { c: c, t: t }); caret++; sideEdited = true; renderCuneBox(); schedule(); cuneBox.focus(); }
  function popToken() { if (caret > 0) { tokens.splice(caret - 1, 1); caret--; sideEdited = true; renderCuneBox(); schedule(); cuneBox.focus(); } }
  function delTokenFwd() { if (caret < tokens.length) { tokens.splice(caret, 1); sideEdited = true; renderCuneBox(); schedule(); cuneBox.focus(); } }
  function moveTokenCaret(d) { caret = Math.max(0, Math.min(tokens.length, caret + d)); renderCuneBox(); }
  function setTokenCaret(clientX) {
    const spans = [].slice.call(cuneLine.querySelectorAll('[data-idx]'));
    if (!spans.length) { caret = 0; renderCuneBox(); return; }
    let best = tokens.length, bestDist = Infinity;
    spans.forEach((sp) => {
      const r = sp.getBoundingClientRect(), idx = +sp.dataset.idx;
      let d = Math.abs(clientX - r.left); if (d < bestDist) { bestDist = d; best = idx; }
      d = Math.abs(clientX - r.right); if (d < bestDist) { bestDist = d; best = idx + 1; }
    });
    caret = Math.max(0, Math.min(tokens.length, best));
    renderCuneBox();
  }
  function renderCuneBox() {
    if (caret > tokens.length) caret = tokens.length;
    const parts = [];
    tokens.forEach((t, i) => {
      if (i === caret) parts.push('<span class="tr-caret"></span>');
      parts.push('<span class="tr-sign" data-idx="' + i + '" data-i="' + i + '" title="' + esc(t.t) + '">' + esc(t.c || t.t) + '</span>');
    });
    if (caret >= tokens.length) parts.push('<span class="tr-caret"></span>');
    cuneLine.innerHTML = parts.join('');
    const tl = tokens.map((t) => t.t).join('').replace(/\s+/g, ' ').trim();
    translitLine.textContent = tl ? '(' + tl + ')' : '';
    cuneBox.classList.toggle('is-empty', tokens.length === 0);
  }
  renderCuneBox();

  /* ---------- helpers ---------- */
  const FOLD = {
    'ā':'a','â':'a','á':'a','à':'a','ē':'e','ê':'e','é':'e','è':'e',
    'ī':'i','î':'i','í':'i','ì':'i','ū':'u','û':'u','ú':'u','ù':'u',
    'ō':'o','ô':'o','š':'s','ṣ':'s','ṭ':'t','ḫ':'h','ḥ':'h','ḏ':'d','ṯ':'t','ŋ':'g','ʾ':'','ʿ':''
  };
  function norm(str) {
    let out = '';
    for (const c of str.toLowerCase()) out += (Object.prototype.hasOwnProperty.call(FOLD, c) ? FOLD[c] : c);
    return out.replace(/[^a-z ]/g, '').replace(/sh/g, 's').replace(/kh/g, 'h').trim();
  }
  function collapse(s) { return s.replace(/(.)\1+/g, '$1'); }   // fuzzy: drop doubled letters
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  const POS = { N:'noun', V:'verb', AJ:'adj.', AV:'adv.', PRP:'prep.', NU:'number', CNJ:'conj.',
                DET:'det.', REL:'rel.', MOD:'mod.', IP:'pron.', QP:'q.', 'PN':'name' };

  /* ---------- lazy dictionary ---------- */
  function ensure() {
    if (loaded || loading) return;
    loading = true;
    output.innerHTML = '<span class="tr-hint">Loading dictionary…</span>';
    const s = document.createElement('script');
    s.src = 'data/akkadian/akkadian_dictionary.js';
    s.charset = 'utf-8';
    s.onload = () => {
      DICT = (window.AKKADIAN_DICT && window.AKKADIAN_DICT.entries) || [];
      let stored = 0, gen = 0;
      for (const e of DICT) {
        e._t = norm(e.t).replace(/\s+/g, '');
        e._tc = collapse(e._t);
        e._e = (e.e || []).join(' ; ').toLowerCase();
        // fill a cuneiform glyph for the ~94% of entries that lack one in the data
        if (e.c) stored++;
        else if (window.translitToCuneiform) { e.c = window.translitToCuneiform(e.t); if (e.c) gen++; }
      }
      loaded = true; loading = false;
      if (window.AkkLog) window.AkkLog.log('Dictionary', 'load', DICT.length + ' entries · cuneiform: ' + stored + ' authentic + ' + gen + ' generated');
      translate();
    };
    s.onerror = () => {
      loading = false;
      output.innerHTML = '<span class="tr-hint">Could not load the dictionary file. Try opening the page through a local server.</span>';
    };
    document.head.appendChild(s);
  }

  /* ---------- search ---------- */
  function searchAkk(buffer) {
    const q = norm(buffer).replace(/\s+/g, '');
    if (!q) return [];
    const qc = collapse(q);
    const res = [];
    for (const e of DICT) {
      const t = e._t, tc = e._tc; let rank = -1;
      if (t === q) rank = 0; else if (t.startsWith(q)) rank = 1; else if (t.includes(q)) rank = 2;
      else if (tc === qc) rank = 3; else if (tc.startsWith(qc)) rank = 4; else if (tc.includes(qc)) rank = 5;
      if (rank >= 0) res.push([rank, e]);
    }
    res.sort((a, b) => (a[0] - b[0]) || ((b[1].f || 0) - (a[1].f || 0)));
    return res.map((m) => m[1]);
  }
  function searchEng(word) {
    const q = word.toLowerCase();
    const res = [];
    for (const e of DICT) {
      const words = e._e.split(/[^a-z]+/).filter(Boolean); let rank = -1;
      if (words.includes(q)) rank = 0;
      else if (words.some((w) => w.startsWith(q))) rank = 1;
      else if (e._e.includes(q)) rank = 2;
      if (rank >= 0) res.push([rank, e]);
    }
    res.sort((a, b) => (a[0] - b[0]) || ((b[1].f || 0) - (a[1].f || 0)));
    return res.map((m) => m[1]);
  }

  /* ---------- render ---------- */
  function meaningHTML(e, re) {
    let m = esc((e.e || []).join('; '));
    if (re) m = m.replace(re, '<mark>$1</mark>');
    return m;
  }
  function primaryHTML(e, re) {
    return '<div class="tr-primary"><span class="tr-term">' + esc(e.t) + '</span>' +
           (e.c ? '<span class="tr-cuneiform">' + e.c + '</span>' : '') +
           (e.p ? '<span class="tr-pos">' + (POS[e.p] || e.p) + '</span>' : '') +
           '<span class="tr-mean">' + meaningHTML(e, re) + '</span></div>';
  }
  function moreHTML(list, re) {
    if (!list.length) return '';
    let h = '<div class="tr-more">';
    for (const e of list) {
      h += '<div class="tr-result" data-copy="' + esc(e.t) + '"><span class="tr-term">' + esc(e.t) + '</span>' +
           (e.c ? '<span class="tr-cuneiform">' + e.c + '</span>' : '') +
           (e.p ? '<span class="tr-pos">' + (POS[e.p] || e.p) + '</span>' : '') +
           '<span class="tr-mean">' + meaningHTML(e, re) + '</span></div>';
    }
    return h + '</div>';
  }
  function countHTML(n) { return n > 1 ? '<div class="tr-count">' + n + ' matches</div>' : ''; }
  function hint(dir) {
    output.innerHTML = dir === 'akk2en'
      ? '<span class="tr-hint">The English meaning appears here as you type in cuneiform.</span>'
      : '<span class="tr-hint">The Akkadian equivalent appears here as you type.</span>';
  }

  function renderAkk(list, buffer) {
    if (!list.length) {
      output.innerHTML = '<span class="tr-hint">No match yet for “' + esc(norm(buffer)) + '”. Keep building the word, or use Swap.</span>';
      lastEnglish = ''; lastEntry = null; lastAkk = [];
      return;
    }
    const first = list[0];
    lastEntry = first; lastEnglish = (first.e && first.e[0]) || '';
    lastAkk = [{ c: first.c || '', t: first.t }];
    output.innerHTML = primaryHTML(first, null) + moreHTML(list.slice(1, 8), null) + countHTML(list.length);
  }
  /* Akkadian phrase (several signs/words in the box) -> English, word by word.
     Mirrors renderWordByWord so a swapped-in phrase reads back correctly. */
  function renderAkkWordByWord(words) {
    let html = '<div class="tr-wbw">'; let firstFound = null; const engParts = [];
    for (const w of words) {
      const best = searchAkk(w)[0];
      if (best) {
        if (!firstFound) firstFound = best;
        if (best.e && best.e[0]) engParts.push(best.e[0]);
        html += '<div class="tr-wrow"><span class="tr-wen">' + esc(w) + '</span><span class="tr-warr">&rarr;</span>' +
                (best.c ? '<span class="tr-cuneiform">' + best.c + '</span>' : '') +
                '<span class="tr-mean">' + esc((best.e || []).slice(0, 3).join('; ')) + '</span></div>';
      } else {
        html += '<div class="tr-wrow"><span class="tr-wen">' + esc(w) + '</span><span class="tr-warr">&rarr;</span>' +
                '<span class="tr-none">— not in lexicon</span></div>';
      }
    }
    html += '</div>';
    lastEntry = firstFound; lastEnglish = engParts.join(' ');
    output.innerHTML = html;
  }
  function renderEngSingle(list, raw) {
    if (!list.length) {
      output.innerHTML = '<span class="tr-hint">No Akkadian word found for “' + esc(raw) + '”.</span>';
      lastEntry = null; lastAkk = [];
      return;
    }
    const re = new RegExp('(' + escRe(raw) + ')', 'ig');
    lastEntry = list[0];
    lastAkk = [{ c: list[0].c || '', t: list[0].t }];
    output.innerHTML = primaryHTML(list[0], re) + moreHTML(list.slice(1, 8), re) + countHTML(list.length);
  }
  function renderWordByWord(words) {
    let html = '<div class="tr-wbw">'; let firstFound = null; const akkTokens = [];
    for (const w of words) {
      const re = new RegExp('(' + escRe(w) + ')', 'ig');
      const best = searchEng(w)[0];
      if (best) {
        if (!firstFound) firstFound = best;
        if (akkTokens.length) akkTokens.push({ c: ' ', t: ' ' });
        akkTokens.push({ c: best.c || '', t: best.t });
        html += '<div class="tr-wrow"><span class="tr-wen">' + esc(w) + '</span><span class="tr-warr">&rarr;</span>' +
                '<span class="tr-term">' + esc(best.t) + '</span>' +
                (best.c ? '<span class="tr-cuneiform">' + best.c + '</span>' : '') +
                '<span class="tr-mean">' + esc((best.e || []).slice(0, 3).join('; ')).replace(re, '<mark>$1</mark>') + '</span></div>';
      } else {
        html += '<div class="tr-wrow"><span class="tr-wen">' + esc(w) + '</span><span class="tr-warr">&rarr;</span>' +
                '<span class="tr-none">— no Akkadian word (name / not in lexicon)</span></div>';
      }
    }
    html += '</div>';
    lastEntry = firstFound; lastAkk = akkTokens;
    output.innerHTML = html;
  }

  /* ---------- main ---------- */
  function schedule() { clearTimeout(timer); timer = setTimeout(translate, 160); }

  function translate() {
    const dir = tool.dataset.dir;
    const hasInput = dir === 'akk2en' ? tokens.length > 0 : input.value.trim().length > 0;
    if (!hasInput) { hint(dir); lastEnglish = ''; lastEntry = null; lastAkk = []; return; }
    if (!loaded) { ensure(); return; }

    if (dir === 'akk2en') {
      const buffer = tokens.map((t) => t.t).join('');
      const words = buffer.trim().split(/\s+/).filter(Boolean);
      if (words.length <= 1) renderAkk(searchAkk(buffer), buffer);
      else renderAkkWordByWord(words);
    } else {
      const raw = input.value.trim();
      const words = raw.split(/\s+/);
      if (words.length <= 1) renderEngSingle(searchEng(raw), raw);
      else renderWordByWord(words);
    }
  }

  /* ---------- clipboard ---------- */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else { fallbackCopy(text); }
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }
  function flash(btn, msg) {
    const old = btn.innerHTML; btn.innerHTML = msg;
    setTimeout(() => { btn.innerHTML = old; }, 1000);
  }

  /* ---------- text-to-speech: approximate (reconstructed) Akkadian pronunciation ---------- */
  const synth = window.speechSynthesis || null;
  let voices = [];
  function rankLang(lang) {
    const order = ['en', 'it', 'es', 'pt', 'de', 'tr', 'nl'];
    const i = order.indexOf((lang || '').slice(0, 2).toLowerCase());
    return i < 0 ? 99 : i;
  }
  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices() || [];
    if (voiceSel) {
      const cur = voiceSel.value;
      voiceSel.innerHTML = '';
      voices.slice().sort((a, b) => rankLang(a.lang) - rankLang(b.lang)).forEach((v) => {
        const o = document.createElement('option');
        o.value = v.name; o.textContent = v.name + ' (' + v.lang + ')';
        voiceSel.appendChild(o);
      });
      if (cur) voiceSel.value = cur;
      voiceSel.style.display = voices.length ? '' : 'none';
    }
  }
  if (synth) {
    loadVoices();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices);
  }
  function chosenVoice() {
    if (!voices.length) return null;
    if (voiceSel && voiceSel.value) {
      const v = voices.find((x) => x.name === voiceSel.value);
      if (v) return v;
    }
    return voices.slice().sort((a, b) => rankLang(a.lang) - rankLang(b.lang))[0];
  }
  function rate() { return rateInput ? (parseFloat(rateInput.value) || 0.85) : 0.85; }

  // transliteration -> approximate English-phonics respelling
  function phonetic(str) {
    return str.toLowerCase()
      .replace(/ā|â/g, 'A').replace(/ē|ê/g, 'E').replace(/ī|î/g, 'I').replace(/ū|û/g, 'U')
      .replace(/š/g, 'sh').replace(/ṣ/g, 'ts').replace(/ṭ/g, 't')
      .replace(/ḫ|ḥ/g, 'kh').replace(/q/g, 'k').replace(/ʾ|ʿ/g, ' ')
      .replace(/a/g, 'ah').replace(/e/g, 'eh').replace(/i/g, 'ee').replace(/o/g, 'oh').replace(/u/g, 'oo')
      .replace(/A/g, 'aah').replace(/E/g, 'ehh').replace(/I/g, 'eee').replace(/U/g, 'ooo')
      .trim();
  }

  function clearSigns() {
    cuneLine.querySelectorAll('.tr-sign.is-speaking').forEach((s) => s.classList.remove('is-speaking'));
  }
  function highlightSign(i) {
    clearSigns();
    const el = cuneLine.querySelector('.tr-sign[data-i="' + i + '"]');
    if (el) el.classList.add('is-speaking');
  }

  let speaking = false, speakRun = 0;
  function stopSpeak() { if (synth) synth.cancel(); speaking = false; speakRun++; clearSigns(); }

  function speakSyllables(items, hl, clr, onDone) {
    hl = hl || highlightSign; clr = clr || clearSigns;   // callbacks let other tools reuse this
    stopSpeak(); clr(); speaking = true;
    const myRun = speakRun;                 // guards against overlapping runs on re-click
    if (!voices.length) flash(speakBtn, '🔇 visual');
    let idx = 0;
    const safety = voices.length ? 2000 : 620;
    (function step() {
      if (myRun !== speakRun) return;
      if (idx >= items.length) { clr(); speaking = false; if (onDone) onDone(); return; }
      hl(items[idx].i);
      let advanced = false;
      const adv = () => { if (advanced || myRun !== speakRun) return; advanced = true; idx++; step(); };
      if (synth && voices.length) {
        const u = new SpeechSynthesisUtterance(phonetic(items[idx].read));
        const v = chosenVoice(); if (v) { u.voice = v; u.lang = v.lang; }
        u.rate = rate(); u.onend = adv; u.onerror = adv;
        try { synth.speak(u); } catch (e) {}
      }
      setTimeout(adv, safety / rate());   // drives the visual walk even with no audio
    })();
  }
  function speakWord(text) {
    stopSpeak();
    if (!(synth && voices.length)) { flash(speakBtn, '🔇 no voice'); return; }
    speaking = true;
    const u = new SpeechSynthesisUtterance(phonetic(text));
    const v = chosenVoice(); if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = rate(); u.onend = () => { speaking = false; };
    try { synth.speak(u); } catch (e) {}
  }

  /* ---------- direction / wiring ---------- */
  function setDir(dir) {
    tool.dataset.dir = dir;
    if (dir === 'akk2en') {
      fromEl.textContent = 'Akkadian'; toEl.textContent = 'English';
      topLabel.textContent = 'Akkadian (cuneiform)'; botLabel.textContent = 'English';
      kb.classList.remove('is-hidden');
      cuneBox.classList.remove('is-hidden'); input.classList.add('is-hidden');
    } else {
      fromEl.textContent = 'English'; toEl.textContent = 'Akkadian';
      topLabel.textContent = 'English'; botLabel.textContent = 'Akkadian';
      kb.classList.add('is-hidden');
      cuneBox.classList.add('is-hidden'); input.classList.remove('is-hidden');
    }
  }

  /* Swap is a lossless toggle: leaving a side remembers its exact source, so a
     swap back restores the original text instead of a lossy re-translation
     (English -> Akkadian -> English is not a 1:1 mapping). We only regenerate by
     lookup when the swapped-in side was actually edited. */
  toggleBtn.addEventListener('click', () => {
    if (tool.dataset.dir === 'akk2en') {
      savedAkk = tokens.map((t) => ({ c: t.c, t: t.t }));   // remember the Akkadian source
      setDir('en2akk');
      input.value = (!sideEdited && savedEn) ? savedEn : (lastEnglish || '');
    } else {
      savedEn = input.value;                                // remember the English source
      setDir('akk2en');
      tokens = (!sideEdited && savedAkk.length) ? savedAkk.map((t) => ({ c: t.c, t: t.t }))
             : (lastAkk.length ? lastAkk.map((t) => ({ c: t.c, t: t.t }))
             : (lastEntry ? [{ c: lastEntry.c || '', t: lastEntry.t }] : []));
      caret = tokens.length;
      renderCuneBox();
    }
    sideEdited = false;                                     // the swapped-in side starts pristine
    ensure();
    translate();
    (tool.dataset.dir === 'en2akk' ? input : cuneBox).focus();
    if (window.AkkLog) window.AkkLog.log('Dictionary', 'swap', 'direction → ' + tool.dataset.dir);
  });

  copyBtn.addEventListener('click', () => {
    copyText(tool.dataset.dir === 'akk2en' ? cuneLine.textContent : input.value);
    flash(copyBtn, 'Copied!');
  });
  clearBtn.addEventListener('click', () => {
    stopSpeak();
    if (tool.dataset.dir === 'akk2en') { tokens = []; caret = 0; renderCuneBox(); cuneBox.focus(); }
    else { input.value = ''; input.focus(); }
    lastEnglish = ''; lastEntry = null; lastAkk = [];
    savedEn = ''; savedAkk = []; sideEdited = false;
    hint(tool.dataset.dir);
  });

  if (speakBtn) speakBtn.addEventListener('click', () => {
    if (tool.dataset.dir === 'akk2en') {
      const items = tokens
        .map((t, i) => ({ i: i, read: t.t }))
        .filter((x) => x.read.trim() !== '');
      if (!items.length) { flash(speakBtn, 'type first'); return; }
      if (sylChk && !sylChk.checked) speakWord(tokens.map((t) => t.t).join(''));
      else speakSyllables(items);
      if (window.AkkLog) window.AkkLog.log('Voice', 'speak', 'dictionary: ' + tokens.map((t) => t.t).join('').trim());
    } else {
      if (lastEntry) { speakWord(lastEntry.t); if (window.AkkLog) window.AkkLog.log('Voice', 'speak', 'dictionary: ' + lastEntry.t); }
      else flash(speakBtn, 'no word');
    }
  });

  input.addEventListener('input', () => { savedEn = input.value; sideEdited = true; schedule(); });
  input.addEventListener('focus', ensure);
  cuneBox.addEventListener('focus', ensure);
  cuneBox.addEventListener('click', (e) => { setTokenCaret(e.clientX); cuneBox.focus(); });
  cuneBox.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') { e.preventDefault(); popToken(); }
    else if (e.key === 'Delete') { e.preventDefault(); delTokenFwd(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); moveTokenCaret(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); moveTokenCaret(1); }
    else if (e.key === 'Home') { e.preventDefault(); caret = 0; renderCuneBox(); }
    else if (e.key === 'End') { e.preventDefault(); caret = tokens.length; renderCuneBox(); }
  });
  /* paste transliteration text (typed above or copied elsewhere) -> tokens at the caret */
  cuneBox.addEventListener('paste', (e) => {
    e.preventDefault();
    const cd = e.clipboardData || window.clipboardData;
    const text = cd ? cd.getData('text') : '';
    if (!text || !text.trim()) return;
    text.trim().split(/\s+/).forEach((w) => {
      if (caret > 0 && tokens[caret - 1] && tokens[caret - 1].t !== ' ') { tokens.splice(caret, 0, { c: ' ', t: ' ' }); caret++; }
      tokens.splice(caret, 0, { c: (window.translitToCuneiform ? window.translitToCuneiform(w) : ''), t: w }); caret++;
    });
    sideEdited = true;
    renderCuneBox(); ensure(); schedule();
  });
  if (accItem) accItem.addEventListener('click', ensure);

  output.addEventListener('click', (ev) => {
    const row = ev.target.closest('.tr-result');
    if (!row) return;
    copyText(row.dataset.copy || '');
    row.style.borderColor = 'var(--red)';
    setTimeout(() => { row.style.borderColor = ''; }, 500);
  });

  /* shared API so other tools (Gap Reconstruction) can reuse this dictionary + voice */
  window.AkkTool = {
    ensure: ensure,
    ready: function () { return loaded; },
    searchEng: function (w) { return loaded ? searchEng(w) : []; },
    searchAkk: function (b) { return loaded ? searchAkk(b) : []; },
    speakSyllables: speakSyllables,
    speakWord: speakWord,
    stopSpeak: stopSpeak,
    sylEnabled: function () { return sylChk ? sylChk.checked : true; }
  };
})();

/* =========================================================
   GAP RECONSTRUCTION  (Translate slide)
   A cuneiform-keyboard fragment editor: transcribe a broken tablet, mark the
   illegible spots with small/big gaps, then Reconstruct. The ByT5 engine fills
   each gap; because the model outputs English, each fill's Akkadian form is
   looked up in the shared dictionary (window.AkkTool). The output box shows the
   completed Akkadian; Swap flips it to the model's English translation.

   Backend contract  ->  POST /api/reconstruct  { prompt }
     { reconstructedText, modelUsed, globalConfidence,
       tokens: [ { token, isMissing, confidence, alternatives:[{token,confidence}] } ] }
   Works offline as a graceful message.
   ========================================================= */
(function () {
  const card = document.getElementById('gapCard');
  if (!card) return;

  const cuneBox   = document.getElementById('gapCuneBox');
  const cuneLine  = document.getElementById('gapCuneLine');
  const translitLine = document.getElementById('gapTranslitLine');
  const kb        = document.getElementById('gapKeyboard');
  const runBtn    = document.getElementById('gapRun');
  const clearBtn  = document.getElementById('gapClear');
  const exBtn     = document.getElementById('gapExample');
  const swapBtn   = document.getElementById('gapSwap');
  const speakBtn  = document.getElementById('gapSpeak');
  const copyBtn   = document.getElementById('gapCopy');
  const insSmall  = document.getElementById('gapInsSmall');
  const insBig    = document.getElementById('gapInsBig');
  const resBox    = document.getElementById('gapResult');
  const resTitle  = document.getElementById('gapResTitle');
  const modelEl   = document.getElementById('gapModel');
  const outEl     = document.getElementById('gapModelText');
  const fillsBlock= document.getElementById('gapFillsBlock');
  const fillsEl   = document.getElementById('gapFills');
  const gaugeEl   = document.getElementById('gapGauge');
  const demoBtn   = document.getElementById('gapDemo');
  const samplesEl = document.getElementById('gapSamples');

  /* same-origin when the pipeline serves the site (--ui-dir), else :3000 (CORS). */
  const AI_BASE = (location.port === '3000') ? '' : 'http://127.0.0.1:3000';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  }
  function pct(c) { return Math.round((Number(c) || 0) * 100) + '%'; }
  function confClass(c) { c = Number(c) || 0; return c >= 0.75 ? 'is-hi' : (c >= 0.45 ? 'is-mid' : 'is-lo'); }
  function warmDict() { if (window.AkkTool && window.AkkTool.ensure) window.AkkTool.ensure(); }

  /* input tokens: {c,t} sign · {c:' ',t:' '} space · {gap:true,big,t,c} gap */
  let tokens = [];
  let caret = 0;            // insertion index into tokens (mouse/keyboard editable)
  let gapsData = [];        // per gap: { alts:[{en,t,c,conf}], chosen }
  let lastEnglish = '';     // model reconstructedText
  let showEnglish = false;

  function log(cat, act, det) { if (window.AkkLog) window.AkkLog.log(cat, act, det); }

  /* ---- animated confidence gauge (ring + grade + risk) from globalConfidence ---- */
  function gradeOf(p) { return p >= 90 ? 'A+' : p >= 80 ? 'A' : p >= 70 ? 'B' : p >= 55 ? 'C' : p >= 40 ? 'D' : 'E'; }
  function bandOf(p) { return p >= 75 ? 'hi' : p >= 50 ? 'mid' : 'lo'; }
  function riskOf(p) { return p >= 75 ? 'low risk' : p >= 50 ? 'moderate risk' : 'high risk'; }
  function renderGauge(pct100) {
    if (!gaugeEl) return;
    const p = Math.max(0, Math.min(100, Math.round(pct100)));
    const R = 52, C = 2 * Math.PI * R;
    gaugeEl.hidden = false;
    gaugeEl.className = 'gap-gauge band-' + bandOf(p);
    gaugeEl.innerHTML =
      '<svg class="gauge-svg" viewBox="0 0 120 120" aria-hidden="true">' +
        '<circle class="gauge-bg" cx="60" cy="60" r="' + R + '"></circle>' +
        '<circle class="gauge-fg" cx="60" cy="60" r="' + R + '" transform="rotate(-90 60 60)" ' +
          'stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '"></circle>' +
        '<text class="gauge-pct" x="60" y="64">0%</text>' +
      '</svg>' +
      '<div class="gauge-meta"><span class="gauge-grade">' + gradeOf(p) + '</span>' +
      '<span class="gauge-risk">' + riskOf(p) + '</span></div>' +
      '<div class="gauge-cap">model confidence</div>';
    const fg = gaugeEl.querySelector('.gauge-fg'), txt = gaugeEl.querySelector('.gauge-pct');
    setTimeout(() => { fg.style.strokeDashoffset = (C * (1 - p / 100)).toFixed(1); }, 30);   // animate ring
    let n = 0; const step = Math.max(1, Math.round(p / 24));
    const t = setInterval(() => { n += step; if (n >= p) { n = p; clearInterval(t); } txt.textContent = n + '%'; }, 28);
  }

  /* ---- "decipher" reveal: each filled gap scrambles cuneiform then settles ---- */
  const SCRAMBLE = '𒀀𒁀𒂊𒄿𒅔𒆠𒈠𒈾𒉡𒊒𒋫𒌋𒌝𒐊𒃻𒁲';
  function decipherSlots() {
    outEl.querySelectorAll('.gap-slot').forEach((el) => {
      const finalText = el.textContent;
      if (!finalText) return;
      let frame = 0; const frames = 9;
      const iv = setInterval(() => {
        frame++;
        if (frame >= frames) { clearInterval(iv); el.textContent = finalText; el.classList.add('is-revealed'); return; }
        let s = ''; for (let i = 0; i < finalText.length; i++) s += SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
        el.textContent = s;
      }, 45);
    });
  }

  /* ---- load a transliteration string (with gap markers) into the box as tokens ---- */
  function parseInto(str, append) {
    if (!append) tokens = [];
    String(str).trim().split(/\s+/).forEach((p) => {
      const low = p.toLowerCase();
      if (low === '<big_gap>' || low === '[……]' || /^\.{5,}$/.test(p)) addGapToken(true);
      else if (low === '<gap>' || low === '[…]' || low === '...' || low === '…' || /^x+$/.test(low)) addGapToken(false);
      else { if (tokens.length && tokens[tokens.length - 1].t !== ' ') tokens.push({ c: ' ', t: ' ' }); tokens.push({ c: (window.translitToCuneiform ? window.translitToCuneiform(p) : ''), t: p }); }
    });
    caret = tokens.length;
    renderBox();
  }

  const SAMPLES = [
    { label: 'Silver to a merchant', text: '1 ma-na kaspum a-na <gap> a-na-kam' },
    { label: 'Opening of a letter', text: 'a-na <gap> qi-bi-ma' },
    { label: 'He gave …', text: '<big_gap> i-din' },
    { label: 'A tablet of …', text: 'tup-pu-um sza <gap>' }
  ];

  /* ---------- cuneiform keyboard (same signs as the dictionary tool) ---------- */
  function baseReading(k) {
    if (k.label.length === 1 && 'aeiu'.includes(k.label)) return k.label;
    if (k.label === 'ʾ') return 'ʾ';
    return k.label + 'a';
  }
  function makeKey(k) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tr-key';
    b.innerHTML = (k.c ? '<span class="tr-kc">' + k.c + '</span>' : '') +
                  '<span class="tr-kl">' + k.label + '</span>';
    b.addEventListener('click', () => pushSign(k.c || '', baseReading(k)));
    if (k.v && k.v.length) {
      const pop = document.createElement('span'); pop.className = 'tr-pop';
      k.v.forEach(([r, c]) => {
        const vi = document.createElement('button');
        vi.type = 'button'; vi.className = 'tr-pi';
        vi.innerHTML = (c ? '<span class="tr-pc">' + c + '</span>' : '') +
                       '<span class="tr-pr">' + r + '</span>';
        vi.addEventListener('click', (ev) => { ev.stopPropagation(); pushSign(c || '', r); });
        pop.appendChild(vi);
      });
      b.appendChild(pop);
    }
    return b;
  }
  function buildKeyboard() {
    kb.innerHTML = '';
    const keys = window.AKKADIAN_KEYS;
    if (keys && keys.length) keys.forEach((k) => kb.appendChild(makeKey(k)));
    else 'a e i u b d g ḫ k l m n p q r s ṣ š t ṭ w y z'.split(' ')
      .forEach((ch) => kb.appendChild(makeKey({ label: ch, c: '', v: [] })));
    const sp = document.createElement('button');
    sp.type = 'button'; sp.className = 'tr-key tr-key--wide tr-key--util'; sp.textContent = 'Space';
    sp.addEventListener('click', pushSpace); kb.appendChild(sp);
    const bs = document.createElement('button');
    bs.type = 'button'; bs.className = 'tr-key tr-key--util'; bs.textContent = '⌫';
    bs.setAttribute('aria-label', 'Backspace'); bs.addEventListener('click', popSign); kb.appendChild(bs);
  }

  /* keyboard input inserts at the caret; Backspace/Delete remove around it */
  function pushSign(c, t) { tokens.splice(caret, 0, { c: c, t: t }); caret++; renderBox(); if (cuneBox) cuneBox.focus(); }
  function pushSpace() { if (caret > 0 && tokens[caret - 1] && tokens[caret - 1].t !== ' ') { tokens.splice(caret, 0, { c: ' ', t: ' ' }); caret++; renderBox(); } }
  function popSign() { if (caret > 0) { tokens.splice(caret - 1, 1); caret--; renderBox(); if (cuneBox) cuneBox.focus(); } }
  function delForward() { if (caret < tokens.length) { tokens.splice(caret, 1); renderBox(); if (cuneBox) cuneBox.focus(); } }
  function moveCaret(d) { caret = Math.max(0, Math.min(tokens.length, caret + d)); renderBox(); }
  /* append a gap (used when loading a whole fragment / example) */
  function addGapToken(big) {
    if (tokens.length && tokens[tokens.length - 1].t !== ' ') tokens.push({ c: ' ', t: ' ' });
    tokens.push({ gap: true, big: !!big, t: big ? '<big_gap>' : '<gap>', c: big ? '⬚⬚' : '⬚' });
    tokens.push({ c: ' ', t: ' ' });
  }
  /* insert a gap at the caret (toolbar buttons) */
  function insertGap(big) {
    if (caret > 0 && tokens[caret - 1] && tokens[caret - 1].t !== ' ') { tokens.splice(caret, 0, { c: ' ', t: ' ' }); caret++; }
    tokens.splice(caret, 0, { gap: true, big: !!big, t: big ? '<big_gap>' : '<gap>', c: big ? '⬚⬚' : '⬚' }); caret++;
    tokens.splice(caret, 0, { c: ' ', t: ' ' }); caret++;
    renderBox(); if (cuneBox) cuneBox.focus();
  }
  /* click to place the caret at the nearest sign boundary */
  function setCaretFromClick(clientX) {
    const spans = [].slice.call(cuneLine.querySelectorAll('[data-idx]'));
    if (!spans.length) { caret = 0; renderBox(); return; }
    let best = tokens.length, bestDist = Infinity;
    spans.forEach((sp) => {
      const r = sp.getBoundingClientRect(), idx = +sp.dataset.idx;
      let d = Math.abs(clientX - r.left); if (d < bestDist) { bestDist = d; best = idx; }
      d = Math.abs(clientX - r.right); if (d < bestDist) { bestDist = d; best = idx + 1; }
    });
    caret = Math.max(0, Math.min(tokens.length, best));
    renderBox();
  }

  function renderBox() {
    if (caret > tokens.length) caret = tokens.length;
    const parts = []; let si = -1;
    tokens.forEach((tk, idx) => {
      if (idx === caret) parts.push('<span class="tr-caret"></span>');
      if (tk.gap) parts.push('<span class="gap-mark" data-idx="' + idx + '" title="' + (tk.big ? 'big gap' : 'small gap') + '">' + (tk.big ? '⬚⬚' : '⬚') + '</span>');
      else if (tk.t === ' ') parts.push('<span class="tr-space" data-idx="' + idx + '"> </span>');
      else { si++; parts.push('<span class="tr-sign" data-idx="' + idx + '" data-i="' + si + '" title="' + esc(tk.t) + '">' + esc(tk.c || tk.t) + '</span>'); }
    });
    if (caret >= tokens.length) parts.push('<span class="tr-caret"></span>');
    cuneLine.innerHTML = parts.join('');
    translitLine.textContent = tokens.length ? '(' + translit(true) + ')' : '';
    cuneBox.classList.toggle('is-empty', tokens.length === 0);
  }

  /* ---------- speak (voice assistant) + copy ---------- */
  function speakItems() {
    const items = []; let si = -1;
    for (const tk of tokens) {
      if (tk.gap || tk.t === ' ') continue;
      si++;
      items.push({ i: si, read: tk.t });
    }
    return items;
  }
  function gapClearSigns() { cuneLine.querySelectorAll('.tr-sign.is-speaking').forEach((s) => s.classList.remove('is-speaking')); }
  function gapHighlight(i) { gapClearSigns(); const el = cuneLine.querySelector('.tr-sign[data-i="' + i + '"]'); if (el) el.classList.add('is-speaking'); }
  function speak() {
    if (!window.AkkTool || !window.AkkTool.speakSyllables) return;
    const items = speakItems();
    if (!items.length) return;
    if (window.AkkTool.sylEnabled && !window.AkkTool.sylEnabled()) {
      window.AkkTool.speakWord(items.map((x) => x.read).join(' '));
    } else {
      window.AkkTool.speakSyllables(items, gapHighlight, gapClearSigns);
    }
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }
  function flash(btn, msg) { const old = btn.innerHTML; btn.innerHTML = msg; setTimeout(() => { btn.innerHTML = old; }, 1000); }

  /* transliteration: words hyphenated; gaps pretty ([…]) or as tokens (<gap>) */
  function translit(pretty) {
    const out = []; let cur = [];
    const flush = () => { if (cur.length) { out.push(cur.join('-')); cur = []; } };
    for (const tk of tokens) {
      if (tk.gap) { flush(); out.push(pretty ? (tk.big ? '[……]' : '[…]') : (tk.big ? '<big_gap>' : '<gap>')); }
      else if (tk.t === ' ') flush();
      else cur.push(tk.t.trim());
    }
    flush();
    return out.join(' ').trim();
  }

  /* English fill from the model -> Akkadian form via the shared dictionary */
  function engToAkk(en) {
    const look = (window.AkkTool && window.AkkTool.searchEng) ? window.AkkTool.searchEng(en) : [];
    if (look && look.length) return { en: en, t: look[0].t, c: look[0].c || '' };
    return { en: en, t: '', c: '' };
  }

  /* ---------- output ---------- */
  function showMsg(html, cls) {
    outEl.className = 'gap-model-text';
    outEl.innerHTML = '<span class="gap-loading' + (cls ? ' ' + cls : '') + '">' + html + '</span>';
  }
  function renderOut() {
    outEl.className = 'gap-model-text';
    if (showEnglish) {
      resTitle.innerHTML = '&#127760; English translation';
      outEl.textContent = (lastEnglish || '(no output)')
        .replace(/<big_gap>/g, '……').replace(/<gap>/g, '…');
      return;
    }
    resTitle.innerHTML = '&#129513; Reconstructed Akkadian';
    let gi = -1;
    const cune = tokens.map((tk) => {
      if (tk.gap) {
        gi++;
        const f = gapsData[gi] ? gapsData[gi].alts[gapsData[gi].chosen] : null;
        const glyph = (f && f.c) ? f.c : ((f && (f.t || f.en)) ? (f.t || f.en) : (tk.big ? '……' : '…'));
        return '<span class="gap-slot">' + esc(glyph) + '</span>';
      }
      if (tk.t === ' ') return ' ';
      return '<span class="gap-word">' + esc(tk.c) + '</span>';
    }).join('');
    gi = -1;
    const tl = []; let cur = [];
    const flush = () => { if (cur.length) { tl.push(cur.join('-')); cur = []; } };
    for (const tk of tokens) {
      if (tk.gap) { flush(); gi++; const f = gapsData[gi] ? gapsData[gi].alts[gapsData[gi].chosen] : null;
        tl.push('[' + ((f && f.t) ? f.t : (f && f.en ? f.en : '…')) + ']'); }
      else if (tk.t === ' ') flush();
      else cur.push(tk.t.trim());
    }
    flush();
    outEl.innerHTML = '<div class="gap-akk-cune">' + cune + '</div>' +
                      '<div class="gap-akk-translit">(' + esc(tl.join(' ')) + ')</div>';
    decipherSlots();   // animate the filled gaps "resolving" into place
  }

  function renderFills() {
    fillsEl.innerHTML = '';
    if (!gapsData.length) {
      fillsEl.innerHTML = '<p class="gap-none">No gaps in this fragment — add a small or big gap, then reconstruct.</p>';
      return;
    }
    gapsData.forEach((g, gi) => {
      const wrap = document.createElement('div'); wrap.className = 'gap-fill';
      wrap.innerHTML =
        '<div class="gap-fill-head"><span class="gap-fill-n">Gap ' + (gi + 1) + '</span></div>' +
        '<div class="gap-alts">' +
        g.alts.map((a, ai) =>
          '<button type="button" class="gap-alt' + (ai === g.chosen ? ' is-on' : '') +
          '" data-gi="' + gi + '" data-ai="' + ai + '">' +
          (a.c ? '<span class="gap-alt-cune">' + a.c + '</span>' : '') +
          '<span class="gap-alt-tok">' + esc(a.t || a.en) + '</span>' +
          (a.t && a.en ? '<span class="gap-alt-en">' + esc(a.en) + '</span>' : '') +
          '<span class="gap-alt-conf ' + confClass(a.conf) + '">' + pct(a.conf) + '</span>' +
          '</button>'
        ).join('') +
        '</div>';
      fillsEl.appendChild(wrap);
    });
    fillsEl.querySelectorAll('.gap-alt').forEach((b) => {
      b.addEventListener('click', () => {
        const gi = Number(b.dataset.gi), ai = Number(b.dataset.ai);
        gapsData[gi].chosen = ai;
        b.parentElement.querySelectorAll('.gap-alt').forEach((x) => x.classList.toggle('is-on', x === b));
        if (!showEnglish) renderOut();
      });
    });
  }

  async function run() {
    const prompt = translit(false);
    if (!prompt) { if (cuneBox) cuneBox.focus(); return; }
    warmDict();
    resBox.hidden = false; fillsBlock.hidden = true; swapBtn.hidden = true;
    if (gaugeEl) gaugeEl.hidden = true;
    modelEl.textContent = '';
    resTitle.innerHTML = '&#129513; Reconstructed Akkadian';
    showMsg('Reconstructing the gaps with the AI model…');
    runBtn.disabled = true;
    const t0 = performance.now();
    try {
      const res = await fetch(AI_BASE + '/api/reconstruct', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt })
      });
      const data = await res.json();
      lastEnglish = data.reconstructedText || '';
      const seq = Array.isArray(data.tokens) ? data.tokens : [];
      gapsData = seq.filter((t) => t && t.isMissing).map((t) => {
        const altsEn = (Array.isArray(t.alternatives) && t.alternatives.length)
          ? t.alternatives : [{ token: t.token, confidence: t.confidence }];
        return {
          alts: altsEn.map((a) => { const m = engToAkk(a.token); return { en: a.token, t: m.t, c: m.c, conf: a.confidence }; }),
          chosen: 0
        };
      });
      modelEl.textContent = data.modelUsed ? ('· ' + data.modelUsed) : '';
      const conf = (typeof data.globalConfidence === 'number') ? Math.round(data.globalConfidence * 100) : null;
      showEnglish = false;
      renderOut();
      renderFills();
      fillsBlock.hidden = false;
      swapBtn.hidden = false;
      if (conf != null) renderGauge(conf); else if (gaugeEl) gaugeEl.hidden = true;
      const ms = data.inferenceTimeMs != null ? data.inferenceTimeMs : Math.round(performance.now() - t0);
      log('AI', 'reconstruct', 'prompt="' + prompt + '"; model=' + (data.modelUsed || '?') +
        '; confidence=' + (conf != null ? conf + '%' : 'n/a') + '; gaps=' + gapsData.length +
        '; ms=' + ms + '; english="' + (lastEnglish || '').slice(0, 80) + '"');
    } catch (err) {
      gapsData = []; lastEnglish = ''; fillsBlock.hidden = true; swapBtn.hidden = true;
      if (gaugeEl) gaugeEl.hidden = true;
      modelEl.textContent = 'offline';
      showMsg('AI backend is offline. Start it with:\n' +
        'python innoverse_pipeline_final.py --serve ' +
        '--model-path models/model_1 --model-path models/model_2 --model-path models/model_3', 'gap-off');
      log('AI', 'reconstruct-offline', 'prompt="' + prompt + '"; server not reachable at ' + (AI_BASE || 'same-origin'));
    } finally {
      runBtn.disabled = false;
    }
  }

  /* canned example: 1 ma-na <gap> a-na  (real cuneiform signs) */
  const EXAMPLE = [
    { c: '𒁹', t: '1' }, { c: ' ', t: ' ' },
    { c: '𒈠', t: 'ma' }, { c: '𒈾', t: 'na' }, { c: ' ', t: ' ' },
    { gap: true, big: false, t: '<gap>', c: '⬚' }, { c: ' ', t: ' ' },
    { c: '𒀀', t: 'a' }, { c: '𒈾', t: 'na' }
  ];

  function reset() {
    tokens = []; caret = 0; gapsData = []; lastEnglish = ''; showEnglish = false;
    renderBox(); resBox.hidden = true; swapBtn.hidden = true;
    if (gaugeEl) gaugeEl.hidden = true;
  }

  buildKeyboard();
  renderBox();

  /* one-click demo + sample gallery */
  if (demoBtn) demoBtn.addEventListener('click', () => {
    parseInto('1 ma-na kaspum a-na <gap> a-na-kam'); warmDict();
    log('Gap', 'demo-run', 'flagship broken-tablet demo'); run();
  });
  if (samplesEl) SAMPLES.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'gap-sample'; b.textContent = s.label; b.title = s.text;
    b.addEventListener('click', () => { parseInto(s.text); warmDict(); if (cuneBox) cuneBox.focus(); log('Gap', 'sample-loaded', s.label + ' :: ' + s.text); });
    samplesEl.appendChild(b);
  });

  insSmall.addEventListener('click', () => insertGap(false));
  insBig.addEventListener('click', () => insertGap(true));
  exBtn.addEventListener('click', () => { tokens = EXAMPLE.map((t) => Object.assign({}, t)); caret = tokens.length; warmDict(); renderBox(); if (cuneBox) cuneBox.focus(); });
  clearBtn.addEventListener('click', () => { reset(); if (cuneBox) cuneBox.focus(); });
  swapBtn.addEventListener('click', () => { showEnglish = !showEnglish; renderOut(); log('Gap', 'swap-view', showEnglish ? 'show English translation' : 'show reconstructed Akkadian'); });
  runBtn.addEventListener('click', run);
  if (speakBtn) speakBtn.addEventListener('click', () => { const t = translit(true); speak(); if (t) log('Voice', 'speak', 'gap fragment: ' + t); });
  if (copyBtn) copyBtn.addEventListener('click', () => { const t = translit(true); if (t) { copyText(t); flash(copyBtn, 'Copied!'); log('Gap', 'copy', t); } });
  if (cuneBox) {
    cuneBox.addEventListener('focus', warmDict);
    cuneBox.addEventListener('click', (e) => { setCaretFromClick(e.clientX); cuneBox.focus(); });
    cuneBox.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') { e.preventDefault(); popSign(); }
      else if (e.key === 'Delete') { e.preventDefault(); delForward(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); moveCaret(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); moveCaret(1); }
      else if (e.key === 'Home') { e.preventDefault(); caret = 0; renderBox(); }
      else if (e.key === 'End') { e.preventDefault(); caret = tokens.length; renderBox(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    });
    /* paste transliteration (with optional gap markers) -> tokens */
    cuneBox.addEventListener('paste', (e) => {
      e.preventDefault();
      const cd = e.clipboardData || window.clipboardData;
      const text = cd ? cd.getData('text') : '';
      if (!text || !text.trim()) return;
      parseInto(text, true); warmDict();
      log('Gap', 'paste', text.trim().slice(0, 80));
    });
  }
})();

/* =========================================================
   MASTERS OF AKKADIAN
   Each scholar card carries a hidden .master-detail. Clicking (or
   Enter/Space on) a card fades in a full-screen profile sheet built
   from that detail; the ✕, a background click, or Esc closes it.
   ========================================================= */
(function () {
  const overlay = document.getElementById('masterOverlay');
  if (!overlay) return;
  const body = document.getElementById('masterOverlayBody');
  const closeBtn = overlay.querySelector('.master-overlay-close');
  const html = document.documentElement;
  let fadeTimer = null;

  function open(card) {
    const detail = card.querySelector('.master-detail');
    if (!detail) return;
    clearTimeout(fadeTimer);
    body.innerHTML = detail.innerHTML;
    overlay.hidden = false;
    html.style.overflow = 'hidden';                 // lock the page behind the sheet
    overlay.scrollTop = 0;
    setTimeout(() => overlay.classList.add('is-open'), 15);   // fade in (robust even when tab is backgrounded)
    if (window.AkkLog) {
      const t = (card.querySelector('.master-name, h3') || {}).textContent || 'profile';
      window.AkkLog.log(card.classList.contains('about-card') ? 'About' : 'Masters', 'open-profile', t.trim());
    }
  }
  function close() {
    overlay.classList.remove('is-open');            // fade out
    html.style.overflow = '';
    fadeTimer = setTimeout(() => { overlay.hidden = true; body.innerHTML = ''; }, 360);
  }

  document.querySelectorAll('.master-card, .about-card').forEach((card) => {
    card.addEventListener('click', () => open(card));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(card); }
    });
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) close(); });
})();

/* =========================================================
   TOP-NAV ROUTING  (Home / About / AI Engine / Support Us)
   Each nav item swaps the whole view: opening a section HIDES the main
   view (hero + accordion + panels) and shows only that section from the
   top — sections never stack under the main content. Home restores the
   main view in place (no reload, so the intro splash is not replayed).
   ========================================================= */
(function () {
  const siteNav = document.querySelector('.site-nav');
  const sections = document.querySelectorAll('.nav-section');
  const mainView = document.querySelectorAll('.hero-title, .hero-accordion, .panel-details');

  function showMain(show) { mainView.forEach((s) => s.classList.toggle('is-hidden', !show)); }

  function showSection(id) {
    showMain(false);                                          // hide the main view (no stacking)
    sections.forEach((s) => s.classList.toggle('is-open', s.id === id));
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (window.AkkLog) window.AkkLog.log('Nav', 'open-section', id);
  }

  function goHome() {
    sections.forEach((s) => s.classList.remove('is-open'));   // close any open section
    showMain(true);                                           // bring the main view back
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  document.querySelectorAll('.nav-list a[data-nav]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const which = a.dataset.nav;
      if (siteNav) siteNav.classList.remove('is-open');       // close mobile menu
      e.preventDefault();
      if (which === 'home') { goHome(); return; }             // no reload -> intro is not replayed
      showSection(which);
    });
  });

  /* ---------- Support form -> sends the email DIRECTLY (no email app) ----------
     Uses the free Web3Forms relay so a static site can send mail. The destination
     address is NOT in this page — it is tied to the access key on Web3Forms' side.
     >>> Paste your free access key from https://web3forms.com below. <<< */
  const WEB3FORMS_KEY = '0657071a-70c5-4db7-96c7-a491e114f9ae';

  const form = document.getElementById('supportForm');
  const statusEl = document.getElementById('sfStatus');
  const sendBtn = document.getElementById('sfSend');
  function setStatus(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'sf-status' + (kind ? ' ' + kind : '');
  }
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = (document.getElementById('sfName').value || '').trim();
      const email = (document.getElementById('sfEmail').value || '').trim();
      const msg = (document.getElementById('sfMsg').value || '').trim();
      if (!email) { document.getElementById('sfEmail').focus(); setStatus('Please add your email so we can reply.', 'err'); return; }
      if (!msg) { document.getElementById('sfMsg').focus(); setStatus('Please write a message.', 'err'); return; }
      if (WEB3FORMS_KEY === 'YOUR_WEB3FORMS_ACCESS_KEY') {
        setStatus('Sending is not set up yet — a Web3Forms access key is needed.', 'err');
        return;
      }
      setStatus('Sending…', '');
      if (sendBtn) sendBtn.disabled = true;
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            subject: 'Support message — Akkadian Encyclopedia',
            from_name: name || 'Site visitor',
            name: name,
            email: email,
            message: msg
          })
        });
        const data = await res.json();
        if (data.success) { setStatus('Message sent — thank you!', 'ok'); form.reset(); }
        else { setStatus('Could not send: ' + (data.message || 'unknown error'), 'err'); }
      } catch (err) {
        setStatus('Network error — please try again.', 'err');
      } finally {
        if (sendBtn) sendBtn.disabled = false;
      }
    });
  }
})();
