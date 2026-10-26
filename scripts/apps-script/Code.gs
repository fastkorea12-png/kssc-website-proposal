/**
 * KSSCOOP 시안 제출 저장소 (구글 시트에 붙는 Apps Script)
 * - POST: 시안에서 고친 문구 제출 → '제출' 시트에 한 줄 추가
 * - GET ?action=latest: 가장 최근 제출본 반환
 * @OnlyCurrentDoc  이 시트 하나에만 접근한다.
 */
const SHEET_NAME = '제출';
const SUBMIT_KEY = 'ksscoop-review-2026';
const FIXED = ['제출 시각', '이름', '분위기', '전체 의견', '바꾼 문구 수', '원본(JSON)'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(FIXED);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, FIXED.length).setFontWeight('bold');
  }
  return sh;
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function clean_(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.key !== SUBMIT_KEY) return json_({ ok: false, error: 'key' });
    const items = (data.items || []).slice(0, 80).map((i) => ({
      key: clean_(i.key, 60), label: clean_(i.label, 60), variant: clean_(i.variant, 20),
      changed: Boolean(i.changed), text: clean_(i.text, 600), note: clean_(i.note, 600),
    }));
    const sh = sheet_();
    const lock = LockService.getDocumentLock();
    lock.waitLock(10000);
    try {
      // 문구별 칸: 처음 보는 문구는 오른쪽에 칸을 추가한다
      const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      items.forEach((i) => {
        if (header.indexOf(i.label) === -1) {
          header.push(i.label);
          sh.getRange(1, header.length).setValue(i.label).setFontWeight('bold');
        }
      });
      const row = new Array(header.length).fill('');
      row[0] = new Date();
      row[1] = clean_(data.name, 40);
      row[2] = clean_(data.theme, 10);
      row[3] = clean_(data.memo, 1000);
      row[4] = items.filter((i) => i.changed).length;
      row[5] = JSON.stringify({ name: row[1], theme: row[2], memo: row[3], items });
      items.forEach((i) => {
        const col = header.indexOf(i.label);
        row[col] = (i.changed ? `[${i.variant}] ` : '') + i.text + (i.note ? `\n※ 메모: ${i.note}` : '');
      });
      sh.appendRow(row);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.key !== SUBMIT_KEY) return json_({ ok: false, error: 'key' });
  if (p.action !== 'latest') return json_({ ok: true });
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return json_({ ok: true, submission: null });
  const row = sh.getRange(last, 1, 1, FIXED.length).getValues()[0];
  const raw = JSON.parse(row[5] || '{}');
  const time = Utilities.formatDate(new Date(row[0]), 'Asia/Seoul', 'M월 d일 HH:mm');
  return json_({ ok: true, submission: { name: raw.name, theme: raw.theme, memo: raw.memo, time, items: raw.items || [] } });
}
