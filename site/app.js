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

// ───────── 문구 가안 ─────────
// picks: { [key]: { v: 'A' | 'B' | 'C' | 'X', text?: string } } — X는 직접 쓴 문구
const COPY = window.KSSCOOP_COPY;
const VARIANT_KEYS = Object.keys(COPY.variants);
const LOCAL_KEY = 'ksscoop-copy-picks';
let picks = {};
let store = null;          // 공유 저장소(db 문서) 또는 null
let canShare = false;      // 공유 저장 가능 여부
let comments = null;       // 댓글 기능 또는 null
let editing = true;
const REPO = 'https://github.com/fastkorea12-png/kssc-website-proposal';

// GitHub 이슈 작성 화면을 새 탭으로 연다 (GitHub 로그인 필요)
function openIssue(title, body) {
  const url = `${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.rel = 'noopener';
  document.body.append(a); a.click(); a.remove();
}

function picksSummary() {
  return Object.entries(COPY.items).map(([key, item]) => {
    const pick = picks[key] || { v: 'A' };
    const which = pick.v === 'X' ? '직접 수정' : `${pick.v}안`;
    return `- ${item.label} (${which}): ${textFor(key).replace(/\n/g, ' ')}`;
  }).join('\n');
}

const statusEl = document.querySelector('.review-status');
const setStatus = (text) => { statusEl.textContent = text; };

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); } catch { return {}; }
}
function writeLocal(value) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(value)); } catch { /* 저장 불가 환경 */ }
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
  const keys = Object.keys(COPY.items);
  const first = (picks[keys[0]] || { v: 'A' }).v;
  return keys.every((k) => (picks[k] || { v: 'A' }).v === first) ? first : null;
}

function renderAll() {
  document.querySelectorAll('[data-copy]').forEach((el) => {
    renderText(el, textFor(el.dataset.copy));
    const pick = picks[el.dataset.copy];
    el.dataset.variant = pick ? pick.v : 'A';
  });
  const global = currentGlobalVariant();
  document.querySelectorAll('.review-variants:not(.review-theme) button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.v === global));
  });
}

async function savePicks(next, message) {
  picks = next;
  renderAll();
  writeLocal(picks);
  if (store && canShare) {
    setStatus('저장 중…');
    try {
      await store.set({ picks });
      setStatus(message || '저장했어요. 다른 검토자에게도 보여요.');
    } catch (error) {
      canShare = false;
      setStatus('공유 저장이 안 돼서 이 브라우저에만 저장했어요.');
    }
  } else {
    setStatus(message ? `${message} (이 브라우저에만 저장)` : '이 브라우저에만 저장했어요.');
  }
}

// 전체 가안 버튼
const variantGroup = document.querySelector('.review-variants:not(.review-theme)');
VARIANT_KEYS.forEach((v) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.v = v;
  b.innerHTML = `<b>${v}</b> ${COPY.variants[v]}`;
  b.addEventListener('click', () => {
    const next = {};
    Object.keys(COPY.items).forEach((k) => { next[k] = { v }; });
    savePicks(next, `모든 문구를 ${v}안으로 바꿨어요.`);
  });
  variantGroup.append(b);
});

// 선택 결과 보내기 (GitHub)
document.querySelector('.review-send').addEventListener('click', () => {
  openIssue('[문구 선택 결과] KSSCOOP 시안', `시안에서 고른 문구입니다.\n\n${picksSummary()}\n\n**추가 의견:**\n`);
  setStatus('GitHub 창에서 내용을 확인하고 등록해 주세요.');
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
const popNote = pop.querySelector('.pop-note');
const popComment = pop.querySelector('.pop-comment');
let popTarget = null;

function openPop(el) {
  const key = el.dataset.copy;
  const item = COPY.items[key];
  const pick = picks[key] || { v: 'A' };
  popTarget = el;
  popLabel.textContent = item.label;
  popOptions.replaceChildren();
  VARIANT_KEYS.forEach((v) => {
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
      savePicks({ ...picks, [key]: { v } }, `${item.label}을(를) ${v}안으로 바꿨어요.`);
      closePop();
    });
    popOptions.append(b);
  });
  popCustom.value = pick.v === 'X' ? pick.text : '';
  popNote.textContent = '';

  pop.hidden = false;
  const rect = el.getBoundingClientRect();
  const width = Math.min(380, window.innerWidth - 32);
  const left = Math.max(16, Math.min(rect.left + window.scrollX, window.scrollX + window.innerWidth - width - 16));
  pop.style.width = `${width}px`;
  pop.style.left = `${left}px`;
  pop.style.top = `${rect.bottom + window.scrollY + 10}px`;
  pop.querySelector('.pop-option').focus();
}

function closePop() {
  pop.hidden = true;
  if (popTarget) popTarget.focus?.();
  popTarget = null;
}

document.querySelectorAll('[data-copy]').forEach((el) => {
  el.tabIndex = 0;
  el.title = `${COPY.items[el.dataset.copy].label} 바꾸기`;
  const open = () => { if (editing) openPop(el); };
  el.addEventListener('click', open);
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
  });
});

pop.querySelector('.pop-apply').addEventListener('click', () => {
  const text = popCustom.value.trim();
  if (!text) { popNote.textContent = '문구를 적은 뒤 적용을 눌러 주세요.'; return; }
  const key = popTarget.dataset.copy;
  savePicks({ ...picks, [key]: { v: 'X', text } }, '직접 쓴 문구를 적용했어요.');
  closePop();
});
pop.querySelector('.pop-close').addEventListener('click', closePop);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !pop.hidden) closePop(); });
document.addEventListener('click', (event) => {
  if (!pop.hidden && !pop.contains(event.target) && !event.target.closest('[data-copy]')) closePop();
});

popComment.addEventListener('click', async () => {
  const target = popTarget;
  if (!target) return;
  closePop();
  if (!comments) {
    const item = COPY.items[target.dataset.copy];
    openIssue(`[문구 수정 요청] ${item.label}`,
      `**위치:** ${item.label}\n**현재 문구:** ${textFor(target.dataset.copy).replace(/\n/g, ' ')}\n\n**요청 내용:**\n(여기에 적어 주세요)`);
    setStatus('GitHub 창에서 요청을 적고 등록해 주세요.');
    return;
  }
  try {
    const result = await comments.openComposer({ element: target });
    if (!result.opened) setStatus('댓글 창을 열 수 없었어요. 오른쪽 위 댓글 버튼을 눌러 주세요.');
  } catch (error) {
    comments = null;
    setStatus('여기서는 댓글을 열 수 없어요. 오른쪽 위 댓글 버튼을 이용해 주세요.');
  }
});

// 시작: 로컬 선택을 먼저 보여 주고, 공유 저장소가 있으면 그것으로 맞춘다
picks = readLocal();
renderAll();
setStatus('문구를 누르면 다른 안으로 바꾸거나 직접 고칠 수 있어요.');

(async () => {
  const claude = window.claude;
  if (!claude || typeof claude.use !== 'function') return;
  const [db, user, cm] = await Promise.all([
    claude.use('db').catch(() => null),
    claude.use('user').catch(() => null),
    claude.use('comments').catch(() => null),
  ]);
  comments = cm;
  if (db) {
    store = db.doc('review/picks');
    const allowed = user ? await user.can('data.write') : null;
    canShare = allowed !== false;
    if (!canShare) setStatus('보기 권한이라 선택은 이 브라우저에만 저장돼요. 의견은 댓글로 남겨 주세요.');
    store.onSnapshot((snap) => {
      if (snap.exists && snap.data().picks) {
        picks = { ...snap.data().picks };
        renderAll();
      }
    }, () => { store = null; });
  }
})();
