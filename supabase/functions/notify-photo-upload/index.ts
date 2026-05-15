// Notifica (in-app + email) cuando un usuario sube fotos nuevas.
// - Crea entradas en `notifications` para todos los usuarios con acceso al hijo
//   (excluyendo al uploader).
// - Envía un email vía la función `send-email` a los mismos usuarios, respetando
//   su preferencia `notify_uploads_email`.
// - Si el mismo uploader sube más fotos del mismo hijo en menos de 5 minutos,
//   se actualiza la notificación existente y se reusa el mismo email (no se
//   reenvía).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APP_URL = "https://memorydrawer.app";
const BATCH_WINDOW_MS = 5 * 60 * 1000;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const uploaderId = userRes.user.id;

    const body = await req.json().catch(() => null) as
      | { childId?: string; photoIds?: string[] } | null;
    if (!body?.childId || !Array.isArray(body.photoIds) || body.photoIds.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const childId = body.childId;
    const photoIds = body.photoIds.slice(0, 200);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Child + owner
    const { data: child } = await admin
      .from("children")
      .select("id, name, owner_id")
      .eq("id", childId)
      .maybeSingle();
    if (!child) {
      return new Response(JSON.stringify({ error: "Child not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: caller must have edit access to this child.
    const { data: canEdit, error: canEditErr } = await userClient
      .rpc("can_edit_child", { child_uuid: childId });
    if (canEditErr || !canEdit) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Uploader display name
    const { data: uploaderProfile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("user_id", uploaderId)
      .maybeSingle();
    const uploaderName = uploaderProfile?.display_name?.trim() || "Alguien";

    // Recipients = owner + family_shares.shared_with_user_id (any role)
    const recipients = new Set<string>();
    if (child.owner_id && child.owner_id !== uploaderId) recipients.add(child.owner_id);
    const { data: shares } = await admin
      .from("family_shares")
      .select("shared_with_user_id")
      .eq("family_owner_id", child.owner_id);
    for (const s of shares || []) {
      if (s.shared_with_user_id && s.shared_with_user_id !== uploaderId) {
        recipients.add(s.shared_with_user_id);
      }
    }

    if (recipients.size === 0) {
      return new Response(JSON.stringify({ ok: true, recipients: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Photo storage paths for thumbnails (up to 4 in email)
    const { data: photoRows } = await admin
      .from("photos")
      .select("id, thumbnail_path, storage_path")
      .in("id", photoIds)
      .eq("child_id", childId);

    const previewPaths: string[] = (photoRows || [])
      .map((p: any) => p.thumbnail_path)
      .filter((p): p is string => Boolean(p))
      .slice(0, 4);

    let signedThumbs: string[] = [];
    if (previewPaths.length > 0) {
      const { data: signed } = await admin.storage
        .from("photos")
        .createSignedUrls(previewPaths, 60 * 60 * 24 * 7);
      signedThumbs = (signed || []).map((s: any) => s.signedUrl).filter(Boolean);
    }

    const now = Date.now();
    const cutoff = new Date(now - BATCH_WINDOW_MS).toISOString();
    const uploadedAt = new Date(now).toISOString();

    // For each recipient: upsert notification + maybe email
    for (const recipientId of recipients) {
      // Find recent batch
      const { data: existing } = await admin
        .from("notifications")
        .select("id, data")
        .eq("user_id", recipientId)
        .eq("type", "photo_upload")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(10);

      const match = (existing || []).find((n: any) =>
        n.data?.uploader_id === uploaderId && n.data?.child_id === childId
      );

      const prevIds: string[] = match?.data?.photo_ids ?? [];
      const mergedIds = Array.from(new Set([...prevIds, ...photoIds]));
      const totalCount = mergedIds.length;
      const lastEmailAt: string | null = match?.data?.last_email_sent_at ?? null;

      const message = `${uploaderName} ha añadido ${totalCount} foto${totalCount === 1 ? "" : "s"} nueva${totalCount === 1 ? "" : "s"} de ${child.name}`;

      const newData = {
        uploader_id: uploaderId,
        uploader_name: uploaderName,
        child_id: childId,
        child_name: child.name,
        photo_ids: mergedIds,
        upload_date: uploadedAt,
        last_email_sent_at: lastEmailAt,
      };

      if (match) {
        await admin.from("notifications")
          .update({ message, data: newData, read: false })
          .eq("id", match.id);
      } else {
        const { data: inserted } = await admin.from("notifications")
          .insert({
            user_id: recipientId,
            type: "photo_upload",
            message,
            data: newData,
          })
          .select("id")
          .single();
        if (inserted) match && (match.id = inserted.id);
      }

      // Email decision: respect preference + 5-min batching
      const sentRecently =
        lastEmailAt && now - new Date(lastEmailAt).getTime() < BATCH_WINDOW_MS;
      if (sentRecently) continue;

      const { data: prefs } = await admin
        .from("reminder_settings")
        .select("notify_uploads_email")
        .eq("user_id", recipientId)
        .maybeSingle();
      const emailEnabled = prefs?.notify_uploads_email ?? true;
      if (!emailEnabled) continue;

      const { data: userInfo } = await admin.auth.admin.getUserById(recipientId);
      const recipientEmail = userInfo?.user?.email;
      if (!recipientEmail) continue;

      const safeUploader = escapeHtml(uploaderName);
      const safeChild = escapeHtml(child.name);
      const subject = `${safeUploader} ha añadido recuerdos nuevos de ${safeChild}`.replace(/[\r\n]/g, " ");
      const dateStr = new Date(uploadedAt).toLocaleDateString("es-ES", {
        day: "numeric", month: "long", year: "numeric",
      });
      const thumbsHtml = signedThumbs.length
        ? `<div style="display:flex;gap:8px;margin:20px 0;flex-wrap:wrap;">${
            signedThumbs.map(u =>
              `<img src="${escapeHtml(u)}" alt="" style="width:120px;height:120px;object-fit:cover;border-radius:8px;" />`
            ).join("")
          }</div>`
        : "";
      const html = `
        <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color:#1a1a1a;">
          <h2 style="margin:0 0 12px;">📸 ${safeUploader} ha añadido recuerdos nuevos</h2>
          <p style="color:#555; line-height:1.5;">
            Hay <strong>${totalCount}</strong> foto${totalCount === 1 ? "" : "s"}
            nueva${totalCount === 1 ? "" : "s"} de <strong>${safeChild}</strong>
            (${dateStr}).
          </p>
          ${thumbsHtml}
          <div style="text-align:center; margin: 28px 0;">
            <a href="${APP_URL}/app" style="background:#e8756a; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">
              Ver en Memorydrawer
            </a>
          </div>
          <p style="color:#999; font-size:12px;">
            Recibes este email porque tienes acceso al álbum de ${child.name}. Puedes desactivar estos avisos en Ajustes.
          </p>
        </div>
      `;

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_ROLE}`,
          },
          body: JSON.stringify({ to: recipientEmail, subject, html }),
        });
        if (res.ok) {
          // Persist last_email_sent_at on the notification we just upserted
          const newSentAt = new Date().toISOString();
          await admin.from("notifications")
            .update({ data: { ...newData, last_email_sent_at: newSentAt } })
            .eq("user_id", recipientId)
            .eq("type", "photo_upload")
            .gte("created_at", cutoff);
        } else {
          console.error("send-email failed", res.status, await res.text().catch(() => ""));
        }
      } catch (e) {
        console.error("send-email error", e);
      }
    }

    return new Response(JSON.stringify({ ok: true, recipients: recipients.size }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("notify-photo-upload error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
