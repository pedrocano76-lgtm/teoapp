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

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action } = body;

    if (action === "list-folders") {
      // List root folders from OneDrive
      const path = body.folderPath || "/me/drive/root/children";
      const resp = await fetch(`${GATEWAY_URL}${path}?$filter=folder ne null&$select=id,name,folder,parentReference`, {
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": ONEDRIVE_API_KEY,
        },
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`OneDrive API error [${resp.status}]: ${t}`);
      }
      const data = await resp.json();
      return new Response(JSON.stringify({ folders: data.value || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "scan") {
      const { connectionId, childId, folderPath, referencePhotoUrls } = body;
      if (!connectionId || !childId || !folderPath) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch photos from OneDrive folder
      const resp = await fetch(
        `${GATEWAY_URL}${folderPath}:/children?$filter=file ne null&$top=50&$select=id,name,file,photo,createdDateTime,@microsoft.graph.downloadUrl,thumbnails&$expand=thumbnails`,
        {
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": ONEDRIVE_API_KEY,
          },
        }
      );
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`OneDrive scan error [${resp.status}]: ${t}`);
      }
      const data = await resp.json();
      const imageFiles = (data.value || []).filter((f: any) =>
        f.file?.mimeType?.startsWith("image/")
      );

      // Check which files are already imported
      const externalIds = imageFiles.map((f: any) => f.id);
      const { data: existing } = await supabase
        .from("pending_imports")
        .select("external_id")
        .eq("cloud_connection_id", connectionId)
        .in("external_id", externalIds);

      const existingIds = new Set((existing || []).map((e: any) => e.external_id));
      const newFiles = imageFiles.filter((f: any) => !existingIds.has(f.id));

      if (newFiles.length === 0) {
        // Update last_synced_at
        await supabase
          .from("cloud_connections")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", connectionId);

        return new Response(JSON.stringify({ imported: 0, message: "No hay fotos nuevas" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Analyze with Gemini Vision if reference photos provided
      let analyzedFiles = newFiles.map((f: any) => ({
        ...f,
        confidence: null as number | null,
      }));

      if (referencePhotoUrls && referencePhotoUrls.length > 0) {
        // Process in batches of 5
        for (let i = 0; i < analyzedFiles.length; i += 5) {
          const batch = analyzedFiles.slice(i, i + 5);
          const results = await Promise.allSettled(
            batch.map(async (file: any) => {
              const thumbnailUrl =
                file.thumbnails?.[0]?.medium?.url ||
                file["@microsoft.graph.downloadUrl"];
              if (!thumbnailUrl) return { ...file, confidence: 0.5 };

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
                            ...referencePhotoUrls.map((url: string) => ({
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
                  console.warn("AI rate limited, skipping analysis for:", file.name);
                  return { ...file, confidence: 0.5 };
                }

                if (!aiResp.ok) {
                  console.error("AI error:", await aiResp.text());
                  return { ...file, confidence: 0.5 };
                }

                const aiData = await aiResp.json();
                const content = aiData.choices?.[0]?.message?.content || "";
                const jsonMatch = content.match(/\{[^}]+\}/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  return {
                    ...file,
                    confidence: parsed.match ? parsed.confidence : 0,
                  };
                }
                return { ...file, confidence: 0.5 };
              } catch (e) {
                console.error("AI analysis failed for:", file.name, e);
                return { ...file, confidence: 0.5 };
              }
            })
          );

          for (let j = 0; j < results.length; j++) {
            if (results[j].status === "fulfilled") {
              analyzedFiles[i + j] = (results[j] as PromiseFulfilledResult<any>).value;
            }
          }
        }
      }

      // Filter: only import files with confidence > 0.3 or no analysis
      const candidates = analyzedFiles.filter(
        (f) => f.confidence === null || f.confidence > 0.3
      );

      // Insert pending imports
      if (candidates.length > 0) {
        const rows = candidates.map((f: any) => ({
          user_id: user.id,
          child_id: childId,
          cloud_connection_id: connectionId,
          source: "onedrive",
          external_id: f.id,
          thumbnail_url: f.thumbnails?.[0]?.medium?.url || null,
          full_image_url: f["@microsoft.graph.downloadUrl"] || null,
          file_name: f.name,
          taken_at: f.photo?.takenDateTime || f.createdDateTime || null,
          confidence_score: f.confidence,
          status: "pending",
          metadata: {
            mimeType: f.file?.mimeType,
            size: f.size,
          },
        }));

        const { error: insertError } = await supabase
          .from("pending_imports")
          .upsert(rows, { onConflict: "cloud_connection_id,external_id" });
        if (insertError) throw insertError;
      }

      // Update last_synced_at
      await supabase
        .from("cloud_connections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", connectionId);

      return new Response(
        JSON.stringify({
          imported: candidates.length,
          total_found: newFiles.length,
          analyzed: referencePhotoUrls?.length > 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-onedrive error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
