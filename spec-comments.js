// 정의서 항목별 의견: GitHub 이슈로 남기고, 남긴 의견을 항목 아래에 보여 준다.
// 이슈 제목 앞의 [정의서 N]으로 항목을 구분한다.
(() => {
  const REPO = 'fastkorea12-png/kssc-website-proposal';
  const sections = [...document.querySelectorAll('main section[id^="s"]')];

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const fmt = (iso) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const boxes = sections.map((section) => {
    const h2 = section.querySelector('h2');
    const num = section.id.slice(1);
    const name = h2.textContent.replace(/^\s*\d+\.\s*/, '').trim();
    const tag = `[정의서 ${num}]`;

    const write = el('a', 'comment-write', '의견 남기기');
    write.href = `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(`${tag} ${name}`)}&body=${encodeURIComponent(`**항목:** ${num}. ${name}\n\n**의견:**\n`)}`;
    write.target = '_blank';
    write.rel = 'noopener';
    h2.append(write);

    const box = el('div', 'comments');
    const head = el('p', 'comments-head', `${num}. ${name} 의견`);
    const list = el('ul', 'comments-list');
    const empty = el('p', 'comments-empty', '아직 남긴 의견이 없습니다.');
    box.append(head, list, empty);
    section.append(box);
    return { tag, list, empty, box };
  });

  fetch(`https://api.github.com/repos/${REPO}/issues?state=all&per_page=100&sort=created&direction=asc`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((issues) => {
      boxes.forEach(({ tag, list, empty, box }) => {
        const mine = issues.filter((i) => !i.pull_request && i.title.startsWith(tag));
        empty.hidden = mine.length > 0;
        box.classList.toggle('has-comments', mine.length > 0);
        mine.forEach((issue) => {
          const li = el('li', issue.state === 'closed' ? 'is-closed' : '');
          const meta = el('div', 'comment-meta');
          meta.append(
            el('b', '', issue.user?.login || ''),
            el('span', '', fmt(issue.created_at)),
            el('span', 'comment-state', issue.state === 'closed' ? '반영 완료' : '검토 중'),
          );
          const body = (issue.body || '').replace(/\*\*항목:\*\*.*\n?/, '').replace(/\*\*의견:\*\*\s*/, '').trim();
          const text = el('p', 'comment-text', body.length > 220 ? `${body.slice(0, 220)}…` : body || issue.title);
          const link = el('a', 'comment-link', issue.comments ? `답글 ${issue.comments}개 · 전체 보기` : '전체 보기');
          link.href = issue.html_url;
          link.target = '_blank';
          link.rel = 'noopener';
          li.append(meta, text, link);
          list.append(li);
        });
      });
    })
    .catch(() => {
      boxes.forEach(({ empty }) => { empty.textContent = '의견을 불러오지 못했습니다. ‘의견 남기기’로 GitHub에서 확인할 수 있습니다.'; });
    });
})();
