// Notifica el primer acceso de un invitado a un álbum compartido.
// - Email de bienvenida al invitado
// - Email a los owners/parents del/los hijo(s) compartido(s)
// Idempotente: marca family_shares.first_access_notified_at para no repetir.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APP_URL = "https://memorydrawer.app";

function buildWelcomeHtml(ownerName: string, childNames: string[]) {
  const names = formatNames(childNames);
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;background:#faf8f6;margin:0;padding:24px;color:#1c1c1e;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <h1 style="font-size:22px;margin:0 0 12px;color:#1c1c1e;">Te han compartido un álbum 💛</h1>
      <p style="font-size:16px;line-height:1.5;margin:0 0 20px;color:#3a3a3c;"><strong>${escapeHtml(ownerName)}</strong> te ha compartido los recuerdos de <strong>${escapeHtml(names)}</strong>.</p>
      <p style="font-size:15px;line-height:1.5;margin:0 0 28px;color:#3a3a3c;">Entra para ver las fotos y revivir cada momento.</p>
      <a href="${APP_URL}" style="display:inline-block;background:#FF7A6B;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:15px;">Abrir Memory Drawer</a>
      <p style="font-size:12px;color:#8e8e93;margin:32px 0 0;">Recibes este email porque aceptaste una invitación familiar.</p>
    </div>
  </body></html>`;
}

function buildOwnerHtml(viewerName: string, childName: string) {
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;background:#faf8f6;margin:0;padding:24px;color:#1c1c1e;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <h1 style="font-size:22px;margin:0 0 12px;color:#1c1c1e;">Nuevo familiar en el álbum 👀</h1>
      <p style="font-size:16px;line-height:1.5;margin:0 0 20px;color:#3a3a3c;"><strong>${escapeHtml(viewerName)}</strong> ha empezado a ver las fotos de <strong>${escapeHtml(childName)}</strong>.</p>
      <p style="font-size:15px;line-height:1.5;margin:0 0 28px;color:#3a3a3c;">Aprovecha para añadir nuevos recuerdos al cajón.</p>
      <a href="${APP_URL}" style="display:inline-block;background:#FF7A6B;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:15px;">Abrir Memory Drawer</a>
      <p style="font-size:12px;color:#8e8e93;margin:32px 0 0;">Recibes este email porque eres padre o madre en este álbum.</p>
    </div>
  </body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function formatNames(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} y ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} y ${names.at(-1)}`;
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
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const viewer = userData.user;

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
          await sendEmail(SERVICE_ROLE, SUPABASE_URL, {
            to: viewer.email,
            subject: `${ownerName} te ha compartido los recuerdos de ${formatNames(childNames)}`,
            html: buildWelcomeHtml(ownerName, childNames),
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
            await sendEmail(SERVICE_ROLE, SUPABASE_URL, {
              to: email,
              subject: `${viewerName} ha empezado a ver las fotos de ${child.name}`,
              html: buildOwnerHtml(viewerName, child.name),
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
