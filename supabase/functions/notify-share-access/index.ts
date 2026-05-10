// Notifica el primer acceso de un invitado a un álbum compartido.
// - Email de bienvenida al invitado
// - Email a los owners/parents del/los hijo(s) compartido(s)
// Idempotente: marca family_shares.first_access_notified_at para no repetir.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APP_URL = "https://memorydrawer.app";

type Lang = 'es' | 'en';

const T = {
  es: {
    welcomeTitle: 'Te han compartido un álbum 💛',
    welcomeBody: (owner: string, names: string) => `<strong>${owner}</strong> te ha compartido los recuerdos de <strong>${names}</strong>.`,
    welcomeCta: 'Entra para ver las fotos y revivir cada momento.',
    open: 'Abrir Memory Drawer',
    welcomeFooter: 'Recibes este email porque aceptaste una invitación familiar.',
    ownerTitle: 'Nuevo familiar en el álbum 👀',
    ownerBody: (viewer: string, child: string) => `<strong>${viewer}</strong> ha empezado a ver las fotos de <strong>${child}</strong>.`,
    ownerCta: 'Aprovecha para añadir nuevos recuerdos al cajón.',
    ownerFooter: 'Recibes este email porque eres padre o madre en este álbum.',
    welcomeSubject: (owner: string, names: string) => `${owner} te ha compartido los recuerdos de ${names}`,
    ownerSubject: (viewer: string, child: string) => `${viewer} ha empezado a ver las fotos de ${child}`,
    join: (a: string, b: string) => `${a} y ${b}`,
    joinLast: ' y ',
  },
  en: {
    welcomeTitle: 'An album has been shared with you 💛',
    welcomeBody: (owner: string, names: string) => `<strong>${owner}</strong> has shared the memories of <strong>${names}</strong> with you.`,
    welcomeCta: 'Sign in to see the photos and relive every moment.',
    open: 'Open Memory Drawer',
    welcomeFooter: 'You are receiving this email because you accepted a family invitation.',
    ownerTitle: 'New family member in the album 👀',
    ownerBody: (viewer: string, child: string) => `<strong>${viewer}</strong> has started viewing photos of <strong>${child}</strong>.`,
    ownerCta: 'Add new memories to the drawer.',
    ownerFooter: 'You are receiving this email because you are a parent in this album.',
    welcomeSubject: (owner: string, names: string) => `${owner} shared the memories of ${names} with you`,
    ownerSubject: (viewer: string, child: string) => `${viewer} started viewing photos of ${child}`,
    join: (a: string, b: string) => `${a} and ${b}`,
    joinLast: ' and ',
  },
} as const;

