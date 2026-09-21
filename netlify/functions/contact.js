const { handleContact } = require('../../server/contact-core');

// Netlify corta la funcion a los 10s, asi que los timeouts SMTP van por debajo
// de ese limite para poder devolver un error legible en lugar de un 502 mudo.
const TIMEOUTS = {
  connectionTimeout: 7000,
  greetingTimeout: 7000,
  socketTimeout: 8000,
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_TRACKED_IPS = 500;

// El contador vive en memoria del contenedor: como Netlify puede levantar varios
// en paralelo, el limite es aproximado. Basta para frenar el abuso repetitivo,
// que es justo lo que hace un bot de spam contra un formulario de contacto.
const recentHits = new Map();

function getClientIp(event) {
  const headers = event.headers || {};
  return (
    headers['x-nf-client-connection-ip'] ||
    (headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    'desconocida'
  );
}

function isRateLimited(ip, now) {
  if (recentHits.size > RATE_LIMIT_MAX_TRACKED_IPS) {
    pruneExpired(now);
  }

  const timestamps = (recentHits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (timestamps.length >= RATE_LIMIT_MAX) {
    recentHits.set(ip, timestamps);
    return true;
  }

  timestamps.push(now);
  recentHits.set(ip, timestamps);
  return false;
}

function pruneExpired(now) {
  for (const [ip, timestamps] of recentHits) {
    const vigentes = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (vigentes.length === 0) {
      recentHits.delete(ip);
    } else {
      recentHits.set(ip, vigentes);
    }
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...JSON_HEADERS, Allow: 'POST' },
      body: JSON.stringify({ ok: false, message: 'Metodo no permitido.' }),
    };
  }

  const ip = getClientIp(event);

  if (isRateLimited(ip, Date.now())) {
    console.warn(`[contact-api] Limite de envios superado desde ${ip}.`);
    return {
      statusCode: 429,
      headers: { ...JSON_HEADERS, 'Retry-After': '3600' },
      body: JSON.stringify({
        ok: false,
        message: 'Has enviado demasiadas consultas seguidas. Intentalo de nuevo mas tarde.',
      }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: JSON_HEADERS,
      body: JSON.stringify({ ok: false, message: 'Peticion no valida.' }),
    };
  }

  const result = await handleContact(body, { timeouts: TIMEOUTS });

  return {
    statusCode: result.status,
    headers: JSON_HEADERS,
    body: JSON.stringify(result.body),
  };
};
