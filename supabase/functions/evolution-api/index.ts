import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// In-memory QR code cache (per isolate). Entries auto-expire after 60s.
const qrCache = new Map<string, { base64: string; ts: number }>();
const QR_TTL = 60_000;

function cacheQr(instanceName: string, base64: string) {
  qrCache.set(instanceName, { base64, ts: Date.now() });
}

function getCachedQr(instanceName: string): string | null {
  const entry = qrCache.get(instanceName);
  if (!entry) return null;
  if (Date.now() - entry.ts > QR_TTL) {
    qrCache.delete(instanceName);
    return null;
  }
  return entry.base64;
}

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

function getConnectionState(payload: any) {
  return payload?.instance?.state ?? payload?.state ?? payload?.connectionStatus ?? null;
}

function getQrValue(payload: any) {
  const value = payload?.base64
    ?? payload?.qrcode
    ?? payload?.qr?.base64
    ?? payload?.qr?.qrcode
    ?? payload?.data?.base64
    ?? payload?.data?.qrcode
    ?? payload?.code
    ?? payload?.pairingCode
    ?? null;

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeBase64Image(value: string | null) {
  if (!value) return null;
  if (value.startsWith("data:image")) return value;
  if (/^[A-Za-z0-9+/=]+$/.test(value) && value.length > 300) {
    return `data:image/png;base64,${value}`;
  }
  return null;
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    const url = new URL(req.url);
    const queryAction = url.searchParams.get("action");

    // Webhook events from Evolution API — no auth required
    if (queryAction === "webhook_event") {
      const body = await req.json().catch(() => ({}));
      const event = body?.event;
      const instanceName = body?.instance;

      if (event === "qrcode.updated" || event === "QRCODE_UPDATED") {
        const qrBase64 = body?.data?.qrcode?.base64
          ?? body?.data?.base64
          ?? body?.qrcode?.base64
          ?? body?.data?.qrcode
          ?? null;
        if (typeof qrBase64 === "string" && qrBase64.length > 100 && instanceName) {
          cacheQr(instanceName, qrBase64);
          console.log(`[webhook] QR cached for ${instanceName} (${qrBase64.length} chars)`);
        }
      }

      if (event === "connection.update" || event === "CONNECTION_UPDATE") {
        const newState = body?.data?.state ?? body?.data?.status;
        if (newState === "open" && instanceName) {
          qrCache.delete(instanceName);
          console.log(`[webhook] ${instanceName} connected, QR cleared`);
        }
      }

      return json({ ok: true }, 200);
    }

    // Auth: require valid JWT for all other actions
    const authHeader = req.headers.get("authorization");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

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

    const body = req.method !== "GET" ? await req.json() : {};
    const action = body.action || queryAction;

    switch (action) {
      // ─── List instances ───
      case "list_instances": {
        const result = await evoFetch("/instance/fetchInstances", "GET");
        // Normalize to { instance: { instanceName, ... } } shape the frontend expects
        const raw = Array.isArray(result.data) ? result.data : [];
        const normalized = raw.map((item: Record<string, unknown>) => {
          // v2 format has top-level "name", v1 has "instance.instanceName"
          if (item.name && !item.instance) {
            return {
              instance: {
                instanceName: item.name,
                instanceId: item.id,
                status: item.connectionStatus,
                owner: item.ownerJid,
              },
            };
          }
          return item;
        });
        return json(normalized, result.status);
      }

      // ─── Create instance ───
      case "create_instance": {
        const { instanceName, number } = body;
        if (!instanceName) return json({ error: "instanceName required" }, 400);
        const webhookUrl = `${supabaseUrl}/functions/v1/evolution-api?action=webhook_event`;
        const result = await evoFetch("/instance/create", "POST", {
          instanceName,
          number: number || undefined,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
          webhook: {
            url: webhookUrl,
            webhookByEvents: true,
            webhookBase64: true,
            enabled: true,
            events: ["QRCODE_UPDATED", "CONNECTION_UPDATE"],
          },
        });
        // The create response may include a qrcode field with base64
        const createQr = result.data?.qrcode?.base64
          ?? result.data?.qrcode?.qrcode
          ?? result.data?.qrcode?.code
          ?? null;
        if (typeof createQr === "string" && createQr.length > 100) {
          cacheQr(instanceName, createQr);
        }
        return json({ ...result.data, _webhookConfigured: true }, result.status);
      }

      // ─── Get QR Code ───
      case "get_qrcode": {
        const { instanceName } = body;
        if (!instanceName) return json({ error: "instanceName required" }, 400);
        const stateResult = await evoFetch(`/instance/connectionState/${encodeURIComponent(instanceName)}`, "GET");
        if (stateResult.status >= 400) return json(stateResult.data, stateResult.status);

        const state = getConnectionState(stateResult.data);
        if (state === "open") {
          return json({ connected: true, state }, 200);
        }

        const result = await evoFetch(`/instance/connect/${encodeURIComponent(instanceName)}`, "GET");
        if (result.status >= 400) return json(result.data, result.status);

        const qrValue = getQrValue(result.data);
        const base64 = normalizeBase64Image(qrValue);
        const code = base64 ? null : qrValue;
        const waiting = !qrValue && (result.data?.count === 0 || state === "connecting" || state === "close" || state === "closed");

        return json({
          connected: false,
          state,
          waiting,
          base64,
          code,
        }, result.status);
      }

      // ─── Webhook event receiver (called by Evolution API) ───
      case "webhook_event": {
        // This is called without auth from Evolution API
        const event = body?.event;
        const instanceName = body?.instance;

        if (event === "qrcode.updated" || event === "QRCODE_UPDATED") {
          const qrBase64 = body?.data?.qrcode?.base64
            ?? body?.data?.base64
            ?? body?.qrcode?.base64
            ?? body?.data?.qrcode
            ?? null;
          if (typeof qrBase64 === "string" && qrBase64.length > 100 && instanceName) {
            cacheQr(instanceName, qrBase64);
            console.log(`[webhook] QR cached for ${instanceName} (${qrBase64.length} chars)`);
          }
        }

        if (event === "connection.update" || event === "CONNECTION_UPDATE") {
          const newState = body?.data?.state ?? body?.data?.status;
          if (newState === "open" && instanceName) {
            qrCache.delete(instanceName);
            console.log(`[webhook] ${instanceName} connected, QR cleared`);
          }
        }

        return json({ ok: true }, 200);
      }

      // ─── Get cached QR from webhook ───
      case "get_cached_qr": {
        const { instanceName } = body;
        if (!instanceName) return json({ error: "instanceName required" }, 400);
        const cached = getCachedQr(instanceName);
        return json({
          base64: cached ? (cached.startsWith("data:") ? cached : `data:image/png;base64,${cached}`) : null,
          cached: !!cached,
        }, 200);
      }

      // ─── Connection state ───
      case "connection_state": {
        const { instanceName } = body;
        if (!instanceName) return json({ error: "instanceName required" }, 400);
        const result = await evoFetch(`/instance/connectionState/${encodeURIComponent(instanceName)}`, "GET");
        return json(result.data, result.status);
      }

      // ─── Logout ───
      case "logout": {
        const { instanceName } = body;
        if (!instanceName) return json({ error: "instanceName required" }, 400);
        const result = await evoFetch(`/instance/logout/${encodeURIComponent(instanceName)}`, "DELETE");
        return json(result.data, result.status);
      }

      // ─── Delete instance ───
      case "delete_instance": {
        const { instanceName } = body;
        if (!instanceName) return json({ error: "instanceName required" }, 400);
        const result = await evoFetch(`/instance/delete/${encodeURIComponent(instanceName)}`, "DELETE");
        return json(result.data, result.status);
      }

      // ─── Send text message ───
      case "send_text": {
        const { instanceName, number, text } = body;
        if (!instanceName || !number || !text)
          return json({ error: "instanceName, number, text required" }, 400);
        const result = await evoFetch(`/message/sendText/${encodeURIComponent(instanceName)}`, "POST", {
          number,
          text,
        });
        return json(result.data, result.status);
      }

      // ─── Restart instance ───
      case "restart": {
        const { instanceName } = body;
        if (!instanceName) return json({ error: "instanceName required" }, 400);
        const result = await evoFetch(`/instance/restart/${encodeURIComponent(instanceName)}`, "POST");
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
