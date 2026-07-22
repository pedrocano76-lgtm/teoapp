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
  name: "list_children",
  title: "List children",
  description:
    "List every child the signed-in user can access in Memory Drawer (owned or shared with them). Returns id, name, birth date, and role.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("children")
      .select("id, name, birth_date, owner_id, color");
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      birth_date: c.birth_date,
      color: c.color,
      role: c.owner_id === ctx.getUserId() ? "owner" : "shared",
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { children: rows },
    };
  },
});
