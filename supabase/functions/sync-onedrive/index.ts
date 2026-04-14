import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/microsoft_onedrive";

interface GatewayHeaders {
  Authorization: string;
  "X-Connection-Api-Key": string;
}

async function listFolderItems(itemId: string, headers: GatewayHeaders): Promise<any[]> {
  const url = `${GATEWAY_URL}/me/drive/items/${itemId}/children?$top=200&$select=id,name,file,folder,photo,size,createdDateTime,@microsoft.graph.downloadUrl,thumbnails&$expand=thumbnails`;
  console.log("Fetching:", url);
  const resp = await fetch(url, { headers });
  if (!resp.ok) {
    const t = await resp.text();
    console.error(`Error listing ${itemId}: ${resp.status} ${t}`);
    return [];
  }
  const data = await resp.json();
  return data.value || [];
}

async function scanRecursive(itemId: string, headers: GatewayHeaders, maxDepth = 5, currentDepth = 0): Promise<any[]> {
  if (currentDepth > maxDepth) return [];
  
  const items = await listFolderItems(itemId, headers);
  const images: any[] = [];
  const subfolders: any[] = [];

  for (const item of items) {
    if (item.file?.mimeType?.startsWith("image/")) {
      images.push(item);
    } else if (item.folder) {
      subfolders.push(item);
    }
  }

  console.log(`Depth ${currentDepth}: ${images.length} images, ${subfolders.length} subfolders in ${itemId}`);

  for (const folder of subfolders) {
    const subImages = await scanRecursive(folder.id, headers, maxDepth, currentDepth + 1);
    images.push(...subImages);
  }

  return images;
}

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

    const body = await req.json();
    const { action } = body;

    const gatewayHeaders: GatewayHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": ONEDRIVE_API_KEY,
    };

    // ─── LIST FOLDERS ───────────────────────────────────────────
    if (action === "list-folders") {
      const path = body.folderPath || "/me/drive/root/children";
      const resp = await fetch(`${GATEWAY_URL}${path}?$filter=folder ne null&$select=id,name,folder,parentReference`, {
        headers: gatewayHeaders,
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`Error al listar carpetas de OneDrive [${resp.status}]: ${t}`);
      }
      const data = await resp.json();
      return new Response(JSON.stringify({ folders: data.value || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── SCAN (index only, no AI) ───────────────────────────────
    if (action === "scan") {
      const { connectionId, childId, folderPath } = body;
      if (!connectionId || !childId || !folderPath) {
        return new Response(JSON.stringify({ error: "Faltan campos requeridos" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const itemIdMatch = folderPath.match(/\/me\/drive\/items\/([^/]+)/);
      if (!itemIdMatch) {
        return new Response(JSON.stringify({ error: "Ruta de carpeta inválida" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const itemId = itemIdMatch[1];

      console.log(`Starting recursive scan from ${itemId}`);
      const imageFiles = await scanRecursive(itemId, gatewayHeaders);
      console.log(`Total images found: ${imageFiles.length}`);

      // Check already imported
      const externalIds = imageFiles.map((f: any) => f.id);
      
      // Query in chunks of 500 to avoid query size limits
      const existingIds = new Set<string>();
      for (let i = 0; i < externalIds.length; i += 500) {
        const chunk = externalIds.slice(i, i + 500);
        const { data: existing } = await supabase
          .from("pending_imports")
          .select("external_id")
          .eq("cloud_connection_id", connectionId)
          .in("external_id", chunk);
        if (existing) existing.forEach((e: any) => existingIds.add(e.external_id));
      }

      const newFiles = imageFiles.filter((f: any) => !existingIds.has(f.id));

      if (newFiles.length === 0) {
        await supabase
          .from("cloud_connections")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", connectionId);

        return new Response(JSON.stringify({
          imported: 0,
          total_scanned: imageFiles.length,
          message: `Se escanearon ${imageFiles.length} fotos, no hay nuevas`,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert ALL new files as pending (status=pending, no AI yet)
      const rows = newFiles.map((f: any) => ({
        user_id: user.id,
        child_id: childId,
        cloud_connection_id: connectionId,
        source: "onedrive",
        external_id: f.id,
        thumbnail_url: f.thumbnails?.[0]?.medium?.url || null,
        full_image_url: f["@microsoft.graph.downloadUrl"] || null,
        file_name: f.name,
        taken_at: f.photo?.takenDateTime || f.createdDateTime || null,
        confidence_score: null, // Not analyzed yet
        status: "pending",
        metadata: {
          mimeType: f.file?.mimeType,
          size: f.size,
        },
      }));

      // Insert in chunks of 200
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error: insertError } = await supabase
          .from("pending_imports")
          .upsert(chunk, { onConflict: "cloud_connection_id,external_id" });
        if (insertError) {
          console.error("Insert error:", insertError);
          throw insertError;
        }
      }

      await supabase
        .from("cloud_connections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", connectionId);

      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "cloud_import",
        message: `Se encontraron ${newFiles.length} foto${newFiles.length > 1 ? 's' : ''} nuevas en OneDrive`,
        data: { count: newFiles.length, connectionId },
      });

      return new Response(
        JSON.stringify({
          imported: newFiles.length,
          total_scanned: imageFiles.length,
          total_new: newFiles.length,
          needs_analysis: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ANALYZE (AI batch - process N unanalyzed imports) ─────
    if (action === "analyze-batch") {
      const { childId, batchSize = 10 } = body;
      if (!childId) {
        return new Response(JSON.stringify({ error: "childId requerido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get reference photos for this child
      const { data: existingPhotos } = await supabase
        .from("photos")
        .select("storage_path")
        .eq("child_id", childId)
        .limit(3);

      let referenceUrls: string[] = [];
      if (existingPhotos && existingPhotos.length > 0) {
        const paths = existingPhotos.map(p => p.storage_path);
        const { data: signed } = await supabase.storage
          .from("photos")
          .createSignedUrls(paths, 3600);
        if (signed) {
          referenceUrls = signed.filter(s => s.signedUrl).map(s => s.signedUrl);
        }
      }

      if (referenceUrls.length === 0) {
        // No reference photos - can't do AI analysis, mark all as 0.5
        const { data: unanalyzed } = await supabase
          .from("pending_imports")
          .select("id")
          .eq("child_id", childId)
          .eq("status", "pending")
          .is("confidence_score", null);

        if (unanalyzed && unanalyzed.length > 0) {
          const ids = unanalyzed.map(u => u.id);
          for (let i = 0; i < ids.length; i += 200) {
            await supabase
              .from("pending_imports")
              .update({ confidence_score: 0.5 })
              .in("id", ids.slice(i, i + 200));
          }
        }

        return new Response(JSON.stringify({
          analyzed: unanalyzed?.length || 0,
          remaining: 0,
          no_references: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get a batch of unanalyzed imports
      const { data: batch } = await supabase
        .from("pending_imports")
        .select("*")
        .eq("child_id", childId)
        .eq("status", "pending")
        .is("confidence_score", null)
        .limit(batchSize);

      if (!batch || batch.length === 0) {
        return new Response(JSON.stringify({
          analyzed: 0,
          remaining: 0,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Count remaining
      const { count: totalRemaining } = await supabase
        .from("pending_imports")
        .select("id", { count: "exact", head: true })
        .eq("child_id", childId)
        .eq("status", "pending")
        .is("confidence_score", null);

      // Analyze batch with AI
      const results = await Promise.allSettled(
        batch.map(async (imp: any) => {
          const thumbnailUrl = imp.thumbnail_url || imp.full_image_url;
          if (!thumbnailUrl) return { id: imp.id, confidence: 0.5 };

          try {
            const aiResp = await fetch(
              "https://ai.gateway.lovable.dev/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  messages: [
                    {
                      role: "user",
                      content: [
                        {
                          type: "text",
                          text: `Compare these images. The first image(s) are reference photos of a specific child. The last image is a candidate photo. Does the candidate photo contain the same child? Reply with ONLY a JSON object: {"match": true/false, "confidence": 0.0-1.0}. Be generous - if unsure, lean towards true with lower confidence.`,
                        },
                        ...referenceUrls.map((url: string) => ({
                          type: "image_url",
                          image_url: { url },
                        })),
                        {
                          type: "image_url",
                          image_url: { url: thumbnailUrl },
                        },
                      ],
                    },
                  ],
                }),
              }
            );

            if (aiResp.status === 429 || aiResp.status === 402) {
              console.warn("AI rate limited, skipping:", imp.file_name);
              return { id: imp.id, confidence: 0.5 };
            }

            if (!aiResp.ok) {
              console.error("AI error:", await aiResp.text());
              return { id: imp.id, confidence: 0.5 };
            }

            const aiData = await aiResp.json();
            const content = aiData.choices?.[0]?.message?.content || "";
            const jsonMatch = content.match(/\{[^}]+\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              return {
                id: imp.id,
                confidence: parsed.match ? parsed.confidence : 0,
              };
            }
            return { id: imp.id, confidence: 0.5 };
          } catch (e) {
            console.error("AI analysis failed:", imp.file_name, e);
            return { id: imp.id, confidence: 0.5 };
          }
        })
      );

      // Update each import with its score
      let analyzedCount = 0;
      for (const result of results) {
        if (result.status === "fulfilled") {
          const { id, confidence } = result.value;
          await supabase
            .from("pending_imports")
            .update({ confidence_score: confidence })
            .eq("id", id);
          analyzedCount++;
        }
      }

      const remaining = (totalRemaining || 0) - analyzedCount;

      return new Response(
        JSON.stringify({
          analyzed: analyzedCount,
          remaining: Math.max(0, remaining),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Acción desconocida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-onedrive error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
