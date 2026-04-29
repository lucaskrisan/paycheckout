import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as djwt from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { action, appId, code, clientId, clientSecret } = await req.json();

    // 1. Geração de Código/Token de Instalação (Handshake)
    if (action === "generate-install-code") {
      const authHeader = req.headers.get("Authorization")!;
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!user) throw new Error("Unauthorized");

      const { data: app } = await supabase.from("marketplace_apps").select("*").eq("id", appId).single();
      if (!app) throw new Error("App not found");

      const installCode = crypto.randomUUID();
      await supabase.from("marketplace_oauth_codes").insert({
        code: installCode,
        app_id: appId,
        user_id: user.id
      });

      const installUrl = `https://gatflow.com/auth/panttera/install?shop_id=${user.id}&code=${installCode}`;
      return new Response(JSON.stringify({ url: installUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Troca de Token (Token Exchange POST /oauth/token)
    if (action === "exchange-token") {
      const { data: app } = await supabase.from("marketplace_apps")
        .select("*")
        .eq("client_id", clientId)
        .eq("client_secret", clientSecret)
        .single();
      
      if (!app) return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401, headers: corsHeaders });

      const { data: oauthCode } = await supabase.from("marketplace_oauth_codes")
        .select("*")
        .eq("code", code)
        .eq("app_id", app.id)
        .is("used_at", null)
        .single();

      if (!oauthCode || new Date(oauthCode.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Invalid or expired code" }), { status: 400, headers: corsHeaders });
      }

      const accessToken = crypto.randomUUID();
      
      await supabase.from("marketplace_oauth_codes").update({ used_at: new Date().toISOString() }).eq("id", oauthCode.id);
      await supabase.from("marketplace_app_installations").upsert({
        app_id: app.id,
        user_id: oauthCode.user_id,
        access_token: accessToken,
        active: true
      });

      return new Response(JSON.stringify({ access_token: accessToken, token_type: "Bearer" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. SSO JWT Generation
    if (action === "generate-sso-url") {
      const authHeader = req.headers.get("Authorization")!;
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!user) throw new Error("Unauthorized");

      const { data: app } = await supabase.from("marketplace_apps").select("*").eq("id", appId).single();
      if (!app) throw new Error("App not found");

      const payload = {
        shop_id: user.id,
        admin_email: user.email,
        exp: djwt.getNumericDate(5 * 60) // 5 minutes
      };

      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(app.sso_secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const token = await djwt.create({ alg: "HS256", typ: "JWT" }, payload, key);
      const ssoUrl = `https://gatflow.com/auth/sso?token=${token}`;
      
      return new Response(JSON.stringify({ url: ssoUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
