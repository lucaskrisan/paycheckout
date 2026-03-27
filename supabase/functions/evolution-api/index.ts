import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function evoFetch(path: string, method = "GET", body?: unknown) {
  const baseUrl = Deno.env.get("EVOLUTION_API_URL")!;
  const apiKey = Deno.env.get("EVOLUTION_API_KEY")!;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
      "Content-Type": "application/json",
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.text();
    try {
      return { status: res.status, data: JSON.parse(data) };
    } catch {
      return { status: res.status, data };
    }
  } catch (err) {
    clearTimeout(timeout);
    return { status: 500, data: { error: String(err) } };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: require valid JWT
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("authorization");
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader || "" } },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Check admin role
  const { data: hasAdmin } = await supabase.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });
  const { data: hasSuperAdmin } = await supabase.rpc("is_super_admin", {
    _user_id: user.id,
  });
  if (!hasAdmin && !hasSuperAdmin) {
    return json({ error: "Forbidden" }, 403);
  }

  try {
    const body = req.method !== "GET" ? await req.json() : {};
    const action = body.action || new URL(req.url).searchParams.get("action");

    switch (action) {
      // ─── List instances ───
      case "list_instances": {
        const result = await evoFetch("/instance/fetchInstances", "GET");
        return json(result.data, result.status);
      }

      // ─── Create instance ───
      case "create_instance": {
        const { instanceName, number } = body;
        if (!instanceName) return json({ error: "instanceName required" }, 400);
        const result = await evoFetch("/instance/create", "POST", {
          instanceName,
          number: number || undefined,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
        });
        return json(result.data, result.status);
      }

      // ─── Get QR Code ───
      case "get_qrcode": {
        const { instanceName } = body;
        if (!instanceName) return json({ error: "instanceName required" }, 400);
        const result = await evoFetch(`/instance/connect/${instanceName}`, "GET");
        return json(result.data, result.status);
      }

      // ─── Connection state ───
      case "connection_state": {
        const { instanceName } = body;
        if (!instanceName) return json({ error: "instanceName required" }, 400);
        const result = await evoFetch(`/instance/connectionState/${instanceName}`, "GET");
        return json(result.data, result.status);
      }

      // ─── Logout ───
      case "logout": {
        const { instanceName } = body;
        if (!instanceName) return json({ error: "instanceName required" }, 400);
        const result = await evoFetch(`/instance/logout/${instanceName}`, "DELETE");
        return json(result.data, result.status);
      }

      // ─── Delete instance ───
      case "delete_instance": {
        const { instanceName } = body;
        if (!instanceName) return json({ error: "instanceName required" }, 400);
        const result = await evoFetch(`/instance/delete/${instanceName}`, "DELETE");
        return json(result.data, result.status);
      }

      // ─── Send text message ───
      case "send_text": {
        const { instanceName, number, text } = body;
        if (!instanceName || !number || !text)
          return json({ error: "instanceName, number, text required" }, 400);
        const result = await evoFetch(`/message/sendText/${instanceName}`, "POST", {
          number,
          text,
        });
        return json(result.data, result.status);
      }

      // ─── Restart instance ───
      case "restart": {
        const { instanceName } = body;
        if (!instanceName) return json({ error: "instanceName required" }, 400);
        const result = await evoFetch(`/instance/restart/${instanceName}`, "PUT");
        return json(result.data, result.status);
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("evolution-api error:", err);
    return json({ error: String(err) }, 500);
  }
});
