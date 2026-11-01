# SENTINEL V6 — corrección de imports

Se agregaron `getDb()` e `isDatabaseConfigured()` en `src/lib/db.ts`, y `getUserId()` en `src/lib/auth.ts`, conservando `pool`, `query()` y `getSession()`.

**Importante:** el ZIP que proporcionaste no contiene las rutas `/api/alerts`, `/api/notifications`, `/api/preferences`, `/api/regions`, `/api/reports` o `/api/sync/status` que aparecen en tu compilación local. Por eso no es posible verificar ni corregir esas rutas desde este ZIP. `getDb()` devuelve un `pg.Pool`, no un cliente de otra librería. Si las rutas agregadas esperan una interfaz diferente, habrá que adaptar su código.

Para instalar, extraer en una carpeta nueva, copiar solo tu `.env.local` privado (sin subirlo a GitHub), instalar dependencias y ejecutar `npm.cmd run build`. No mezclar carpetas `src` de versiones diferentes.
