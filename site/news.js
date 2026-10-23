// 소식: feed.json의 블로그·인스타그램·유튜브 게시물을 보여 준다.
// 채널 주소가 비어 있으면 게시물 대신 '연결 예정' 자리를 보여 준다. 게시물을 지어내지 않는다.
(() => {
  const ICONS = {
    blog: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 11h7M9 14h7M9 17h5" stroke="currentColor" stroke-width="1.6"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="16.8" cy="7.2" r="1" fill="currentColor"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.5 9.5v5l4.3-2.5z" fill="currentColor"/></svg>',
  };
  const ORDER = ['blog', 'instagram', 'youtube'];
  const grid = document.querySelector('.news-grid');
  const links = document.querySelector('.channel-links');
  const tabs = document.querySelectorAll('.news-tabs [data-channel]');
  let feed = { channels: { blog: { name: '블로그' }, instagram: { name: '인스타그램' }, youtube: { name: '유튜브' } }, posts: [] };
  let current = 'all';

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  const formatDate = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };
  const safeUrl = (url) => (/^https:\/\//.test(url || '') ? url : null);

  function chip(channel) {
    const c = el('span', `chip chip-${channel}`);
    c.innerHTML = ICONS[channel];
    c.append(document.createTextNode(feed.channels[channel]?.name || channel));
    return c;
  }

  function postCard(post) {
    const li = el('li', 'news-card');
    const href = safeUrl(post.url);
    const a = el(href ? 'a' : 'div', 'news-link');
    if (href) { a.href = href; a.target = '_blank'; a.rel = 'noopener'; }
    const thumb = el('div', 'thumb');
    const src = safeUrl(post.thumb);
    if (src) {
      const img = el('img');
      img.src = src; img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
      img.onerror = () => { thumb.innerHTML = ICONS[post.channel] || ''; };
      thumb.append(img);
    } else {
      thumb.innerHTML = ICONS[post.channel] || '';
    }
    const body = el('div', 'news-body');
    body.append(chip(post.channel), el('h3', '', post.title || ''), el('time', '', formatDate(post.date)));
    a.append(thumb, body);
    li.append(a);
    return li;
  }

  function placeholder(channel) {
    const li = el('li', 'news-card is-empty');
    const box = el('div', 'news-link');
    const thumb = el('div', 'thumb');
    thumb.innerHTML = ICONS[channel];
    const body = el('div', 'news-body');
    body.append(
      chip(channel),
      el('h3', '', `${feed.channels[channel]?.name || channel} 최신 게시물이 여기에 표시됩니다`),
      el('p', 'empty-note', '채널 주소를 확인한 뒤 자동으로 연결합니다.'),
    );
    box.append(thumb, body);
    li.append(box);
    return li;
  }

  function render() {
    grid.replaceChildren();
    const channels = current === 'all' ? ORDER : [current];
    const posts = (feed.posts || [])
      .filter((p) => channels.includes(p.channel))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, current === 'all' ? 6 : 6);
    if (posts.length) posts.forEach((p) => grid.append(postCard(p)));
    channels.filter((c) => !posts.some((p) => p.channel === c)).forEach((c) => grid.append(placeholder(c)));

    links.replaceChildren();
    ORDER.forEach((c) => {
      const url = safeUrl(feed.channels[c]?.url);
      const item = el(url ? 'a' : 'span', `channel-link${url ? '' : ' is-pending'}`);
      item.innerHTML = ICONS[c];
      item.append(document.createTextNode(url ? `${feed.channels[c].name} 바로가기` : `${feed.channels[c]?.name || c} 주소 확인 중`));
      if (url) { item.href = url; item.target = '_blank'; item.rel = 'noopener'; }
      links.append(item);
    });
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => {
    current = tab.dataset.channel;
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    render();
  }));

  render();
  fetch('feed.json', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => { if (data) { feed = data; render(); } })
    .catch(() => { /* 파일로 직접 열었을 때는 기본 자리만 보여 준다 */ });
})();
