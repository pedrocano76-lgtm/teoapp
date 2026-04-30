// Daily birthday notifications. Triggered by pg_cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const APP_URL = "https://memorydrawer.app";

function isSameMonthDay(d1: Date, d2: Date) {
  return d1.getUTCMonth() === d2.getUTCMonth() && d1.getUTCDate() === d2.getUTCDate();
}

function calcAge(birth: Date, on: Date) {
  let age = on.getUTCFullYear() - birth.getUTCFullYear();
  const m = on.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

function buildHtml(childName: string, age: number, when: "today" | "tomorrow") {
  const title = when === "today"
    ? `¡Hoy es el cumpleaños de ${childName}! 🎂`
    : `¡Mañana es el cumpleaños de ${childName}! 🎂`;
  const intro = when === "today"
    ? `${childName} cumple <strong>${age}</strong> ${age === 1 ? "año" : "años"} hoy.`
    : `Mañana ${childName} cumplirá <strong>${age}</strong> ${age === 1 ? "año" : "años"}.`;
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;background:#faf8f6;margin:0;padding:24px;color:#1c1c1e;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <h1 style="font-size:22px;margin:0 0 12px;color:#1c1c1e;">${title}</h1>
      <p style="font-size:16px;line-height:1.5;margin:0 0 20px;color:#3a3a3c;">${intro}</p>
      <p style="font-size:15px;line-height:1.5;margin:0 0 28px;color:#3a3a3c;">Es un buen momento para revivir recuerdos y añadir nuevas fotos al cajón.</p>
      <a href="${APP_URL}" style="display:inline-block;background:#FF7A6B;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:15px;">Abrir Memory Drawer</a>
      <p style="font-size:12px;color:#8e8e93;margin:32px 0 0;">Recibes este email porque activaste las notificaciones de cumpleaños.</p>
    </div>
  </body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const { data: children, error: childrenErr } = await admin
      .from("children")
      .select("id, name, birth_date");
    if (childrenErr) throw childrenErr;

    let sent = 0;
    let skipped = 0;
    const errors: Array<{ childId: string; reason: string }> = [];

    for (const child of children ?? []) {
      const birth = new Date(child.birth_date + "T00:00:00Z");
      const isToday = isSameMonthDay(birth, today);
      const isTomorrow = isSameMonthDay(birth, tomorrow);
      if (!isToday && !isTomorrow) {
        skipped++;
        continue;
      }
      const when: "today" | "tomorrow" = isToday ? "today" : "tomorrow";
      const referenceDate = isToday ? today : tomorrow;
      const age = calcAge(birth, referenceDate);

      const { data: settings, error: settingsErr } = await admin
        .from("birthday_notification_settings")
        .select("user_id, notify_same_day, notify_day_before")
        .eq("child_id", child.id);
      if (settingsErr) {
        errors.push({ childId: child.id, reason: settingsErr.message });
        continue;
      }

      const userIds = (settings ?? [])
        .filter((s) => (isToday ? s.notify_same_day : s.notify_day_before))
        .map((s) => s.user_id);

      for (const userId of userIds) {
        const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(userId);
        if (userErr || !userRes?.user?.email) {
          errors.push({ childId: child.id, reason: `user ${userId}: ${userErr?.message ?? "no email"}` });
          continue;
        }
        const email = userRes.user.email;
        const subject = when === "today"
          ? `¡Hoy es el cumpleaños de ${child.name}! 🎂`
          : `¡Mañana es el cumpleaños de ${child.name}! 🎂`;
        const html = buildHtml(child.name, age, when);

        const { error: invokeErr } = await admin.functions.invoke("send-email", {
          body: { to: email, subject, html },
        });
        if (invokeErr) {
          errors.push({ childId: child.id, reason: `send-email ${email}: ${invokeErr.message}` });
        } else {
          sent++;
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent, skipped, errors, ranAt: now.toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("send-birthday-notifications error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
