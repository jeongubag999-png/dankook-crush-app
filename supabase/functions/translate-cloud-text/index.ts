import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const { text, targetLanguage, postId = null, field = "message" } = await req.json();
    const sourceText = typeof text === "string" ? text.trim() : "";

    if (!sourceText || sourceText.length > 2000) {
      return jsonResponse({ error: "Text must be between 1 and 2000 characters." }, 400);
    }
    if (!['ko', 'en'].includes(targetLanguage)) {
      return jsonResponse({ error: "Unsupported target language." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const googleApiKey =
      Deno.env.get("GOOGLE_CLOUD_TRANSLATION_API_KEY") ||
      Deno.env.get("GOOGLE_CLOUD_VISION_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey || !googleApiKey) {
      return jsonResponse({ error: "Translation service is not configured." }, 503);
    }

    const authorization = req.headers.get("authorization") || "";
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ error: "Authentication required." }, 401);
    }

    const sourceHash = await sha256(sourceText);
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: cached } = await supabase
      .from("cloud_text_translations")
      .select("translated_text, source_language")
      .eq("source_hash", sourceHash)
      .eq("target_language", targetLanguage)
      .maybeSingle();

    if (cached) {
      return jsonResponse({
        translatedText: cached.translated_text,
        sourceLanguage: cached.source_language,
        translated: cached.source_language !== targetLanguage,
        cached: true,
      });
    }

    const googleResponse = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(googleApiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: sourceText, target: targetLanguage, format: "text" }),
      }
    );

    if (!googleResponse.ok) {
      const providerError = await googleResponse.text();
      console.error("Google translation failed", googleResponse.status, providerError);
      return jsonResponse({ error: "Translation provider failed." }, 502);
    }

    const googleData = await googleResponse.json();
    const result = googleData?.data?.translations?.[0];
    const translatedText = String(result?.translatedText || sourceText);
    const sourceLanguage = String(result?.detectedSourceLanguage || "");

    await supabase.from("cloud_text_translations").upsert(
      {
        source_hash: sourceHash,
        source_text: sourceText,
        source_language: sourceLanguage || null,
        target_language: targetLanguage,
        translated_text: translatedText,
        post_id: postId,
        field_name: field,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_hash,target_language" }
    );

    return jsonResponse({
      translatedText,
      sourceLanguage,
      translated: Boolean(sourceLanguage && sourceLanguage !== targetLanguage),
      cached: false,
    });
  } catch (error) {
    console.error("translate-cloud-text failed", error);
    return jsonResponse({ error: "Unable to translate text." }, 500);
  }
});
