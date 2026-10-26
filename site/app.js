// 모바일 메뉴
const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('#site-nav');
function setMenu(open) {
  nav.classList.toggle('open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
}
menuButton.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav.addEventListener('click', (event) => { if (event.target.closest('a')) setMenu(false); });

// 경영공시 연도 탭 — 시안이므로 자료 제목 형식만 바뀐다
const years = [2025, 2024, 2023];
const tabs = document.querySelector('.year-tabs');
const docTitles = {
  donation: (y) => `${y}년 기부금 모금액 및 활용실적`,
  report: (y) => `${y}회계연도 결산·경영공시`,
};
function selectYear(year) {
  tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.year === String(year))));
  document.querySelectorAll('.doc-title').forEach((el) => { el.textContent = docTitles[el.dataset.label](year); });
}
years.forEach((year) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('role', 'tab');
  button.dataset.year = year;
  button.textContent = year;
  button.addEventListener('click', () => selectYear(year));
  tabs.append(button);
});
selectYear(years[0]);

// 개인정보처리방침 안내
const privacy = document.querySelector('#privacy');
document.querySelector('#privacy-link').addEventListener('click', (event) => {
  event.preventDefault();
  privacy.showModal();
});
privacy.querySelector('[data-close]').addEventListener('click', () => privacy.close());

// 첫 화면 바탕 비교: 어둡게 / 밝게 (?hero=light 로 바로 열 수 있음)
const THEME_KEY = 'ksscoop-hero-theme';
function setHeroTheme(theme) {
  document.body.classList.toggle('hero-light', theme === 'light');
  document.querySelectorAll('.review-theme [data-theme]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.theme === theme)));
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* 저장 불가 환경 */ }
}
document.querySelectorAll('.review-theme [data-theme]').forEach((b) => b.addEventListener('click', () => setHeroTheme(b.dataset.theme)));
{
  const fromUrl = new URLSearchParams(location.search).get('hero');
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch { /* 저장 불가 환경 */ }
  setHeroTheme(fromUrl === 'light' || (!fromUrl && saved === 'light') ? 'light' : 'dark');
}

// 스크롤 등장 효과 (움직임 줄이기 설정이면 건너뜀)
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const targets = document.querySelectorAll('main section:not(.hero) .wrap > *, .value-grid > li, .join-grid > li');
  document.querySelectorAll('.value-grid > li, .join-grid > li').forEach((li, i) => { li.style.transitionDelay = `${(i % 3) * 0.12}s`; });
  targets.forEach((el) => el.classList.add('reveal'));
  document.documentElement.classList.add('reveal-ready');
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  targets.forEach((el) => io.observe(el));
}

// ───────── 문구 가안 · 고치기 · 제출 ─────────
// picks: { [key]: { v: 'A' | 'B' | 'C' | 'X', text?: string } } — X는 직접 고친 문구
// notes: { [key]: string } — 문구별 메모
// 제출하면 구글 시트에 한 줄로 저장되고, '최신 제출본 보기'로 어느 기기에서든 다시 띄운다.
const SUBMIT_URL = 'https://script.google.com/macros/s/AKfycbxYKenQtaHoIvn8d7mBhQQdS-m5POKojR7wcA5ChM3ikP5_asE3kFf9D-U2ljMaYSmhyA/exec'; // 구글 Apps Script 웹 앱 (시트: KSSCOOP 시안 제출)
const SUBMIT_KEY = 'ksscoop-review-2026';
const COPY = window.KSSCOOP_COPY;
const VARIANT_KEYS = Object.keys(COPY.variants);
const LOCAL_KEY = 'ksscoop-copy-picks';
let picks = {};
let notes = {};
let editing = true;

const statusEl = document.querySelector('.review-status');
const setStatus = (text) => { statusEl.textContent = text; };
const hasVariants = (key) => VARIANT_KEYS.slice(1).some((v) => COPY.items[key][v]);

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); } catch { return {}; }
}
function writeLocal() {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ picks, notes })); } catch { /* 저장 불가 환경 */ }
}

function textFor(key) {
  const item = COPY.items[key];
  const pick = picks[key];
  if (pick && pick.v === 'X' && pick.text) return pick.text;
  if (pick && item[pick.v]) return item[pick.v];
  return item.A;
}

function renderText(el, text) {
  el.replaceChildren();
  text.split('\n').forEach((line, i) => {
    if (i) el.append(document.createElement('br'));
    el.append(document.createTextNode(line));
  });
}

function currentGlobalVariant() {
  const keys = Object.keys(COPY.items).filter(hasVariants);
  const first = (picks[keys[0]] || { v: 'A' }).v;
  return keys.every((k) => (picks[k] || { v: 'A' }).v === first) ? first : null;
}

