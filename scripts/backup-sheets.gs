/**
 * Backup diario del CRM Peliando en Google Sheets.
 *
 * Va pegado en el Sheet de backup (Extensiones → Apps Script), no corre en
 * el CRM. Una vez por dia le pide los datos a /api/backup y reescribe una
 * pestaña por tabla: Ventas, Clientes, Gastos y Entregas. Si el CRM no
 * responde, no toca nada: queda el backup del dia anterior.
 *
 * Configuracion (una sola vez), en Apps Script → Configuración del proyecto:
 *   - Zona horaria: (GMT-03:00) Buenos Aires.
 *   - Propiedades de la secuencia de comandos:
 *       CRM_URL        https://<dominio-del-crm>/api/backup
 *       BACKUP_SECRET  el mismo valor que BACKUP_SECRET en Vercel
 * Despues, desde el editor, ejecutar una vez `instalarBackupDiario`
 * (pide permisos y hace el primer backup).
 */

function backup() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty("CRM_URL");
  const secret = props.getProperty("BACKUP_SECRET");
  if (!url || !secret) {
    throw new Error("Faltan CRM_URL o BACKUP_SECRET en las propiedades del script.");
  }

  const res = UrlFetchApp.fetch(url, {
    headers: { Authorization: "Bearer " + secret },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    throw new Error("El CRM respondió " + res.getResponseCode() + ": " + res.getContentText().slice(0, 300));
  }
  const datos = JSON.parse(res.getContentText());

  const libro = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(datos.hojas).forEach(function (nombre) {
    const filas = datos.hojas[nombre].map(function (fila) {
      return fila.map(convertirCelda);
    });
    const hoja = libro.getSheetByName(nombre) || libro.insertSheet(nombre);
    hoja.clearContents();
    if (filas.length > 0) {
      hoja.getRange(1, 1, filas.length, filas[0].length).setValues(filas);
      hoja.getRange(1, 1, 1, filas[0].length).setFontWeight("bold");
      hoja.setFrozenRows(1);
    }
  });

  const info = libro.getSheetByName("Info") || libro.insertSheet("Info");
  info.clearContents();
  info.getRange(1, 1, 2, 2).setValues([
    ["Último backup", new Date(datos.generado)],
    ["Origen", url],
  ]);
}

// "2026-09-25" -> fecha de verdad (para poder filtrar y ordenar); null -> vacio.
function convertirCelda(valor) {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const p = valor.split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  return valor;
}

// Crea (o recrea) el disparador diario entre las 6 y las 7 de la mañana, y
// hace el primer backup para confirmar que todo anda.
function instalarBackupDiario() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "backup") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("backup").timeBased().everyDays(1).atHour(6).create();
  backup();
}
