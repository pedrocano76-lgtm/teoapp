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
  name: "create_event",
  title: "Create event",
  description:
    "Create an event for a child (e.g. birthday, trip, milestone). RLS enforces that only owners/parents of the child can create events.",
  inputSchema: {
    child_id: z.string().uuid(),
    name: z.string().min(1).max(120),
    start_date: z.string().describe("ISO date, e.g. 2026-07-22."),
    end_date: z.string().nullable().default(null).describe("Optional ISO end date for multi-day events."),
    icon: z.string().default("◆"),
    color: z.string().default("#D4793A"),
    description: z.string().nullable().default(null),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("events")
      .insert({
        child_id: input.child_id,
        name: input.name,
        start_date: input.start_date,
        end_date: input.end_date,
        icon: input.icon,
        color: input.color,
        description: input.description,
      })
      .select()
      .single();
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Created event ${data.id}` }],
      structuredContent: { event: data },
    };
  },
});