function renderAll() {
  document.querySelectorAll('[data-copy]').forEach((el) => {
    const key = el.dataset.copy;
    renderText(el, textFor(key));
    el.dataset.variant = picks[key] ? picks[key].v : 'A';
    el.classList.toggle('has-note', Boolean(notes[key]));
  });
  const global = currentGlobalVariant();
  document.querySelectorAll('.review-variants:not(.review-theme) button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.v === global));
  });
}

function update(nextPicks, nextNotes, message) {
  picks = nextPicks;
  notes = nextNotes;
  renderAll();
  writeLocal();
  if (message) setStatus(`${message} 다 고치신 뒤 ‘제출하기’를 눌러 주세요.`);
}

// 전체 가안 버튼
const variantGroup = document.querySelector('.review-variants:not(.review-theme)');
VARIANT_KEYS.forEach((v) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.v = v;
  b.innerHTML = `<b>${v}</b> ${COPY.variants[v]}`;
  b.addEventListener('click', () => {
    const next = { ...picks };
    Object.keys(COPY.items).filter(hasVariants).forEach((k) => { next[k] = { v }; });
    update(next, notes, `가안이 있는 문구를 모두 ${v}안으로 바꿨어요.`);
  });
  variantGroup.append(b);
});

// 문구 고치기 켜기/끄기
const toggle = document.querySelector('.review-toggle');
toggle.addEventListener('click', () => {
  editing = !editing;
  document.body.classList.toggle('copy-editing', editing);
  toggle.setAttribute('aria-pressed', String(editing));
  toggle.textContent = editing ? '문구 고치기 켜짐' : '문구 고치기 꺼짐';
  if (!editing) closePop();
});
document.body.classList.add('copy-editing');

// 문구 팝업
const pop = document.querySelector('.copy-pop');
const popLabel = pop.querySelector('.pop-label');
const popOptions = pop.querySelector('.pop-options');
const popCustom = pop.querySelector('#pop-custom');
const popMemo = pop.querySelector('#pop-memo');
const popNote = pop.querySelector('.pop-note');
let popTarget = null;
let popChoice = 'A';

function openPop(el) {
  const key = el.dataset.copy;
  const item = COPY.items[key];
  const pick = picks[key] || { v: 'A' };
  popTarget = el;
  popChoice = pick.v;
  popLabel.textContent = item.label;
  popOptions.replaceChildren();
  popOptions.hidden = !hasVariants(key);
  if (hasVariants(key)) {
    VARIANT_KEYS.filter((v) => item[v]).forEach((v) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pop-option';
      b.setAttribute('aria-pressed', String(pick.v === v));
      const tag = document.createElement('b');
      tag.textContent = `${v}안 · ${COPY.variants[v]}`;
      const body = document.createElement('span');
      body.textContent = item[v].replace(/\n/g, ' ');
      b.append(tag, body);
      b.addEventListener('click', () => {
        popOptions.querySelectorAll('.pop-option').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        popChoice = v;
        popCustom.value = item[v];
      });
      popOptions.append(b);
    });
  }
  popCustom.value = textFor(key);
  popMemo.value = notes[key] || '';
  popNote.textContent = '';

  pop.hidden = false;
  const rect = el.getBoundingClientRect();
  const width = Math.min(400, window.innerWidth - 32);
  const left = Math.max(16, Math.min(rect.left + window.scrollX, window.scrollX + window.innerWidth - width - 16));
  pop.style.width = `${width}px`;
  pop.style.left = `${left}px`;
  pop.style.top = `${rect.bottom + window.scrollY + 10}px`;
  (pop.querySelector('.pop-option') || popCustom).focus();
}

function closePop() {
  pop.hidden = true;
  if (popTarget) popTarget.focus?.();
  popTarget = null;
}

document.querySelectorAll('[data-copy]').forEach((el) => {
  el.tabIndex = 0;
  el.title = `${COPY.items[el.dataset.copy].label} 바꾸기`;
  const open = (event) => {
    if (!editing) return;
    event?.preventDefault();
    event?.stopPropagation();
    openPop(el);
  };
  el.addEventListener('click', open);
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') open(event);
  });
});

pop.querySelector('.pop-apply').addEventListener('click', () => {
  const key = popTarget.dataset.copy;
  const item = COPY.items[key];
  const text = popCustom.value.trim();
  if (!text) { popNote.textContent = '문구를 비워 둘 수는 없어요. ‘처음 문구로’를 눌러 주세요.'; return; }
  const nextPicks = { ...picks };
  const matched = VARIANT_KEYS.find((v) => item[v] && item[v] === text);
  nextPicks[key] = matched ? { v: matched } : { v: 'X', text };
  if (!matched && popChoice !== 'X' && item[popChoice] === text) nextPicks[key] = { v: popChoice };
  const nextNotes = { ...notes };
  const memo = popMemo.value.trim();
  if (memo) nextNotes[key] = memo; else delete nextNotes[key];
  update(nextPicks, nextNotes, `‘${item.label}’을(를) 바꿨어요.`);
  closePop();
});
pop.querySelector('.pop-reset').addEventListener('click', () => {
  const key = popTarget.dataset.copy;
  const nextPicks = { ...picks };
  delete nextPicks[key];
  const nextNotes = { ...notes };
  delete nextNotes[key];
  update(nextPicks, nextNotes, `‘${COPY.items[key].label}’을(를) 처음 문구로 되돌렸어요.`);
  closePop();
});
pop.querySelector('.pop-close').addEventListener('click', closePop);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !pop.hidden) closePop(); });
document.addEventListener('click', (event) => {
  if (!pop.hidden && !pop.contains(event.target) && !event.target.closest('[data-copy]')) closePop();
});

