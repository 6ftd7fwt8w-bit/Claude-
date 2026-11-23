// Viva la Home – recibe los eventos del checkout y los guarda en la hoja.
// En la hoja de Google: Extensiones → Apps Script → pegar esto → Implementar → Nueva implementación
// → Tipo «Aplicación web» · Ejecutar como «Yo» · Quién tiene acceso «Cualquier usuario» → copiar la URL.

const COLS = ['fecha', 'checkout', 'visitante', 'evento', 'total', 'descuentos', 'envio', 'pago',
  'aviso_tipo', 'aviso_campo', 'aviso_texto', 'so', 'navegador', 'ancho'];

function doPost(e) {
  const row = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) sheet.appendRow(COLS);
  sheet.appendRow(COLS.map(function (c) { return row[c] === undefined ? '' : String(row[c]).slice(0, 300); }));
  return ContentService.createTextOutput('ok');
}
