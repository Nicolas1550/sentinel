ATLAS V4 - INSTALACIÓN SEGURA SOBRE V3
=======================================
1. Conservá tu proyecto V3 original como copia de seguridad.
2. Descomprimí este ZIP en una carpeta NUEVA.
3. Neon SQL Editor: ejecutá database/06-ATLAS-V4.sql (NO el instalador original).
   Requiere que 04-ATLAS-V2.sql y 05-ATLAS-V3.sql ya estén aplicados.
4. Copiá tu .env.local privado a la nueva carpeta. Añadí CRON_SECRET.
5. En PowerShell dentro de la carpeta nueva:
   npm.cmd ci
   npm.cmd run verify
   npm.cmd run syntax
   npm.cmd run test
   npm.cmd run typecheck
   npm.cmd run build
   npm.cmd run dev
6. Abrí la URL local indicada por Next.js y probá:
   - Laboratorio -> investigación -> asociar terremoto USGS -> guardar nota.
   - Historical Explorer -> Consultar archivo Neon.
   - Alert Center -> ver estado de sincronización y reglas.
   - Report Studio -> guardar resumen -> Compartir -> abrir URL -> Privatizar.
7. Para automatización real, desplegá en Vercel con DATABASE_URL,
   JWT_SECRET y CRON_SECRET en variables privadas.

NO COMPARTAS .env.local, JWT_SECRET, CRON_SECRET NI DATABASE_URL.
NO SE BORRAN USUARIOS, FAVORITOS NI INVESTIGACIONES.

Leé CAMBIOS-V4.md para instrucciones detalladas y límites de la versión.
