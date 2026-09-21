require('dotenv').config();

const express = require('express');
const { handleContact } = require('./contact-core');

// Servidor solo para desarrollo local (npm run start:api + proxy.conf.json).
// En produccion el envio lo hace netlify/functions/contact.js con esta misma logica.

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '250kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/contact', async (req, res) => {
  const result = await handleContact(req.body, { allowTestAccount: true });
  res.status(result.status).json(result.body);
});

app.listen(port, () => {
  console.log(`Contact API listening on port ${port}`);
});