function buildWelcomeHtml(lang: Lang, ownerName: string, childNames: string[]) {
  const t = T[lang];
  const names = formatNames(lang, childNames);
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;background:#faf8f6;margin:0;padding:24px;color:#1c1c1e;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <h1 style="font-size:22px;margin:0 0 12px;color:#1c1c1e;">${t.welcomeTitle}</h1>
      <p style="font-size:16px;line-height:1.5;margin:0 0 20px;color:#3a3a3c;">${t.welcomeBody(escapeHtml(ownerName), escapeHtml(names))}</p>
      <p style="font-size:15px;line-height:1.5;margin:0 0 28px;color:#3a3a3c;">${t.welcomeCta}</p>
      <a href="${APP_URL}" style="display:inline-block;background:#FF7A6B;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:15px;">${t.open}</a>
      <p style="font-size:12px;color:#8e8e93;margin:32px 0 0;">${t.welcomeFooter}</p>
    </div>
  </body></html>`;
}

function buildOwnerHtml(lang: Lang, viewerName: string, childName: string) {
  const t = T[lang];
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;background:#faf8f6;margin:0;padding:24px;color:#1c1c1e;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <h1 style="font-size:22px;margin:0 0 12px;color:#1c1c1e;">${t.ownerTitle}</h1>
      <p style="font-size:16px;line-height:1.5;margin:0 0 20px;color:#3a3a3c;">${t.ownerBody(escapeHtml(viewerName), escapeHtml(childName))}</p>
      <p style="font-size:15px;line-height:1.5;margin:0 0 28px;color:#3a3a3c;">${t.ownerCta}</p>
      <a href="${APP_URL}" style="display:inline-block;background:#FF7A6B;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:15px;">${t.open}</a>
      <p style="font-size:12px;color:#8e8e93;margin:32px 0 0;">${t.ownerFooter}</p>
    </div>
  </body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function formatNames(lang: Lang, names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  const sep = T[lang].joinLast;
  if (names.length === 2) return `${names[0]}${sep}${names[1]}`;
  return `${names.slice(0, -1).join(", ")}${sep}${names.at(-1)}`;
}

async function getLocale(admin: any, userId: string): Promise<Lang> {
  const { data } = await admin.from('profiles').select('locale').eq('user_id', userId).maybeSingle();
  const loc = data?.locale;
  return loc === 'es' ? 'es' : loc === 'en' ? 'en' : 'en';
}

async function sendEmail(serviceRole: string, supabaseUrl: string, payload: { to: string; subject: string; html: string }) {
  const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRole}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`send-email ${res.status}: ${detail}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validar JWT del usuario que hace la llamada (el invitado entrando por primera vez)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userRes?.user?.id) {
      console.error("getUser failed:", userErr?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const viewer = { id: userRes.user.id, email: userRes.user.email ?? null };

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Buscar shares pendientes de notificar para este usuario
    const { data: shares, error: sharesErr } = await admin
      .from("family_shares")
      .select("id, family_owner_id, shared_with_user_id, first_access_notified_at")
      .eq("shared_with_user_id", viewer.id)
      .is("first_access_notified_at", null);
    if (sharesErr) throw sharesErr;

    if (!shares || shares.length === 0) {
      return new Response(JSON.stringify({ ok: true, notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Nombre del invitado (display_name o email)
    const { data: viewerProfile } = await admin
      .from("profiles").select("display_name").eq("user_id", viewer.id).maybeSingle();
    const viewerName = viewerProfile?.display_name || viewer.email || "Un familiar";

    // Agrupar por owner
    const byOwner = new Map<string, string[]>();
    for (const s of shares) {
      const arr = byOwner.get(s.family_owner_id) ?? [];
      arr.push(s.id);
      byOwner.set(s.family_owner_id, arr);
    }

    let notified = 0;
    const errors: string[] = [];

    for (const [ownerId, shareIds] of byOwner) {
      // Hijos del owner que el invitado puede ver
      const { data: children, error: childrenErr } = await admin
        .from("children").select("id, name, owner_id").eq("owner_id", ownerId);
      if (childrenErr) { errors.push(`children ${ownerId}: ${childrenErr.message}`); continue; }
      const childList = children ?? [];
      if (childList.length === 0) {
        // Sin hijos, marcar como notificado igualmente y seguir
        await admin.from("family_shares").update({ first_access_notified_at: new Date().toISOString() }).in("id", shareIds);
        continue;
      }

      // Datos del owner
      const { data: ownerProfile } = await admin
        .from("profiles").select("display_name").eq("user_id", ownerId).maybeSingle();
      const { data: ownerUserRes } = await admin.auth.admin.getUserById(ownerId);
      const ownerName = ownerProfile?.display_name || ownerUserRes?.user?.email || "Un familiar";

      // 1) Email de bienvenida al invitado (uno por owner, listando todos sus hijos)
      if (viewer.email) {
        try {
          const childNames = childList.map((c) => c.name);
          const viewerLang = await getLocale(admin, viewer.id);
          const tv = T[viewerLang];
          await sendEmail(SERVICE_ROLE, SUPABASE_URL, {
            to: viewer.email,
            subject: tv.welcomeSubject(ownerName, formatNames(viewerLang, childNames)),
            html: buildWelcomeHtml(viewerLang, ownerName, childNames),
          });
        } catch (e) {
          errors.push(`welcome ${viewer.email}: ${(e as Error).message}`);
        }
      }

      // 2) Email a owners + parents de cada hijo
      for (const child of childList) {
        // Destinatarios: owner del hijo + parents en family_shares
        const recipientIds = new Set<string>([child.owner_id]);
        const { data: parents } = await admin
          .from("family_shares")
          .select("shared_with_user_id")
          .eq("family_owner_id", child.owner_id)
          .eq("role", "parent")
          .not("shared_with_user_id", "is", null);
        for (const p of parents ?? []) {
          if (p.shared_with_user_id) recipientIds.add(p.shared_with_user_id);
        }
        // No notificarse a sí mismo
        recipientIds.delete(viewer.id);

        for (const rid of recipientIds) {
          const { data: rUser } = await admin.auth.admin.getUserById(rid);
          const email = rUser?.user?.email;
          if (!email) continue;
          try {
            const rLang = await getLocale(admin, rid);
            const tr = T[rLang];
            await sendEmail(SERVICE_ROLE, SUPABASE_URL, {
              to: email,
              subject: tr.ownerSubject(viewerName, child.name),
              html: buildOwnerHtml(rLang, viewerName, child.name),
            });
          } catch (e) {
            errors.push(`owner ${email}: ${(e as Error).message}`);
          }
        }
      }

      // Marcar como notificados
      const { error: updErr } = await admin
        .from("family_shares")
        .update({ first_access_notified_at: new Date().toISOString() })
        .in("id", shareIds);
      if (updErr) errors.push(`mark notified: ${updErr.message}`);
      else notified += shareIds.length;
    }

    return new Response(JSON.stringify({ ok: true, notified, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("notify-share-access error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