// 제출
function changedItems() {
  return Object.entries(COPY.items).map(([key, item]) => {
    const pick = picks[key] || { v: 'A' };
    return {
      key,
      label: item.label,
      variant: pick.v === 'X' ? '직접 수정' : `${pick.v}안`,
      changed: pick.v !== 'A',
      text: textFor(key),
      note: notes[key] || '',
    };
  });
}

const submitDialog = document.querySelector('#submit-dialog');
const submitForm = document.querySelector('#submit-form');
const submitResult = submitDialog.querySelector('.submit-result');
document.querySelector('.review-submit').addEventListener('click', () => {
  const items = changedItems();
  const changed = items.filter((i) => i.changed).length;
  const noted = items.filter((i) => i.note).length;
  submitDialog.querySelector('.submit-summary').textContent =
    `바꾼 문구 ${changed}개, 메모 ${noted}개를 제출합니다. 바꾸지 않은 문구도 함께 저장되어 전체 화면을 그대로 다시 볼 수 있어요.`;
  submitResult.textContent = '';
  try { submitForm.name.value = localStorage.getItem('ksscoop-reviewer') || ''; } catch { /* 저장 불가 환경 */ }
  submitDialog.showModal();
});
submitDialog.querySelector('[data-close-submit]').addEventListener('click', () => submitDialog.close());

submitForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = submitForm.name.value.trim();
  if (!name) { submitResult.textContent = '이름을 적어 주세요.'; return; }
  if (!SUBMIT_URL) { submitResult.textContent = '제출 기능을 연결하는 중입니다. 잠시 후 다시 시도해 주세요.'; return; }
  try { localStorage.setItem('ksscoop-reviewer', name); } catch { /* 저장 불가 환경 */ }
  const button = submitForm.querySelector('[type="submit"]');
  button.disabled = true;
  submitResult.textContent = '제출하는 중…';
  try {
    const res = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        key: SUBMIT_KEY,
        name,
        memo: submitForm.memo.value.trim(),
        theme: document.body.classList.contains('hero-light') ? '밝게' : '어둡게',
        items: changedItems(),
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'failed');
    submitResult.textContent = '제출했습니다. 감사합니다!';
    setStatus(`${name}님 제출본을 저장했어요.`);
    setTimeout(() => submitDialog.close(), 1400);
  } catch (error) {
    submitResult.textContent = '제출하지 못했어요. 잠시 후 다시 시도하시거나, 화면을 캡처해 문자로 보내 주세요.';
  } finally {
    button.disabled = false;
  }
});

// 최신 제출본 불러오기
async function loadLatest() {
  if (!SUBMIT_URL) { setStatus('제출 기능을 연결하는 중입니다.'); return; }
  setStatus('최신 제출본을 불러오는 중…');
  try {
    const res = await fetch(`${SUBMIT_URL}?action=latest&key=${encodeURIComponent(SUBMIT_KEY)}`);
    const data = await res.json();
    if (!data.ok || !data.submission) { setStatus('아직 제출된 내용이 없어요.'); return; }
    const sub = data.submission;
    const nextPicks = {};
    const nextNotes = {};
    (sub.items || []).forEach((i) => {
      const item = COPY.items[i.key];
      if (!item) return;
      const matched = VARIANT_KEYS.find((v) => item[v] && item[v] === i.text);
      if (matched && matched !== 'A') nextPicks[i.key] = { v: matched };
      else if (!matched) nextPicks[i.key] = { v: 'X', text: i.text };
      if (i.note) nextNotes[i.key] = i.note;
    });
    update(nextPicks, nextNotes);
    if (sub.theme) setHeroTheme(sub.theme === '밝게' ? 'light' : 'dark');
    setStatus(`${sub.name}님이 ${sub.time}에 제출한 화면입니다.`);
  } catch (error) {
    setStatus('제출본을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
}
document.querySelector('.review-load').addEventListener('click', loadLatest);

// 시작
{
  const saved = readLocal();
  picks = saved.picks || (saved.notes ? {} : saved) || {};
  notes = saved.notes || {};
  renderAll();
  if (new URLSearchParams(location.search).get('view') === 'latest') loadLatest();
  else setStatus('문구를 누르면 바꾸거나 메모를 남길 수 있어요.');
}
