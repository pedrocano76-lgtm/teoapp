

## Plan: Location filter visibility, upload comments, and photo detail editing

### 1. Location filter — Already working

The location filter in FilterDropdown only appears when at least one photo has location data. Since EXIF GPS extraction is implemented, it will show automatically once you upload photos taken with GPS enabled (most smartphone photos). No code change needed here — it's working as designed.

**However**, to make this clearer, we can show the location filter section even when empty, with a message like "No hay fotos con ubicación", so you know the feature exists.

### 2. Upload comments — Already working

The caption/comment field already exists in the upload dialog. No changes needed.

### 3. Edit photo details after upload (NEW)

Create a **PhotoEditDialog** component accessible from the lightbox (edit button) and from photo cards (context menu or edit icon). This dialog will allow:

- **Edit caption/notes** — update the `caption` field on the `photos` table
- **Add/change tags** — reuse `TagSelector` component, update `photo_tags` table
- **Add/change event** — select from existing events
- **View location** — show extracted location (read-only)
- **Delete photo** — with confirmation

**Files to create:**
- `src/components/PhotoEditDialog.tsx` — dialog with form for editing photo metadata

**Files to modify:**
- `src/components/PhotoLightbox.tsx` — add edit button that opens PhotoEditDialog
- `src/components/PhotoCard.tsx` — add edit option (small pencil icon on hover)
- `src/hooks/useData.ts` — add `useUpdatePhoto` and `useDeletePhoto` mutations
- `src/components/FilterDropdown.tsx` — show location section always with empty state message

### Technical details

- `useUpdatePhoto` mutation: updates `photos` row (caption, event_id) + replaces `photo_tags` entries
- `useDeletePhoto` mutation: deletes from `photos` table and removes file from storage
- PhotoEditDialog receives current photo data, loads its tags via `usePhotoTags`, and saves changes
- The `photos` table already has UPDATE RLS policy via `can_edit_child`, so no migration needed

