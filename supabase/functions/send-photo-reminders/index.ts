// Edge function: detecta usuarios inactivos y envía recordatorios por email vía Resend
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

interface ChildRow {
  id: string;
  name: string;
  owner_id: string;
}

interface PhotoRow {
  child_id: string;
  taken_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let force = false;
  let onlyUserId: string | null = null;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      force = body?.force === true;
      onlyUserId = typeof body?.user_id === "string" ? body.user_id : null;
    } catch (_) { /* sin body */ }
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurado");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY no configurado");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1) Cargar settings habilitados (filtrados si onlyUserId)
    let q = supabase
      .from("reminder_settings")
      .select("user_id, inactivity_days, last_reminder_sent_at")
      .eq("enabled", true);
    if (onlyUserId) q = q.eq("user_id", onlyUserId);
    const { data: settings, error: sErr } = await q;
    if (sErr) throw sErr;

    const now = new Date();
    const results: Array<{ user_id: string; status: string; detail?: string }> = [];

    for (const s of settings ?? []) {
      try {
        // No reenviar si ya se envió uno hace menos de inactivity_days (salvo force)
        if (!force && s.last_reminder_sent_at) {
          const diffDays = (now.getTime() - new Date(s.last_reminder_sent_at).getTime()) / 86400000;
          if (diffDays < s.inactivity_days) {
            results.push({ user_id: s.user_id, status: "skipped_recent" });
            continue;
          }
        }

        // Hijos del usuario (como owner)
        const { data: children } = await supabase
          .from("children")
          .select("id, name, owner_id")
          .eq("owner_id", s.user_id);

        if (!children || children.length === 0) {
          results.push({ user_id: s.user_id, status: "no_children" });
          continue;
        }

        const childIds = (children as ChildRow[]).map((c) => c.id);

        // Última foto subida para cualquiera de sus hijos
        const { data: lastPhoto } = await supabase
          .from("photos")
          .select("child_id, taken_at")
          .in("child_id", childIds)
          .order("taken_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const referenceDate = lastPhoto
          ? new Date((lastPhoto as PhotoRow).taken_at)
          : null;

        const daysSince = referenceDate
          ? Math.floor((now.getTime() - referenceDate.getTime()) / 86400000)
          : Infinity;

        if (!force && daysSince < s.inactivity_days) {
          results.push({ user_id: s.user_id, status: "active" });
          continue;
        }

        // Email del usuario desde auth.users
        const { data: userData, error: uErr } = await supabase.auth.admin.getUserById(s.user_id);
        if (uErr || !userData?.user?.email) {
          results.push({ user_id: s.user_id, status: "no_email" });
          continue;
        }
        const email = userData.user.email;
        const displayName =
          (userData.user.user_metadata?.full_name as string | undefined) ?? "";

        const childrenNames = (children as ChildRow[]).map((c) => c.name);
        const albumLabel =
          childrenNames.length === 1
            ? `el álbum de ${childrenNames[0]}`
            : "tus álbumes";

        const daysText = daysSince === Infinity ? "muchos días" : `${daysSince} días`;

        const subject = `Llevas ${daysText} sin añadir fotos`;
        const html = `
<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
    <div style="max-width:560px;margin:0 auto;padding:48px 32px;">
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:500;margin:0 0 16px;color:#1a1a1a;">
        ${displayName ? `Hola ${displayName.split(" ")[0]},` : "Hola,"}
      </h1>
      <p style="font-size:17px;line-height:1.6;color:#3a3a3a;margin:0 0 24px;">
        Llevas <strong>${daysText}</strong> sin añadir fotos a ${albumLabel}.
      </p>
      <p style="font-size:17px;line-height:1.6;color:#3a3a3a;margin:0 0 32px;">
        ¿Qué ha pasado esta semana? Una pequeña foto cualquiera ya cuenta una historia.
      </p>
      <a href="https://teoapp.lovable.app"
         style="display:inline-block;background:#FF7A6E;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:500;">
        Añadir una foto
      </a>
      <p style="font-size:13px;line-height:1.5;color:#9a9a9a;margin:48px 0 0;">
        Recibes este recordatorio porque lo activaste en tus ajustes. Puedes cambiar la frecuencia o desactivarlo cuando quieras.
      </p>
    </div>
  </body>
</html>`;

        const resp = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: "Recordatorios <onboarding@resend.dev>",
            to: [email],
            subject,
            html,
          }),
        });

        const respBody = await resp.json();
        if (!resp.ok) {
          results.push({ user_id: s.user_id, status: "send_error", detail: JSON.stringify(respBody) });
          continue;
        }

        await supabase
          .from("reminder_settings")
          .update({ last_reminder_sent_at: now.toISOString() })
          .eq("user_id", s.user_id);

        results.push({ user_id: s.user_id, status: "sent" });
      } catch (innerErr) {
        const msg = innerErr instanceof Error ? innerErr.message : String(innerErr);
        results.push({ user_id: s.user_id, status: "error", detail: msg });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("send-photo-reminders error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
