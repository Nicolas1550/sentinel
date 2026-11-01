# Registro de cambios — ATLAS V2

- Conserva el código Full Stack original, incluyendo login JWT, favoritos y feed USGS.
- Time Machine con control de tiempo, reproducción, pausa y velocidades 1×/2×/4×.
- Efecto de intensidad por magnitud sobre el globo (halos; no simulación física).
- Analítica con tendencia temporal, comparativa de regiones y eventos de mayor magnitud.
- Research Desk: guardar título, notas y filtros en PostgreSQL; listar, reabrir y eliminar por usuario.
- Migración incremental `database/04-ATLAS-V2.sql` para la tabla `investigations`, sin borrar las tablas V1.
- Exportación CSV de eventos filtrados y URL compartible con filtros.
- Botón renombrado a «Guardar en favoritos» para mayor claridad.
- Render 3D optimizado: límite de pixel ratio y pausa de dibujo fuera de pantalla.
- Se restauraron `public/` y `database/` que no estaban en el ZIP subido por el usuario.
- Seguridad del paquete: **no contiene `.env.local`, `.next` ni credenciales**.
- Verificación de sintaxis TypeScript, importaciones y estructura disponible en scripts.

## Lo que NO afirmamos haber completado

- Compilación real de Next.js: requiere instalar dependencias con npm en tu PC.
- Pruebas E2E o pruebas de integración contra tu Neon: no se han ejecutado.
- Alertas push/correo en tiempo real, IA, historial sísmico de meses, heatmap científico, ni endurecimiento total de autenticación.
