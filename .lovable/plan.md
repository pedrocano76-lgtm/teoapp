

## Sincronización con nubes de fotos + detección facial

### Resumen

Crear un sistema que conecte con servicios de almacenamiento en la nube (OneDrive, Google Photos, iCloud), detecte fotos nuevas con la cara del niño, y proponga añadirlas a Little Moments. El usuario decide qué fotos importar — no es automático al 100%.

### Análisis de viabilidad por servicio

| Servicio | API disponible | Detección facial | Viabilidad |
|----------|---------------|-------------------|------------|
| **OneDrive** | Sí (conector disponible en Lovable) | No nativa, necesita IA aparte | Alta |
| **Google Photos** | Sí (API pública, pero sin conector Lovable) | Google ya agrupa por caras, pero la API no expone esa info | Media |
| **iCloud/Apple** | No tiene API pública | N/A | Muy baja |

### Arquitectura propuesta

```text
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  OneDrive / │────▶│  Edge Function   │────▶│  Lovable AI     │
│  Google     │     │  (sync-photos)   │     │  (Gemini Vision)│
│  Photos     │     │                  │     │  Face matching   │
└─────────────┘     └──────┬───────────┘     └────────┬────────┘
                           │                          │
                           ▼                          ▼
                    ┌──────────────┐          ┌───────────────┐
                    │  pending_    │          │  "¿Añadir     │
                    │  imports     │          │   esta foto?" │
                    │  (DB table)  │          │   (UI)        │
                    └──────────────┘          └───────────────┘
```

### Plan de implementación

**Fase 1 — OneDrive (conector ya disponible)**

1. **Conectar OneDrive** vía el conector estándar de Lovable
2. **Edge function `sync-onedrive`**: Listar fotos recientes de una carpeta seleccionada del usuario vía el connector gateway
3. **Tabla `pending_imports`**: Almacenar fotos candidatas con thumbnail, fecha y estado (pending/accepted/rejected)
4. **Detección facial con Lovable AI (Gemini Vision)**: Enviar thumbnails al modelo con una foto de referencia del niño para determinar si aparece en la imagen
5. **UI de revisión**: Pantalla donde el padre ve las fotos sugeridas y acepta/rechaza con un toque. Las aceptadas se descargan y almacenan en el bucket privado
6. **Sincronización periódica** (opcional): cron job que revise nuevas fotos cada X horas

**Fase 2 — Google Photos (requiere OAuth propio)**

7. Google Photos no tiene conector Lovable, así que requeriría configurar credenciales OAuth propias en Google Cloud Console. Mismo flujo que OneDrive pero con la API de Google Photos.

**Fase 3 — iCloud** — No viable. Apple no ofrece API pública para acceder a fotos.

### Modelo de privacidad

- Las fotos de la nube **nunca se comparten con invitados automáticamente**. Solo el padre las ve en la pantalla de revisión.
- La foto de referencia facial del niño se almacena solo en el bucket privado.
- El análisis facial se hace vía Lovable AI (Gemini), sin almacenar datos biométricos.
- Las fotos importadas siguen las mismas reglas de visibilidad (`is_shared`) que las subidas manualmente.
- Los invitados/guests nunca ven la funcionalidad de sincronización.

### Limitaciones a considerar

- **Precisión facial**: Gemini Vision es bueno pero no perfecto. Habrá falsos positivos/negativos, de ahí la revisión manual.
- **Coste**: Cada análisis de imagen consume créditos de Lovable AI. Con muchas fotos puede acumularse.
- **Google Photos**: Requiere que configures un proyecto en Google Cloud Console (gratis pero manual).
- **iCloud**: Descartado por falta de API.
- **Volumen**: Para usuarios con miles de fotos, habría que paginar y limitar el escaneo inicial.

### Detalles técnicos

- **DB**: Nueva tabla `pending_imports` (id, user_id, child_id, source, external_id, thumbnail_url, status, metadata, created_at)
- **DB**: Nueva tabla `cloud_connections` (id, user_id, provider, folder_path, last_synced_at) para rastrear qué carpetas están vinculadas
- **Edge functions**: `sync-onedrive` (listar + analizar), `import-photo` (descargar y guardar)
- **Foto de referencia**: Al configurar la sincronización, el padre sube 2-3 fotos de referencia del niño que se usan como prompt para Gemini
- **UI**: Nueva sección en Settings o en el menú lateral: "Sincronización con la nube"

### Recomendación

Empezar con **OneDrive** (Fase 1) ya que el conector está disponible y es plug-and-play. El flujo sería: conectar OneDrive → seleccionar carpeta → el sistema escanea fotos nuevas → sugiere las que tienen la cara del niño → el padre acepta con un toque.

¿Quieres que empiece con la Fase 1 (OneDrive)?

