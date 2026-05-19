# Landing page refresh

All changes live in `src/pages/Landing.tsx`. No new files, no business logic touched.

## 1. Replace the preview "app mock"

Remove the current 3×2 grid of generic SVG tiles and the `sage` green color. Replace with a small **timeline mockup**:

- Keep the existing white rounded card and the header row ("Tu hijo · línea de tiempo…").
- Inside, render two age-group blocks stacked vertically:
  - Group header line: `◆ 6 meses` in `#D4793A`, small caps-style label in `#7A6A5A` next to it (e.g. "marzo · 12 fotos").
  - Below: 2-column grid of 4 photo placeholder rectangles (`aspect-[4/5]`, `borderRadius: 8`) using only brand tones: `#D4793A`, `#E2CEBC`, `#C8B4A2`, `#EDE8DF`. Solid fills, no icons inside.
  - Second group `◆ 7 meses` with another 2 placeholders.
- Keep the tag chips row below, but recolor the green "parque" chip to a warm tone (`#EDE8DF` bg, `#7A6A5A` text) so no green remains.
- Remove the `sage` constant usage on the landing.

## 2. Complete features list

Replace the current 3-item inline array with **7 items**, each using a `lucide-react` icon colored `#D4793A`:

| # | Icon | Title | Description |
|---|---|---|---|
| 1 | `CalendarClock` | Línea de tiempo automática | Agrupa por meses y semanas desde el nacimiento, sin que hagas nada. |
| 2 | `Star` | Eventos y primeras veces | Marca momentos únicos: primer baño, primera palabra, primer cumpleaños. |
| 3 | `Users` | Comparte con tu familia | Invita por enlace. Abuelos, tíos, primos — cada uno con su rol. |
| 4 | `MessageCircle` | Fotos desde WhatsApp | Sube fotos recibidas por WhatsApp sin perder la fecha original. |
| 5 | `Copy` | Detección de duplicados | Encuentra y elimina fotos repetidas automáticamente. |
| 6 | `MoonStar` | Modo oscuro y claro | Se adapta al sistema de tu móvil. |
| 7 | `Smartphone` | Funciona como app | Instálala en tu móvil como una app nativa, sin pasar por ninguna tienda. |

Keep the existing row layout (icon tile + title + description). Add `import` from `lucide-react` at the top.

## 3. New privacy section

Insert between features and the (now removed) testimonial slot:

- Full-width band with background `#E8E0D5`, rounded `16`, padding `28px 24px`, centered text.
- `Shield` icon from `lucide-react`, 32px, `#D4793A`, centered above the title.
- Title (serif, 22px, `#4A3728`): **Tus fotos, solo tuyas**
- Body (15px, `#7A6A5A`, max-width ~420px, centered): *"Las fotos de tus hijos son tuyas y solo tuyas. Memorydrawer no vende tus datos, no usa tus imágenes para publicidad ni para entrenar inteligencia artificial. Tu álbum familiar no es un producto."*

## 4. Remove testimonial

Delete the entire "Ana, mamá de Pablo" white card (quote mark, italic paragraph, attribution, dot pagination). Replace with a single centered line above the final CTA:

> *Sé de los primeros en probarlo.*

Style: serif italic, 15px, `#7A6A5A`, centered, `margin: 24px 0`.

## Technical notes

- File: `src/pages/Landing.tsx` only.
- Add `lucide-react` imports (already in deps).
- Keep the existing inline-style approach used throughout the file (no Tailwind refactor) so the diff stays scoped.
- Remove unused `sage` / `peach` references where they no longer apply; keep `peach` if still used by the timeline mock placeholders, otherwise drop it.
