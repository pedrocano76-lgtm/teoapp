import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_recent_photos",
  title: "List recent photos",
  description:
    "List recent photos/videos for a child, most recent first. Returns metadata (caption, taken_at, event, location) plus a 1-hour signed URL for the file and thumbnail.",
  inputSchema: {
    child_id: z.string().uuid().describe("The child's id (from list_children)."),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ child_id, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const client = sb(ctx);
    const { data, error } = await client
      .from("photos")
      .select(
        "id, caption, taken_at, storage_path, thumbnail_path, media_type, duration_seconds, location_name, event_id, events(name)",
      )
      .eq("child_id", child_id)
      .order("taken_at", { ascending: false })
      .limit(limit);
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };

    const paths = [
      ...new Set(
        (data ?? []).flatMap((p: any) =>
          [p.storage_path, p.thumbnail_path].filter(Boolean),
        ),
      ),
    ];
    let signed: Record<string, string> = {};
    if (paths.length) {
      const { data: signedList } = await client.storage
        .from("photos")
        .createSignedUrls(paths, 60 * 60);
      for (const s of signedList ?? []) {
        if (s.path && s.signedUrl) signed[s.path] = s.signedUrl;
      }
    }

    const rows = (data ?? []).map((p: any) => ({
      id: p.id,
      caption: p.caption,
      taken_at: p.taken_at,
      media_type: p.media_type ?? "photo",
      duration_seconds: p.duration_seconds,
      location: p.location_name,
      event_name: p.events?.name ?? null,
      url: signed[p.storage_path] ?? null,
      thumbnail_url: p.thumbnail_path ? signed[p.thumbnail_path] ?? null : null,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { photos: rows },
    };
  },
});
