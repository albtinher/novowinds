# Novowinds

Plataforma web full-stack (frontend y backend) orientada a pilotos con licencia PPL que buscan obtener la CPL bajo normativa EASA en España. Ofrece gestión, seguimiento y asesoramiento personalizado para una progresión formativa eficiente hacia la aviación comercial.

## Development

Frontend:

```bash
npm start
```

Backend:

```bash
npm run start:api
```

Build:

```bash
npm run build
```

## Envío de correo

El formulario de contacto envía a través de `smtp.gmail.com:465` con una contraseña
de aplicación de Google (la contraseña normal de la cuenta no funciona).

- **Producción:** función serverless en [netlify/functions/contact.js](netlify/functions/contact.js).
  Netlify sí permite salida SMTP por el puerto 465.
- **Desarrollo:** servidor Express en [server/index.js](server/index.js) (`npm run start:api`),
  al que Angular hace proxy mediante `proxy.conf.json`.
- Ambos comparten la lógica de [server/contact-core.js](server/contact-core.js).

> Render **no** sirve para esto: desde el 26-09-2025 su plan gratuito bloquea el
> tráfico saliente a los puertos SMTP 25, 465 y 587, y la conexión se queda colgada
> hasta agotar el tiempo de espera.

Las variables de entorno (ver `.env.example`) se configuran en
*Netlify → Site configuration → Environment variables*. Comprobación rápida del
despliegue: `curl https://<tu-sitio>/api/health` devuelve `smtpConfigured: true`.
