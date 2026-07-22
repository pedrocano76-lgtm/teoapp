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
  name: "list_events",
  title: "List events",
  description:
    "List events for a child (birthdays, trips, milestones). Ordered by start date descending. Requires child_id.",
  inputSchema: {
    child_id: z.string().uuid().describe("The child's id (from list_children)."),
    limit: z.number().int().min(1).max(200).default(50).describe("Max events to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ child_id, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("events")
      .select("id, name, icon, start_date, end_date, color, description, child_id")
      .eq("child_id", child_id)
      .order("start_date", { ascending: false })
      .limit(limit);
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { events: data },
    };
  },
});
