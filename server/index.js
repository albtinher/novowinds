require('dotenv').config();

const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '250kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/contact', async (req, res) => {
  const payload = normalizePayload(req.body);

  if (!payload.ok) {
    return res.status(400).json({
      ok: false,
      message: payload.message,
    });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecureFromEnv = parseBoolean(process.env.SMTP_SECURE);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpAuthUser = process.env.SMTP_AUTH_USER || smtpUser;
  const smtpAuthPass = process.env.SMTP_AUTH_PASS || smtpPass;
  const contactTo = process.env.CONTACT_TO || 'direccion@novowinds.org';
  const contactFrom = process.env.CONTACT_FROM || smtpUser;
  const missingConfig = getMissingSmtpConfig({
    smtpHost,
    smtpAuthUser,
    smtpAuthPass,
    contactFrom,
  });
  const isProduction = process.env.NODE_ENV === 'production';
  const allowTestAccount = process.env.SMTP_ALLOW_TEST_ACCOUNT !== 'false';

  let transporter;
  let fromAddress = contactFrom;
  let usingTestAccount = false;

  if (missingConfig.length === 0) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecureFromEnv ?? smtpPort === 465,
      auth: {
        user: smtpAuthUser,
        pass: smtpAuthPass,
      },
    });
  } else if (!isProduction && allowTestAccount) {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    fromAddress = testAccount.user;
    usingTestAccount = true;
    console.warn(
      `[contact-api] SMTP real incompleto (${missingConfig.join(', ')}). Usando cuenta de prueba Ethereal para desarrollo.`,
    );
  } else {
    return res.status(500).json({
      ok: false,
      message: `Configuracion SMTP incompleta en el servidor. Faltan: ${missingConfig.join(', ')}`,
    });
  }

  const text = [
    `Curso/Servicio: ${payload.value.course}`,
    `Nombre: ${payload.value.fullName}`,
    `Email: ${payload.value.email}`,
    `Telefono: ${payload.value.phone || 'No indicado'}`,
    '',
    'Mensaje:',
    payload.value.message,
  ].join('\n');

  const html = `
    <h2>Nueva consulta desde Novowinds</h2>
    <p><strong>Curso/Servicio:</strong> ${escapeHtml(payload.value.course)}</p>
    <p><strong>Nombre:</strong> ${escapeHtml(payload.value.fullName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(payload.value.email)}</p>
    <p><strong>Telefono:</strong> ${escapeHtml(payload.value.phone || 'No indicado')}</p>
    <p><strong>Mensaje:</strong></p>
    <p>${escapeHtml(payload.value.message).replace(/\n/g, '<br>')}</p>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: contactTo,
      replyTo: payload.value.email,
      subject: `Nueva consulta Novowinds - ${payload.value.course}`,
      text,
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    if (previewUrl) {
      console.log(`[contact-api] Vista previa de email: ${previewUrl}`);
    }

    return res.status(200).json({
      ok: true,
      mode: usingTestAccount ? 'test' : 'smtp',
      previewUrl: previewUrl || null,
    });
  } catch (error) {
    console.error('Error sending email:', error);

    if (error && error.code === 'EAUTH') {
      return res.status(502).json({
        ok: false,
        message:
          'Autenticacion SMTP rechazada. En Gmail debes usar una contrasena de aplicacion (no la contrasena normal).',
      });
    }

    return res.status(502).json({
      ok: false,
      message: 'No se pudo enviar la consulta en este momento.',
    });
  }
});

function getMissingSmtpConfig({ smtpHost, smtpAuthUser, smtpAuthPass, contactFrom }) {
  const missing = [];
  if (!smtpHost) missing.push('SMTP_HOST');
  if (!smtpAuthUser) missing.push('SMTP_AUTH_USER|SMTP_USER');
  if (!smtpAuthPass) missing.push('SMTP_AUTH_PASS|SMTP_PASS');
  if (!contactFrom) missing.push('CONTACT_FROM');
  return missing;
}

app.listen(port, () => {
  console.log(`Contact API listening on port ${port}`);
});

function normalizePayload(body) {
  const course = cleanText(body?.course);
  const fullName = cleanText(body?.fullName);
  const email = cleanText(body?.email);
  const phone = cleanText(body?.phone);
  const message = cleanText(body?.message);

  if (!course || !fullName || !email || !message) {
    return { ok: false, message: 'Faltan datos obligatorios.' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Email no valido.' };
  }

  if (message.length < 10) {
    return { ok: false, message: 'El mensaje debe tener al menos 10 caracteres.' };
  }

  return {
    ok: true,
    value: {
      course,
      fullName,
      email,
      phone,
      message,
    },
  };
}

function parseBoolean(value) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  return undefined;
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
