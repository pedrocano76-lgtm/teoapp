import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listChildren from "./tools/list_children";
import listEvents from "./tools/list_events";
import listRecentPhotos from "./tools/list_recent_photos";
import createEvent from "./tools/create_event";

// The OAuth issuer MUST be the direct supabase.co host (never SUPABASE_URL,
// which on Lovable Cloud is a .lovable.cloud proxy). Read the project ref from
// VITE_SUPABASE_PROJECT_ID, which Vite inlines as a literal at build time so
// this module stays import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "memory-drawer-mcp",
  title: "Memory Drawer",
  version: "0.1.0",
  instructions:
    "Herramientas de Memory Drawer. Cada llamada actúa como el usuario que ha iniciado sesión y respeta sus permisos por hijo. Empieza por list_children para descubrir a qué niños tiene acceso el usuario, luego usa list_events / list_recent_photos con un child_id concreto. create_event solo funciona para propietarios o padres del niño.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listChildren, listEvents, listRecentPhotos, createEvent],
});
