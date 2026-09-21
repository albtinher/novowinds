// Endpoint de diagnostico: confirma que las funciones estan desplegadas y si las
// variables SMTP estan presentes, sin exponer ningun valor.
exports.handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ok: true,
    smtpConfigured: Boolean(
      process.env.SMTP_HOST &&
        (process.env.SMTP_AUTH_USER || process.env.SMTP_USER) &&
        (process.env.SMTP_AUTH_PASS || process.env.SMTP_PASS),
    ),
  }),
});
