const { handleContact } = require('../../server/contact-core');

// Netlify corta la funcion a los 10s, asi que los timeouts SMTP van por debajo
// de ese limite para poder devolver un error legible en lugar de un 502 mudo.
const TIMEOUTS = {
  connectionTimeout: 7000,
  greetingTimeout: 7000,
  socketTimeout: 8000,
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...JSON_HEADERS, Allow: 'POST' },
      body: JSON.stringify({ ok: false, message: 'Metodo no permitido.' }),
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
