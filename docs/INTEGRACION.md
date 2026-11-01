# Integración de una aplicación con SENTINEL V6

1. En **Integrations**, registrá tu aplicación. Su URL es opcional.
2. Generá una API key y copiala en ese momento. La clave se muestra una sola vez.
3. Descargá el SDK desde **SDK & Docs** (`/sdk/sentinel-client.mjs`) o usá directamente la API HTTP.
4. En el backend cliente definí `SENTINEL_URL` y `SENTINEL_API_KEY`. No uses estas variables en el frontend.
5. Desde el backend ejecutá:

```js
import { SentinelClient } from './sdk/sentinel-client.mjs';
const sentinel = new SentinelClient({url:process.env.SENTINEL_URL,apiKey:process.env.SENTINEL_API_KEY});
await sentinel.safeTrack({event_type:'login_failed',source_ip:'203.0.113.10',message:'Intento fallido'});
```

La IP es de documentación. Usá una IP válida obtenida de manera segura desde el backend. `safeTrack` no interrumpe el flujo de negocio cuando SENTINEL no está disponible; `track` lanza errores.

La API recibe `POST /api/events` con `Authorization: Bearer <api key>` y JSON. `event_type` y `source_ip` son obligatorios. Opcionales: `user_identifier`, `message`, `external_event_id`, `metadata`. No envíes contraseñas, secretos ni información personal innecesaria.

Una respuesta **202** significa evento aceptado; **400** validación; **401** clave no válida; **403** aplicación desactivada; **429** límite excedido; **500** error del servidor. Revisá Live Events para verificar.

La API key identifica a la aplicación y su organización; SENTINEL no necesita conocer la URL del sitio cliente. Para monitorear nuevos comportamientos, el desarrollador debe instrumentar sus rutas de backend.
