// Edge function genérica para enviar emails transaccionales vía Resend
// Acepta POST { to, subject, html } y opcionalmente { from, text, reply_to }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const DEFAULT_FROM = "Memory Drawer <noreply@memorydrawer.app>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Auth: require a valid Supabase user JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, subject, html, text, from, reply_to } = body as Record<string, unknown>;

    const recipients = Array.isArray(to) ? to : typeof to === "string" ? [to] : [];
    if (recipients.length === 0 || recipients.some((r) => typeof r !== "string" || !r.includes("@"))) {
      return new Response(JSON.stringify({ error: "Invalid 'to' (string or string[] with valid emails required)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof subject !== "string" || subject.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Invalid 'subject'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((typeof html !== "string" || html.trim().length === 0) && (typeof text !== "string" || text.trim().length === 0)) {
      return new Response(JSON.stringify({ error: "Provide 'html' or 'text'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurado");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY no configurado");

    const payload: Record<string, unknown> = {
      from: typeof from === "string" && from.length > 0 ? from : DEFAULT_FROM,
      to: recipients,
      subject,
    };
    if (typeof html === "string") payload.html = html;
    if (typeof text === "string") payload.text = text;
    if (typeof reply_to === "string") payload.reply_to = reply_to;

    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const respBody = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("Resend error", resp.status, respBody);
      return new Response(JSON.stringify({ error: "send_failed", detail: respBody }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: respBody?.id ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("send-email error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
