

## Plan: Sorting fix, location extraction, sidebar menu, swipe lightbox

### 1. Fix sort order (bug)

**Root cause**: `Timeline.tsx` (line 15) and `AllChildrenTimeline.tsx` (line 14) both hardcode ascending sort, overriding the `sortOrder` from Index.tsx.

**Fix**: Pass `sortOrder` prop to both components and use it instead of hardcoded ascending. Also reverse the group iteration order when descending.

### 2. Photo location from EXIF + location filter

- Extend `exif-utils.ts` to extract GPS coordinates (latitude/longitude) from EXIF data.
- Add a `location_lat`, `location_lng`, and `location_name` columns to the `photos` table via migration. The location name will be reverse-geocoded using a free service or stored as raw coordinates.
- On upload, extract and store GPS data alongside the date.
- Display location in PhotoCard and PhotoLightbox when available.
- Add a location filter in the FilterDropdown (list of unique location names).

### 3. Sidebar menu

Replace the current inline header controls with a proper sidebar layout using the existing `SidebarProvider` / `Sidebar` components:

- **Account**: Show user email, display name, sign out.
- **Children management**: List children, add/edit child.
- **Family sharing**: Add parent/family member (existing ShareAlbumDialog logic).
- **Settings**: Theme color picker, dark mode toggle (add `ThemeProvider` with localStorage persistence and Tailwind `dark` class).

The main content area (hero, filters, timeline) moves into the sidebar layout's content region. The sidebar will be collapsible on mobile.

### 4. Swipe gestures in Lightbox

Add touch swipe support to `PhotoLightbox.tsx`:
- Track `touchstart` and `touchend` events.
- Calculate horizontal delta; if > 50px threshold, navigate next/prev.
- Works alongside existing arrow buttons and keyboard controls.

### Technical details

**Files to modify:**
- `src/components/Timeline.tsx` — accept and use `sortOrder` prop
- `src/components/AllChildrenTimeline.tsx` — accept and use `sortOrder` prop
- `src/pages/Index.tsx` — pass `sortOrder` to timelines; restructure into sidebar layout
- `src/components/PhotoLightbox.tsx` — add touch event handlers for swipe
- `src/lib/exif-utils.ts` — add `getExifLocation()` function
- `src/hooks/useData.ts` — pass location data on upload
- `src/components/FilterDropdown.tsx` — add location filter section
- `src/components/PhotoCard.tsx` — show location if available

**New files:**
- `src/components/AppSidebar.tsx` — sidebar with navigation sections
- `src/components/SettingsPanel.tsx` — theme/color/dark mode settings
- `src/components/ChildrenManager.tsx` — list and manage children
- `src/hooks/useTheme.tsx` — dark mode and color theme provider

**Database migration:**
- Add `location_lat DOUBLE PRECISION`, `location_lng DOUBLE PRECISION`, `location_name TEXT` to `photos` table.

