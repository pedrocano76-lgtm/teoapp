

## Mejoras en la sincronización con OneDrive

### Problema principal: conexión por usuario

El conector de OneDrive de Lovable autentica **tu cuenta** (Pedro), no la de cada usuario. Esto significa que todos los usuarios de la app accederían a **tu** OneDrive, no al suyo. **No es posible hacer OAuth per-user con el conector estándar.**

Para que cada usuario conecte su propio OneDrive, necesitaríamos implementar un flujo OAuth completo propio (registrar app en Azure, gestionar tokens por usuario, refresh tokens, etc.). Esto es significativamente más complejo y requiere que tú crees una app en el portal de Azure.

**Propuesta pragmática**: Dado que esta app es para tu familia, usar tu conexión OneDrive es válido como punto de partida. Los padres con rol `parent` podrían usar esta funcionalidad para importar desde tus carpetas compartidas.

### Problemas técnicos actuales

1. **Error 404 al escanear**: La URL de la API de OneDrive está mal construida (`/me/drive/items/{id}:/children` no es válida). Hay que usar `/me/drive/items/{id}/children`.

2. **Sin feedback visual**: No hay indicador de progreso durante el escaneo ni el análisis facial. El usuario no sabe qué está pasando.

3. **Sin acción clara post-vinculación**: Vincular una carpeta no desencadena nada visible.

### Plan de mejoras

**1. Corregir el escaneo (edge function `sync-onedrive`)**
- Arreglar la URL de la API: usar `/me/drive/items/{id}/children` en lugar del formato actual con `:/children`.
- Mejorar el manejo de errores con mensajes claros en español.

**2. Flujo guiado con feedback visual (CloudSyncSettings)**
- Al vincular carpeta: automáticamente iniciar el primer escaneo.
- Barra de progreso durante el escaneo: "Buscando fotos...", "Analizando 15 fotos...", "3 coincidencias encontradas".
- Usar polling o un estado intermedio para mostrar que algo está procesándose.

**3. Pantalla de revisión mejorada (PendingImportsReview)**
- Mover la revisión a una vista dedicada (diálogo/modal) que se abre al terminar el escaneo o al tocar una notificación.
- Mostrar las fotos en grid grande con botones claros de aceptar/rechazar.
- Badge de confianza más intuitivo (verde = alta, amarillo = media).

**4. Sincronización automática diaria**
- Crear un cron job con `pg_cron` que llame a `sync-onedrive` una vez al día.
- Cuando encuentre fotos nuevas, crear un registro de notificación en una tabla `notifications`.
- Mostrar un badge/indicador en el sidebar cuando haya fotos pendientes de revisar.

**5. Notificaciones de fotos nuevas**
- Nueva tabla `notifications` (user_id, type, message, read, created_at).
- Icono de campana en el header con contador de no leídas.
- Al tocar la notificación, abre directamente la revisión de fotos.

### Archivos a modificar/crear

- `supabase/functions/sync-onedrive/index.ts` — corregir URLs y mejorar respuestas
- `src/components/CloudSyncSettings.tsx` — feedback visual, auto-scan
- `src/components/PendingImportsReview.tsx` — mejorar UI de revisión
- `src/pages/Index.tsx` — integrar notificaciones
- Nueva migración: tabla `notifications` + cron job para sync diario

### Sobre OAuth per-user (futuro)

Si en el futuro quieres que cada usuario conecte su propio OneDrive, sería necesario:
1. Registrar una app en Azure Portal (gratuito)
2. Implementar flujo OAuth con redirect en una edge function
3. Almacenar tokens por usuario en la DB
4. Gestionar refresh de tokens automáticamente

Esto es viable pero requiere configuración manual en Azure. Lo podemos abordar como fase 2 si lo necesitas.

