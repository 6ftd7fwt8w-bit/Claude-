// Viva la Home – registro del checkout (píxel personalizado de Shopify)
// Pegar en Shopify: Configuración → Eventos de clientes → Añadir píxel personalizado.
// Cambiar SHEET_URL por la URL de la aplicación web de Google Apps Script.
// No envía datos personales (ni email, ni teléfono, ni dirección): solo pasos, errores y dispositivo.

const SHEET_URL = 'PEGAR_AQUI_LA_URL_DE_APPS_SCRIPT';

const EVENTS = [
  'checkout_started',
  'checkout_contact_info_submitted',
  'checkout_address_info_submitted',
  'checkout_shipping_info_submitted',
  'payment_info_submitted',
  'checkout_completed',
  'alert_displayed',        // mensajes de error que ve la clienta (p. ej. teléfono no válido, tarjeta rechazada)
  'ui_extension_errored'
];

function device() {
  try {
    const nav = init.context.navigator || {};
    const win = init.context.window || {};
    const ua = nav.userAgent || '';
    const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Otro';
    const br = /Instagram/.test(ua) ? 'Instagram' : /FBAN|FBAV/.test(ua) ? 'Facebook' : /CriOS|Chrome/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : /Firefox/.test(ua) ? 'Firefox' : 'Otro';
    return { os: os, navegador: br, ancho: win.innerWidth || '' };
  } catch (e) { return {}; }
}

function send(event) {
  const d = event.data || {};
  const co = d.checkout || {};
  const alert = d.alert || {};
  const dev = device();
  const row = {
    fecha: event.timestamp,
    checkout: co.token || '',
    visitante: (event.clientId || '').slice(0, 12),
    evento: event.name,
    total: co.totalPrice ? co.totalPrice.amount : '',
    descuentos: (co.discountApplications || []).map(function (x) { return x.title; }).join(' '),
    envio: co.delivery && co.delivery.selectedDeliveryOptions ? co.delivery.selectedDeliveryOptions.map(function (o) { return o.title; }).join(' ') : '',
    pago: (co.transactions || []).map(function (t) { return t.gateway; }).join(' '),
    aviso_tipo: alert.type || '',
    aviso_campo: alert.target || '',
    aviso_texto: alert.message || (d.error ? String(d.error.message || '') : ''),
    so: dev.os || '',
    navegador: dev.navegador || '',
    ancho: dev.ancho || ''
  };
  fetch(SHEET_URL, {
    method: 'POST',
    mode: 'no-cors',
    keepalive: true,
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(row)
  });
}

EVENTS.forEach(function (name) { analytics.subscribe(name, send); });
