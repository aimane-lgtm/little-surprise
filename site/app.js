/* Little Surprise: landing page, builder and gift viewer in one file.
   Routes (all in the URL hash, so nothing ever reaches a server):
     #            landing page
     #create      builder
     #demo        the sample gift, full screen
     #g=<code>    a gift; <code> is the compressed gift data */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const app = $('#app');

  const THEMES = {
    strawberry: { name: 'Strawberry Milk', bg: '#F5D5E1', bg2: '#FCEFF4', card: '#FFF8FB', ink: '#B12E5C', sub: '#80505F', accent: '#E0457A', onAccent: '#FFFFFF', paper: '#FFFDFE', letterInk: '#5E3443', letterHead: '#B12E5C', rule: 'rgba(224,69,122,.14)' },
    blue: { name: 'Sweet Blue', bg: '#D3E4F7', bg2: '#F1F7FD', card: '#FAFCFF', ink: '#2D5E98', sub: '#56708F', accent: '#4A86CB', onAccent: '#FFFFFF', paper: '#FFFFFF', letterInk: '#33475F', letterHead: '#2D5E98', rule: 'rgba(74,134,203,.15)' },
    matcha: { name: 'Matcha Picnic', bg: '#DCE9CB', bg2: '#F5F9EE', card: '#FCFEF8', ink: '#4A6A2D', sub: '#64744F', accent: '#6F9A45', onAccent: '#FFFFFF', paper: '#FFFFFB', letterInk: '#3E4A33', letterHead: '#4A6A2D', rule: 'rgba(111,154,69,.18)' },
    midnight: { name: 'Midnight Letter', bg: '#121933', bg2: '#2A3260', card: '#1C2446', ink: '#F2D49A', sub: '#B8C1E2', accent: '#E6B45A', onAccent: '#1C1606', paper: '#FBF6EA', letterInk: '#3B3322', letterHead: '#8A5A12', rule: 'rgba(160,120,40,.17)' },
  };

  const SAMPLE = {
    theme: 'strawberry',
    mascot: 'cat',
    noMode: 'plead',
    ask: 'I made you a surprise, my love',
    sub: 'would you like to see it?',
    yes: 'yes baby',
    no: 'no thanks',
    plead: "I promise you'll like it",
    pleadSub: 'i made it only for you',
    retry: 'another chance',
    title: 'Happy monthsary, my love!',
    letter: "Seven months with you and I still get excited when your name lights up my phone.\n\nThank you for the late-night calls, the terrible puns, and for holding my hand when the week gets heavy. You make ordinary days feel like ones I want to remember.\n\nI can't wait for every month after this one.",
    sign: 'Yours always, Sam',
    stripLabel: '08 . 01 . 25',
    photos: [],
  };
  const TEXT_KEYS = Object.keys(SAMPLE).filter((k) => k !== 'photos');
  const MAX_PHOTOS = 4;

  const isImg = (s) => typeof s === 'string' && s.length < 200000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s);

  function normalize(raw) {
    const d = { ...SAMPLE, photos: [] };
    for (const k of TEXT_KEYS) {
      if (typeof raw?.[k] === 'string') d[k] = raw[k].slice(0, k === 'letter' ? 6000 : 200);
    }
    if (!THEMES[d.theme]) d.theme = 'strawberry';
    if (!['cat', 'bear', 'none'].includes(d.mascot)) d.mascot = 'cat';
    if (!['plead', 'runaway'].includes(d.noMode)) d.noMode = 'plead';
    if (Array.isArray(raw?.photos)) d.photos = raw.photos.filter(isImg).slice(0, MAX_PHOTOS);
    return d;
  }

  /* ---------- Storage (per-browser draft only) ---------- */
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  };
  let draft = normalize(store.get('ls-draft') || SAMPLE);
  const saveDraft = () => store.set('ls-draft', draft);

  /* ---------- Link encoding: JSON -> deflate -> base64url ---------- */
  const b64u = {
    enc(bytes) {
      let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    dec(str) {
      str = str.replace(/-/g, '+').replace(/_/g, '/');
      while (str.length % 4) str += '=';
      const bin = atob(str);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    },
  };
  const canZip = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';
  const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

  async function encodeGift(data) {
    const json = new TextEncoder().encode(JSON.stringify(data));
    if (canZip) return 'z' + b64u.enc(await pipe(json, new CompressionStream('deflate')));
    return 'j' + b64u.enc(json);
  }
  async function decodeGift(code) {
    const kind = code[0];
    let bytes = b64u.dec(decodeURIComponent(code.slice(1)));
    if (kind === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate'));
    else if (kind !== 'j') throw new Error('Unknown link format');
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  const homeURL = () => location.href.split('#')[0];

  /* ---------- Mascot (original drawing: round cat or bear hugging a heart) ---------- */
  function mascotSVG(kind = 'cat', mood = 'happy') {
    if (kind === 'none') return '';
    const bear = kind === 'bear';
    const sad = mood === 'sad';
    const fur = bear ? '#D9A77C' : '#FFFFFF';
    const line = bear ? '#7A4E2F' : '#4B3A41';
    const inner = bear ? '#F1C9A5' : '#F6B9C8';
    const st = `stroke="${line}" stroke-width="2.5" stroke-linejoin="round"`;
    const ears = bear
      ? `<circle cx="30" cy="32" r="13" fill="${fur}" ${st}/><circle cx="90" cy="32" r="13" fill="${fur}" ${st}/><circle cx="30" cy="32" r="6" fill="${inner}"/><circle cx="90" cy="32" r="6" fill="${inner}"/>`
      : `<path d="M24 50 L28 14 L54 32 Z" fill="${fur}" ${st}/><path d="M96 50 L92 14 L66 32 Z" fill="${fur}" ${st}/><path d="M31 38 L32 24 L44 32 Z" fill="${inner}"/><path d="M89 38 L88 24 L76 32 Z" fill="${inner}"/>`;
    const eyes = sad
      ? `<path d="M39 56 q6 -5 12 0" fill="none" stroke="#2B2026" stroke-width="3" stroke-linecap="round"/><path d="M69 56 q6 -5 12 0" fill="none" stroke="#2B2026" stroke-width="3" stroke-linecap="round"/><path d="M44 61 q-3.5 6 0 8.5 q3.5 -2.5 0 -8.5z" fill="#86C3F7"/>`
      : `<ellipse cx="45" cy="56" rx="3.7" ry="4.3" fill="#2B2026"/><ellipse cx="75" cy="56" rx="3.7" ry="4.3" fill="#2B2026"/><circle cx="46.4" cy="54.5" r="1.3" fill="#FFFFFF"/><circle cx="76.4" cy="54.5" r="1.3" fill="#FFFFFF"/>`;
    const my = bear ? 4 : 0;
    const nose = bear ? `<ellipse cx="60" cy="62" rx="4.2" ry="3" fill="${line}"/>` : '';
    const mouth = sad
      ? `<path d="M55 ${70 + my} q5 -4 10 0" fill="none" stroke="${line}" stroke-width="2.4" stroke-linecap="round"/>`
      : `<path d="M54 ${64 + my} q3 3.5 6 0 q3 3.5 6 0" fill="none" stroke="${line}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    const heart = sad
      ? `<path d="M96 116 C88 110 88 103 92 103 C94 103 96 105 96 106 C96 105 98 103 100 103 C104 103 104 110 96 116Z" fill="#E8344E" opacity=".6"/>`
      : `<path d="M60 116 C40 103 40 86 51 86 C56 86 60 90 60 93 C60 90 64 86 69 86 C80 86 80 103 60 116Z" fill="#E8344E" stroke="#B11E38" stroke-width="2" stroke-linejoin="round"/>`;
    const paws = sad
      ? `<ellipse cx="48" cy="102" rx="7" ry="5" fill="${fur}" stroke="${line}" stroke-width="2.2"/><ellipse cx="72" cy="102" rx="7" ry="5" fill="${fur}" stroke="${line}" stroke-width="2.2"/>`
      : `<ellipse cx="44" cy="97" rx="7.5" ry="5.5" fill="${fur}" stroke="${line}" stroke-width="2.2"/><ellipse cx="76" cy="97" rx="7.5" ry="5.5" fill="${fur}" stroke="${line}" stroke-width="2.2"/>`;
    return `<svg class="g-mascot" viewBox="0 0 120 122" aria-hidden="true">${ears}<ellipse cx="60" cy="100" rx="31" ry="17" fill="${fur}" ${st}/><ellipse cx="60" cy="58" rx="41" ry="32" fill="${fur}" ${st}/><ellipse cx="37" cy="67" rx="6.5" ry="3.8" fill="#F7A3B7" opacity=".85"/><ellipse cx="83" cy="67" rx="6.5" ry="3.8" fill="#F7A3B7" opacity=".85"/>${eyes}${nose}${mouth}${heart}${paws}</svg>`;
  }

  const giftVars = (t) => `--g-bg:${t.bg};--g-bg2:${t.bg2};--g-card:${t.card};--g-ink:${t.ink};--g-sub:${t.sub};--g-accent:${t.accent};--g-on-accent:${t.onAccent};--g-paper:${t.paper};--g-letter-ink:${t.letterInk};--g-letter-head:${t.letterHead};--g-rule:${t.rule}`;

  /* ---------- Gift viewer ---------- */
  // opts: full (own page), placeholders (show sample frames when no photos), start (screen), onScreen(cb)
  function renderGift(root, data, opts = {}) {
    const d = normalize(data);
    const t = THEMES[d.theme];
    root.innerHTML = `<div class="gift${opts.full ? ' full' : ''}" style="${giftVars(t)}">
      <div class="g-fx" aria-hidden="true"></div>
      <div class="g-stage" aria-live="polite"></div>
      ${opts.full ? `<a class="g-made" href="${esc(homeURL())}">make your own little surprise ♡</a>` : ''}
    </div>`;
    const g = root.firstElementChild;
    const stage = $('.g-stage', g);
    const fx = $('.g-fx', g);
    let dodges = 0;

    const screens = {
      ask: () => `<section class="g-screen"><div class="g-card">
          ${mascotSVG(d.mascot, 'happy')}
          <h2 class="g-title">${esc(d.ask)}</h2>
          ${d.sub ? `<p class="g-sub">${esc(d.sub)}</p>` : ''}
          <div class="g-btns">
            <button type="button" class="g-btn primary" data-act="yes">${esc(d.yes || 'yes')}</button>
            <button type="button" class="g-btn" data-act="no">${esc(d.no || 'no')}</button>
          </div></div></section>`,
      plead: () => `<section class="g-screen"><div class="g-card">
          ${mascotSVG(d.mascot, 'sad')}
          <h2 class="g-title">${esc(d.plead)}</h2>
          ${d.pleadSub ? `<p class="g-sub">${esc(d.pleadSub)}</p>` : ''}
          <div class="g-btns"><button type="button" class="g-btn primary" data-act="retry">${esc(d.retry || 'try again')}</button></div>
          </div></section>`,
      letter: () => {
        const photos = d.photos;
        const strip = photos.length || opts.placeholders;
        const frames = photos.length
          ? photos.map((p, i) => `<img class="g-frame" src="${p}" alt="Photo ${i + 1}">`).join('')
          : '<span class="g-frame g-frame-ph">♥</span>'.repeat(3);
        return `<section class="g-screen g-letter-screen">
          <article class="g-letter${strip ? '' : ' no-strip'}">
            ${strip ? `<div class="g-strip">${frames}${d.stripLabel ? `<span class="g-strip-label">${esc(d.stripLabel)}</span>` : ''}</div>` : ''}
            <div class="g-text">
              <h2 class="g-head">${esc(d.title)}</h2>
              <p class="g-body">${esc(d.letter)}</p>
              ${d.sign ? `<p class="g-sign">${esc(d.sign)}</p>` : ''}
            </div>
          </article>
          <button type="button" class="g-replay" data-act="replay">read it from the start again</button>
        </section>`;
      },
    };

    function show(name) {
      stage.innerHTML = screens[name]();
      dodges = 0;
      if (name === 'ask' && d.noMode === 'runaway') armRunaway();
      if (opts.full) (root.closest('.overlay') || document.scrollingElement).scrollTop = 0;
      else if (root.scrollTop) root.scrollTop = 0;
      opts.onScreen?.(name);
    }

    function armRunaway() {
      const no = $('[data-act="no"]', stage);
      no.classList.add('dodging');
      no.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') dodge(no); });
    }

    function dodge(btn) {
      dodges++;
      const box = g.getBoundingClientRect();
      const r = btn.getBoundingClientRect();
      const off = btn._off || { x: 0, y: 0 };
      const baseX = r.left - off.x, baseY = r.top - off.y;
      const pad = 14;
      const visibleH = Math.min(box.height, innerHeight - Math.max(box.top, 0));
      const maxX = Math.max(0, box.width - r.width - pad * 2);
      const maxY = Math.max(0, visibleH - r.height - pad * 2);
      let nx, ny, tries = 0;
      do {
        nx = box.left + pad + Math.random() * maxX;
        ny = Math.max(box.top, 0) + pad + Math.random() * maxY;
      } while (++tries < 10 && Math.hypot(nx - r.left, ny - r.top) < 130);
      btn._off = { x: nx - baseX, y: ny - baseY };
      btn.style.transform = `translate(${btn._off.x}px, ${btn._off.y}px)`;
      const yes = $('[data-act="yes"]', stage);
      if (yes) yes.style.transform = `scale(${Math.min(1 + dodges * 0.1, 1.7)})`;
    }

    stage.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'yes') { burst(fx); show('letter'); }
      else if (act === 'no') { if (d.noMode === 'runaway') dodge(b); else show('plead'); }
      else show('ask');
    });

    show(screens[opts.start] ? (opts.start === 'plead' && d.noMode === 'runaway' ? 'ask' : opts.start) : 'ask');
    return g;
  }

  function burst(fx) {
    if (reduced) return;
    for (let i = 0; i < 26; i++) {
      const h = document.createElement('span');
      h.className = 'g-heart';
      h.textContent = '♥';
      h.style.left = 6 + Math.random() * 88 + '%';
      h.style.fontSize = 14 + Math.random() * 26 + 'px';
      h.style.setProperty('--dx', Math.random() * 120 - 60 + 'px');
      h.style.setProperty('--rot', Math.random() * 80 - 40 + 'deg');
      h.style.animationDelay = Math.random() * 0.5 + 's';
      fx.append(h);
      setTimeout(() => h.remove(), 2900);
    }
  }

  /* ---------- Shared chrome ---------- */
  const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" style="fill:var(--accent)"/><path d="M16 24 C8 18.5 8 11 12.5 11 C14.6 11 16 12.6 16 14 C16 12.6 17.4 11 19.5 11 C24 11 24 18.5 16 24Z" style="fill:var(--paper)"/></svg>`;
  const nav = (onBuilder) => `<header class="nav"><div class="wrap nav-in">
      <a class="logo" href="#">${LOGO}Little Surprise</a>
      ${onBuilder ? '' : `<nav class="nav-links" aria-label="Sections"><a href="#how">How it works</a><a href="#themes">Themes</a><a href="#pricing">Pricing</a></nav>`}
      <a class="btn ${onBuilder ? 'ghost' : 'primary'} small nav-cta" href="${onBuilder ? '#' : '#create'}">${onBuilder ? 'Back to home' : 'Make yours'}</a>
    </div></header>`;

  function resetBody() {
    document.body.className = '';
    document.body.style.background = '';
  }

  /* ---------- Landing ---------- */
  const OCCASIONS = ['Monthsaries & anniversaries', 'Birthdays', "Valentine's Day", 'Long-distance days', 'Saying sorry', 'Just because', 'Girlfriend & boyfriend day', 'Holidays', 'Celebrating a win'];

  function renderLanding() {
    view = 'landing';
    resetBody();
    document.title = 'Little Surprise';
    const themeCards = Object.entries(THEMES).map(([k, t]) => `
      <article class="theme-card">
        <div class="theme-swatch" style="${giftVars(t)}"><div>
          ${mascotSVG('cat', 'happy')}
          <p class="ts-title">I made you a surprise</p>
          <div class="ts-btns"><span class="g-btn sm primary">yes</span><span class="g-btn sm">no</span></div>
        </div></div>
        <div class="theme-meta"><h3>${t.name}</h3><button type="button" class="btn ghost small" data-use-theme="${k}">Use this look</button></div>
      </article>`).join('');

    app.innerHTML = `${nav(false)}
    <main>
      <section class="hero"><div class="wrap hero-grid">
        <div>
          <p class="eyebrow">for monthsaries, birthdays and sorry-I-was-grumpy days</p>
          <h1 class="display">Send a love letter they have to say <em>yes</em> to.</h1>
          <p class="lede">Little Surprise turns your message into a tiny website. It asks if they want to see your surprise, begs a little if they press no, then opens your letter and photo strip. No Canva, no app, just one link you send in chat.</p>
          <div class="cta-row">
            <a class="btn primary" href="#create">Make yours, it's free</a>
            <a class="btn ghost" href="#demo">Open the sample full screen</a>
          </div>
          <ul class="hero-facts"><li>Ready in about 3 minutes</li><li>Works on any phone</li><li>Nothing is uploaded</li></ul>
        </div>
        <div class="hero-stage">
          <div class="device" id="hero-device"></div>
          <p class="sticky-note">go on, try pressing no</p>
        </div>
      </div></section>

      <section class="section" id="how"><div class="wrap">
        <h2>Three steps, then you hit send</h2>
        <p class="intro">Template shops sell this as a Canva file you edit on a laptop and publish yourself. Here you type into a form and the site builds itself while you watch.</p>
        <ol class="steps">
          <li><div class="step-n">1</div><h3>Pick a look</h3><p>Four hand-tuned themes and a mascot to hold the heart. Decide if the "no" button begs or runs away.</p></li>
          <li><div class="step-n">2</div><h3>Write it your way</h3><p>Change every line: the question, the pleading screen, the letter, the signature. Add up to four photobooth pictures.</p></li>
          <li><div class="step-n">3</div><h3>Send one link</h3><p>Copy it into WhatsApp, iMessage or Instagram. It opens straight away, no account needed on their side.</p></li>
        </ol>
      </div></section>

      <section class="section" id="themes"><div class="wrap">
        <h2>Four looks to start from</h2>
        <p class="intro">Each theme changes the colors of the question screen, the buttons and the letter paper.</p>
        <div class="theme-grid">${themeCards}</div>
      </div></section>

      <section class="section" id="occasions"><div class="wrap">
        <h2>Good for any day that needs a little extra</h2>
        <p class="intro">Swap "Happy monthsary" for whatever the day is about.</p>
        <ul class="chips">${OCCASIONS.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
      </div></section>

      <section class="section" id="pricing"><div class="wrap">
        <h2>Free while we're in beta</h2>
        <p class="intro">The full surprise is free to make and send. Paid extras are planned for people who want a keepsake.</p>
        <div class="price-grid">
          <div class="price featured">
            <div class="price-top"><h3>Little</h3><span class="badge">Available now</span></div>
            <p class="amount">$0</p>
            <ul><li>All four themes and mascots</li><li>Question, pleading screen and letter</li><li>Photo strip with up to 4 pictures</li><li>A link that never expires</li></ul>
            <a class="btn primary" href="#create">Make yours</a>
          </div>
          <div class="price">
            <div class="price-top"><h3>Keepsake</h3><span class="badge">Planned</span></div>
            <p class="amount">$4 <small>one-time, per gift</small></p>
            <ul><li>Short link with their name in it</li><li>Background song that starts on "yes"</li><li>A notification when they open it</li><li>Extra pages: reasons I love you, our timeline</li></ul>
            <a class="btn ghost" href="#create">Start with the free version</a>
          </div>
        </div>
      </div></section>
    </main>
    <footer class="footer"><div class="wrap footer-in">
      <span>Little Surprise</span>
      <span>Your words and photos live inside the link itself. We never store them.</span>
    </div></footer>`;

    renderGift($('#hero-device'), SAMPLE, { placeholders: true });
    $$('[data-use-theme]').forEach((b) => b.addEventListener('click', () => {
      draft.theme = b.dataset.useTheme;
      saveDraft();
      location.hash = '#create';
    }));
  }

  /* ---------- Builder ---------- */
  let previewScreen = 'ask';
  let device = store.get('ls-device') === 'desktop' ? 'desktop' : 'phone';

  const field = (key, label, o = {}) => `<div class="field">
      <label for="f-${key}">${label}</label>
      ${o.area
        ? `<textarea id="f-${key}" data-key="${key}" rows="9" maxlength="6000">${esc(draft[key])}</textarea>`
        : `<input type="text" id="f-${key}" data-key="${key}" value="${esc(draft[key])}" maxlength="${o.max || 120}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}>`}
      ${o.hint ? `<span class="hint">${o.hint}</span>` : ''}
    </div>`;

  const radio = (name, value, inner) => `<label class="opt"><input type="radio" name="${name}" value="${value}"${draft[name] === value ? ' checked' : ''}><span>${inner}</span></label>`;

  function renderBuilder() {
    view = 'builder';
    resetBody();
    document.title = 'Make your surprise · Little Surprise';
    previewScreen = 'ask';

    app.innerHTML = `${nav(true)}
    <main class="b-page"><div class="wrap">
      <div class="b-head">
        <h1>Make your surprise</h1>
        <p>Your draft is kept in this browser while you edit. Press the buttons in the preview to try it.</p>
      </div>
      <div class="builder">
        <form class="b-form" id="b-form" autocomplete="off" novalidate>
          <fieldset data-screen="ask">
            <legend>Look</legend>
            <div class="field"><span class="field-label" id="lbl-theme">Theme</span>
              <div class="opts" role="radiogroup" aria-labelledby="lbl-theme">
                ${Object.entries(THEMES).map(([k, t]) => radio('theme', k, `<i class="swatch" style="${giftVars(t)}"></i>${t.name}`)).join('')}
              </div></div>
            <div class="field"><span class="field-label" id="lbl-mascot">Mascot</span>
              <div class="opts three" role="radiogroup" aria-labelledby="lbl-mascot">
                ${radio('mascot', 'cat', `${mascotSVG('cat')}Kitty`)}
                ${radio('mascot', 'bear', `${mascotSVG('bear')}Bear`)}
                ${radio('mascot', 'none', `<i class="opt-none">–</i>No mascot`)}
              </div></div>
            <div class="field"><span class="field-label" id="lbl-no">When they press "no"</span>
              <div class="opts two" role="radiogroup" aria-labelledby="lbl-no">
                ${radio('noMode', 'plead', `Ask again nicely<small>shows a pleading screen</small>`)}
                ${radio('noMode', 'runaway', `The button runs away<small>and "yes" keeps growing</small>`)}
              </div></div>
          </fieldset>

          <fieldset data-screen="ask">
            <legend>The question</legend>
            ${field('ask', 'Big line', { ph: 'I made you a surprise' })}
            ${field('sub', 'Small line under it')}
            <div class="row2">${field('yes', 'Yes button', { max: 30 })}${field('no', 'No button', { max: 30 })}</div>
          </fieldset>

          <fieldset data-screen="plead" id="fs-plead">
            <legend>If they press "no"</legend>
            <p class="fs-note" id="plead-note" hidden>Not used: you chose the runaway button.</p>
            ${field('plead', 'Big line')}
            ${field('pleadSub', 'Small line under it')}
            ${field('retry', 'Button', { max: 30 })}
          </fieldset>

          <fieldset data-screen="letter">
            <legend>Your letter</legend>
            ${field('title', 'Heading')}
            ${field('letter', 'Letter', { area: true, hint: 'Line breaks are kept. Blank lines make new paragraphs.' })}
            ${field('sign', 'Signed', { ph: 'Love, me' })}
          </fieldset>

          <fieldset data-screen="letter">
            <legend>Photo strip</legend>
            <div class="ph-grid" id="ph-grid"></div>
            <div class="ph-actions">
              <button type="button" class="btn ghost small" id="ph-add">Add photos</button>
              <input type="file" id="f-photos" accept="image/*" multiple class="sr-only" tabindex="-1" aria-hidden="true">
              <span class="hint small muted">Up to ${MAX_PHOTOS}. They're shrunk to small prints so they fit inside the link.</span>
            </div>
            ${field('stripLabel', 'Date on the strip', { max: 24, ph: '08 . 01 . 25' })}
          </fieldset>

          <div class="b-actions">
            <button type="submit" class="btn primary">Create my link</button>
            <button type="button" class="btn ghost" id="b-full">Preview full screen</button>
            <button type="button" class="btn text" id="b-reset">Reset to sample</button>
          </div>

          <div class="b-result" id="b-result" hidden>
            <h2>Your link is ready</h2>
            <div class="b-link-row">
              <input id="b-link" type="text" readonly aria-label="Your gift link">
              <button type="button" class="btn primary small" id="b-copy">Copy</button>
            </div>
            <p class="small muted" id="b-size"></p>
            <p class="small muted">The whole surprise is stored inside this link, so anyone who has it can open it. To change something later, edit here and create a new link.</p>
            <p><a class="btn ghost small" id="b-open" href="#" target="_blank" rel="noopener">Open it in a new tab</a></p>
          </div>
        </form>

        <aside class="b-preview" aria-label="Live preview">
          <div class="b-preview-bar">
            <span>Live preview</span>
            <div class="seg" role="group" aria-label="Preview size">
              <button type="button" data-dev="phone" aria-pressed="${device === 'phone'}">Phone</button>
              <button type="button" data-dev="desktop" aria-pressed="${device === 'desktop'}">Laptop</button>
            </div>
          </div>
          <div class="device ${device}" id="b-device"></div>
          <p class="hint-center">This is exactly what they'll see.</p>
        </aside>
      </div>
    </div></main>`;

    bindBuilder();
    renderPhotos();
    syncPlead();
    updatePreview();
  }

  let previewTimer;
  function updatePreview() {
    const dev = $('#b-device');
    if (dev) renderGift(dev, draft, { placeholders: true, start: previewScreen, onScreen: (s) => { previewScreen = s; } });
  }
  function changed() {
    saveDraft();
    $('#b-result').hidden = true;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(updatePreview, 140);
  }
  function syncPlead() {
    const off = draft.noMode === 'runaway';
    $('#fs-plead').disabled = off;
    $('#plead-note').hidden = !off;
  }

  function renderPhotos() {
    const grid = $('#ph-grid');
    const cells = draft.photos.map((p, i) => `<div class="ph"><img src="${p}" alt="Photo ${i + 1}"><button type="button" data-rm="${i}" aria-label="Remove photo ${i + 1}">×</button></div>`);
    while (cells.length < MAX_PHOTOS) cells.push(`<div class="ph empty">empty</div>`);
    grid.innerHTML = cells.join('');
    $('#ph-add').disabled = draft.photos.length >= MAX_PHOTOS;
  }

  // Center-crop to 4:3 and shrink, so four photos keep the link reasonably short.
  function shrinkPhoto(file, w = 240, h = 180, q = 0.62) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const target = w / h;
        let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
        if (sw / sh > target) { const nw = sh * target; sx = (sw - nw) / 2; sw = nw; }
        else { const nh = sw / target; sy = (sh - nh) / 2; sh = nh; }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', q));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image')); };
      img.src = url;
    });
  }

  function bindBuilder() {
    const form = $('#b-form');

    form.addEventListener('input', (e) => {
      const k = e.target.dataset.key;
      if (!k) return;
      draft[k] = e.target.value;
      changed();
    });
    form.addEventListener('change', (e) => {
      if (e.target.type !== 'radio') return;
      draft[e.target.name] = e.target.value;
      if (e.target.name === 'noMode') { syncPlead(); if (previewScreen === 'plead') previewScreen = 'ask'; }
      changed();
    });
    form.addEventListener('focusin', (e) => {
      const fs = e.target.closest('fieldset[data-screen]');
      if (fs && fs.dataset.screen !== previewScreen) { previewScreen = fs.dataset.screen; updatePreview(); }
    });

    $('#ph-add').addEventListener('click', () => $('#f-photos').click());
    let adding = false;
    $('#f-photos').addEventListener('change', async (e) => {
      if (adding) return;
      adding = true;
      const files = [...e.target.files].filter((f) => f.type.startsWith('image/'));
      try {
        for (const f of files) {
          if (draft.photos.length >= MAX_PHOTOS) break;
          try { draft.photos.push(await shrinkPhoto(f)); } catch { /* skip unreadable files */ }
        }
      } finally { adding = false; }
      e.target.value = '';
      previewScreen = 'letter';
      renderPhotos();
      changed();
    });
    $('#ph-grid').addEventListener('click', (e) => {
      const b = e.target.closest('[data-rm]');
      if (!b) return;
      draft.photos.splice(Number(b.dataset.rm), 1);
      renderPhotos();
      changed();
    });

    $$('.seg button').forEach((b) => b.addEventListener('click', () => {
      device = b.dataset.dev;
      store.set('ls-device', device);
      $$('.seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      $('#b-device').className = `device ${device}`;
    }));

    $('#b-full').addEventListener('click', () => openOverlay(draft));

    const reset = $('#b-reset');
    let armed = false;
    reset.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        reset.textContent = 'Click again to reset';
        setTimeout(() => { armed = false; reset.textContent = 'Reset to sample'; }, 3000);
        return;
      }
      draft = normalize(SAMPLE);
      saveDraft();
      renderBuilder();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = await encodeGift(normalize(draft));
      const url = `${homeURL()}#g=${code}`;
      const kb = url.length / 1024;
      $('#b-link').value = url;
      $('#b-open').href = url;
      $('#b-size').innerHTML = kb > 40
        ? `<span class="warn">This link is ${kb.toFixed(0)} KB because of the photos.</span> Most chat apps handle it, but if it gets cut off, try fewer photos.`
        : `Link size: ${kb.toFixed(1)} KB. Short enough for any chat app.`;
      $('#b-copy').textContent = 'Copy';
      const res = $('#b-result');
      res.hidden = false;
      res.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
    });

    $('#b-copy').addEventListener('click', () => {
      const input = $('#b-link');
      const btn = $('#b-copy');
      const fallback = () => { input.focus(); input.select(); btn.textContent = 'Press Ctrl+C'; };
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(input.value).then(() => { btn.textContent = 'Copied'; }, fallback);
      else fallback();
    });
  }

  /* ---------- Full-screen preview overlay ---------- */
  function onOverlayKey(e) { if (e.key === 'Escape') closeOverlay(); }
  function openOverlay(data) {
    closeOverlay();
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'Full screen preview');
    ov.innerHTML = '<button type="button" class="btn ghost small ov-close">Close preview</button><div class="ov-body"></div>';
    document.body.append(ov);
    const body = $('.ov-body', ov);
    body.style.minHeight = '100%';
    renderGift(body, data, { full: true, placeholders: true });
    $('.gift', body).style.minHeight = '100%';
    $('.ov-close', ov).addEventListener('click', closeOverlay);
    document.addEventListener('keydown', onOverlayKey);
    $('.ov-close', ov).focus();
  }
  function closeOverlay() {
    $('.overlay')?.remove();
    document.removeEventListener('keydown', onOverlayKey);
  }

  /* ---------- Gift page ---------- */
  async function renderGiftPage(code) {
    view = 'gift';
    let d;
    try { d = normalize(await decodeGift(code)); }
    catch { return renderBrokenLink(); }
    document.title = d.ask || 'A little surprise';
    document.body.className = 'gift-mode';
    document.body.style.background = THEMES[d.theme].bg2;
    renderGift(app, d, { full: true });
  }
  function renderBrokenLink() {
    document.title = 'This surprise link is incomplete';
    document.body.style.background = THEMES.strawberry.bg2;
    app.innerHTML = `<div class="gift full g-error" style="${giftVars(THEMES.strawberry)}"><div class="g-stage"><section class="g-screen"><div class="g-card">
      ${mascotSVG('cat', 'sad')}
      <h2 class="g-title">This link got cut off</h2>
      <p class="g-sub">Part of it is missing, so the surprise can't open. Ask the person who sent it to copy the whole link again.</p>
      <a href="${esc(homeURL())}">make your own surprise</a>
    </div></section></div></div>`;
  }

  /* ---------- Router ---------- */
  let view = '';
  const SECTIONS = ['how', 'themes', 'occasions', 'pricing'];
  function route() {
    closeOverlay();
    const h = location.hash.slice(1);
    if (h.startsWith('g=')) return renderGiftPage(h.slice(2));
    if (h === 'create') { renderBuilder(); window.scrollTo(0, 0); return; }
    if (h === 'demo') {
      view = 'demo';
      resetBody();
      document.body.style.background = THEMES[SAMPLE.theme].bg2;
      renderGift(app, SAMPLE, { full: true, placeholders: true });
      window.scrollTo(0, 0);
      return;
    }
    if (view !== 'landing') renderLanding();
    if (SECTIONS.includes(h)) document.getElementById(h)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    else window.scrollTo(0, 0);
  }
  addEventListener('hashchange', route);
  route();
})();
