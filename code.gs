
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheetName = data.docType === 'Audit LG2' ? 'Audit LG2' : 'Audit LG1';
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.appendRow([
    data.date,
    data.partNo,
    data.partName,
    data.problem,
    data.issue,
    data.recorder,
    data.causer,
    data.imageData
  ]);
}

function doGet(e) {
  const sheetName = e.parameter.sheet === 'Audit LG2' ? 'Audit LG2' : 'Audit LG1';
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift();
  const jsonData = rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => obj[header] = row[i]);
    return obj;
  });
  return ContentService.createTextOutput(JSON.stringify(jsonData))
    .setMimeType(ContentService.MimeType.JSON);
}
