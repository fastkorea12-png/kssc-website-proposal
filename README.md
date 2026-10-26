# KSSCOOP 홈페이지 디자인 검토

KSSCOOP 홈페이지 디자인 정의서와 검토용 시안입니다.

- **[디자인 정의서](https://fastkorea12-png.github.io/kssc-website-proposal/)**
- [검토용 시안](https://fastkorea12-png.github.io/kssc-website-proposal/site/)
- [의견 목록](https://github.com/fastkorea12-png/kssc-website-proposal/issues)

## 검토 방법

- 시안에서 문구 클릭 → A·B·C 가안 선택, 직접 고치기, 메모 남기기 (모든 문구 수정 가능)
- 화면 하단 ‘제출하기’ → 이름 입력 후 제출 (로그인 불필요) → 구글 시트 ‘KSSCOOP 시안 제출’에 한 줄씩 저장
- 화면 하단 ‘최신 제출본 보기’ → 마지막 제출본을 어느 기기에서나 다시 표시 (`site/?view=latest`로 바로 열기)
- 정의서 각 항목 ‘의견 남기기’ → GitHub 이슈로 등록, 해당 항목 아래에 표시

제출 저장소: `scripts/apps-script/Code.gs` (구글 Apps Script 웹 앱, 시트 하나에만 접근하는 권한)

## 검토 상태

- 기관 확정 전 검토용 초안입니다.
- 문구와 정보는 확정 전 제안이며, 미확정 연락처·법인 정보는 ‘기관 확인 후 등록’으로 표기했습니다.
- 사진은 모두 AI로 만든 시안용 이미지이며 실제 활동 사진이 아닙니다.
- 경영공시 목록은 자료 등록 전 빈 상태이며, 기관의 공시 이행 현황과 무관합니다.
- 실제 문의 접수, 관리자 기능, 공시 파일 연결은 포함하지 않았습니다.

## 파일

`index.html` 디자인 정의서 / `site/` 검토용 시안 / `site/copy.js` 문구 가안 / `design-assets/` 정의서 화면 이미지

v0.3 · 2026-10-23

## 소식 자동 연결

`site/feed.json`의 `channels`에 주소를 넣으면 GitHub Actions(`update-feed`)가 매일 오전 6시에 최신 게시물을 가져옵니다.

- 블로그: `blog.url`(블로그 주소), `blog.rss`(예: `https://rss.blog.naver.com/블로그아이디.xml`)
- 유튜브: `youtube.url`(채널 주소), `youtube.channelId`(UC로 시작하는 24자)
- 인스타그램: `instagram.url`만 연결되며, 게시물은 `posts`에 직접 추가합니다.
