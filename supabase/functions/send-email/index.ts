// Edge function genérica para enviar emails transaccionales vía Resend
// Acepta POST { to, subject, html } y opcionalmente { text, reply_to }
// `from` está hardcodeado para evitar spoofing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_ADDRESS = "Memory Drawer <noreply@memorydrawer.app>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const isServiceRole = token === SERVICE_ROLE;

    let callerUserId: string | null = null;
    let callerEmail: string | null = null;

    if (!isServiceRole) {
      const supabase = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerUserId = userData.user.id;
      callerEmail = userData.user.email?.toLowerCase() ?? null;
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, subject, html, text, reply_to, template, inviteCode } = body as Record<string, unknown>;

    const recipients = (Array.isArray(to) ? to : typeof to === "string" ? [to] : [])
      .filter((r): r is string => typeof r === "string" && r.includes("@"))
      .map((r) => r.toLowerCase());

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid 'to'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let finalSubject: string;
    let finalHtml: string | undefined;
    let finalText: string | undefined;

    if (!isServiceRole) {
      // End-user callers MAY NOT supply arbitrary HTML/subject. Only server-built
      // templates are allowed to prevent the function from being abused as a
      // phishing relay using the app's verified sender identity.
      if (template !== "invite") {
        return new Response(JSON.stringify({ error: "Only 'invite' template is allowed" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (typeof inviteCode !== "string" || !/^[A-Z0-9]{4,16}$/.test(inviteCode)) {
        return new Response(JSON.stringify({ error: "Invalid 'inviteCode'" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Verify the invite code belongs to a share owned by the caller for this recipient
      const adminCheck = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { data: share } = await adminCheck
        .from("family_shares")
        .select("id, shared_with_email, family_owner_id, invite_code")
        .eq("invite_code", inviteCode)
        .eq("family_owner_id", callerUserId!)
        .maybeSingle();
      if (!share || String(share.shared_with_email).toLowerCase() !== recipients[0]) {
        return new Response(JSON.stringify({ error: "Invite not found for recipient" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const inviteUrl = `https://memorydrawer.app/auth?invite=${encodeURIComponent(inviteCode)}&email=${encodeURIComponent(recipients[0])}`;
      finalSubject = "¡Tienes una invitación! 📸 Memorydrawer";
      finalHtml = `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">¡Tienes una invitación! 📸</h2>
        <p style="color: #555;">Alguien de tu familia te ha invitado a ver el álbum de fotos familiar en <strong>Memorydrawer</strong>.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteUrl}" style="background: #e8756a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Ver el álbum familiar</a>
        </div>
        <p style="color: #999; font-size: 12px;">Si no esperabas esta invitación, puedes ignorar este email.</p>
      </div>`;
    } else {
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
      finalSubject = subject;
      if (typeof html === "string") finalHtml = html;
      if (typeof text === "string") finalText = text;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurado");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY no configurado");

    const payload: Record<string, unknown> = {
      from: FROM_ADDRESS,
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
