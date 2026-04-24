import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/microsoft_onedrive";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const ONEDRIVE_API_KEY = Deno.env.get("MICROSOFT_ONEDRIVE_API_KEY");
    if (!ONEDRIVE_API_KEY) throw new Error("MICROSOFT_ONEDRIVE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { action, importIds } = await req.json();

    if (action === "accept") {
      if (!importIds || !Array.isArray(importIds) || importIds.length === 0) {
        return new Response(JSON.stringify({ error: "importIds required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch pending imports
      const { data: imports, error: fetchError } = await supabase
        .from("pending_imports")
        .select("*")
        .in("id", importIds)
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (fetchError) throw fetchError;
      if (!imports || imports.length === 0) {
        return new Response(JSON.stringify({ error: "No pending imports found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: { id: string; success: boolean; error?: string }[] = [];

      for (const imp of imports) {
        try {
          // Always re-fetch download URL since stored ones expire after ~1 hour
          let downloadUrl: string | null = null;
          const itemResp = await fetch(
            `${GATEWAY_URL}/me/drive/items/${imp.external_id}`,
            {
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": ONEDRIVE_API_KEY,
              },
            }
          );
          if (itemResp.ok) {
            const itemData = await itemResp.json();
            downloadUrl = itemData["@microsoft.graph.downloadUrl"] || itemData["@content.downloadUrl"] || itemData.downloadUrl || null;
          } else {
            console.error(`Failed to get download URL for ${imp.external_id}: ${itemResp.status}`);
          }

          // Fallback to stored URL if re-fetch failed
          if (!downloadUrl) downloadUrl = imp.full_image_url;

          // Download the file
          let fileResp: Response | null = null;
          if (downloadUrl) {
            const resp = await fetch(downloadUrl);
            if (resp.ok) {
              fileResp = resp;
            } else {
              console.error(`Failed to download via temporary URL for ${imp.external_id}: ${resp.status}`);
            }
          }

          if (!fileResp) {
            const gatewayResp = await fetch(`${GATEWAY_URL}/me/drive/items/${imp.external_id}/content`, {
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": ONEDRIVE_API_KEY,
              },
            });

            if (!gatewayResp.ok) throw new Error(`Failed to download: ${gatewayResp.status}`);
            fileResp = gatewayResp;
          }

          const fileBlob = await fileResp.blob();

          // Determine extension
          const ext = imp.file_name?.split(".").pop()?.toLowerCase() || "jpg";
          const storagePath = `${user.id}/${imp.child_id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;

          // Upload to Supabase storage
          const { error: uploadError } = await supabase.storage
            .from("photos")
            .upload(storagePath, fileBlob, {
              contentType: (imp.metadata as any)?.mimeType || "image/jpeg",
            });
          if (uploadError) throw uploadError;

          // Create photo record
          const { error: insertError } = await supabase.from("photos").insert({
            child_id: imp.child_id,
            uploaded_by: user.id,
            storage_path: storagePath,
            taken_at: imp.taken_at || new Date().toISOString(),
            is_shared: true,
            caption: null,
          });
          if (insertError) throw insertError;

          // Mark as accepted
          await supabase
            .from("pending_imports")
            .update({ status: "accepted" })
            .eq("id", imp.id);

          results.push({ id: imp.id, success: true });
        } catch (e) {
          console.error("Import failed for:", imp.id, e);
          results.push({
            id: imp.id,
            success: false,
            error: "No se pudo importar esta foto",
          });
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reject") {
      if (!importIds || !Array.isArray(importIds)) {
        return new Response(JSON.stringify({ error: "importIds required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("pending_imports")
        .update({ status: "rejected" })
        .in("id", importIds)
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-photo error:", e);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
