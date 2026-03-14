const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_API = 'https://graph.facebook.com/v21.0';

// ========== Meta API helpers ==========

async function metaFetch(endpoint: string, params: Record<string, string> = {}) {
  const token = Deno.env.get('META_ACCESS_TOKEN');
  if (!token) throw new Error('META_ACCESS_TOKEN not configured');

  const url = new URL(`${META_API}${endpoint}`);
  url.searchParams.set('access_token', token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

async function getAllActiveAccounts(): Promise<string[]> {
  const direct = await metaFetch('/me/adaccounts', {
    fields: 'id,account_status',
    limit: '100',
  });
  const ids = new Set<string>();
  for (const acc of (direct.data || [])) {
    if (acc.account_status === 1) ids.add(acc.id);
  }

  try {
    const bms = await metaFetch('/me/businesses', { fields: 'id', limit: '50' });
    for (const bm of (bms.data || [])) {
      try {
        const owned = await metaFetch(`/${bm.id}/owned_ad_accounts`, { fields: 'id,account_status', limit: '100' });
        for (const acc of (owned.data || [])) {
          if (acc.account_status === 1) ids.add(acc.id);
        }
      } catch { /* skip */ }
    }
  } catch { /* no bm permission */ }

  return Array.from(ids);
}

async function getCampaignsForAccount(accountId: string) {
  const insightFields = 'spend,impressions,reach,frequency,cpm,ctr,cpc,actions,action_values,cost_per_action_type,purchase_roas';

  const campaigns = await metaFetch(`/${accountId}/campaigns`, {
    fields: 'id,name,status,objective,daily_budget,lifetime_budget',
    filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }]),
    limit: '200',
  });

  const results = [];
  for (const c of (campaigns.data || [])) {
    try {
      const insights = await metaFetch(`/${c.id}/insights`, {
        fields: insightFields,
        date_preset: 'today',
      });
      results.push({ ...c, insights: insights.data?.[0] || null });
    } catch {
      results.push({ ...c, insights: null });
    }
  }
  return results;
}

// ========== Analysis (mirrors frontend logic) ==========

function getResults(insights: any): number {
  if (!insights?.actions) return 0;
  const purchase = insights.actions.find((a: any) =>
    a.action_type === 'offsite_conversion.fb_pixel_purchase' || a.action_type === 'purchase'
  );
  if (purchase) return parseInt(purchase.value || '0');
  const lead = insights.actions.find((a: any) => a.action_type === 'lead');
  if (lead) return parseInt(lead.value || '0');
  return 0;
}

function getConversionValue(insights: any): number {
  if (!insights?.action_values) return 0;
  const pv = insights.action_values.find((a: any) =>
    a.action_type === 'offsite_conversion.fb_pixel_purchase' || a.action_type === 'purchase'
  );
  return pv ? parseFloat(pv.value || '0') : 0;
}

function getROAS(insights: any): number {
  const spend = parseFloat(insights?.spend || '0');
  if (spend === 0) return 0;
  return getConversionValue(insights) / spend;
}

function getCPA(insights: any): number {
  const spend = parseFloat(insights?.spend || '0');
  const results = getResults(insights);
  return results > 0 ? spend / results : 0;
}

function fmt(v: number): string {
  return `R$ ${v.toFixed(2).replace('.', ',')}`;
}

interface AlertMsg {
  title: string;
  body: string;
  priority: 'critical' | 'warning' | 'opportunity' | 'info';
}

function analyzeAndGenerateAlerts(campaigns: any[]): AlertMsg[] {
  const active = campaigns.filter((c: any) => c.status === 'ACTIVE' && c.insights);
  if (active.length === 0) return [];

  const alerts: AlertMsg[] = [];

  // Global metrics
  const totalSpend = active.reduce((s: number, c: any) => s + parseFloat(c.insights.spend || '0'), 0);
  const totalRevenue = active.reduce((s: number, c: any) => s + getConversionValue(c.insights), 0);
  const totalResults = active.reduce((s: number, c: any) => s + getResults(c.insights), 0);
  const avgCPM = active.reduce((s: number, c: any) => s + parseFloat(c.insights.cpm || '0'), 0) / active.length;
  const avgCTR = active.reduce((s: number, c: any) => s + parseFloat(c.insights.ctr || '0'), 0) / active.length;
  const avgFreq = active.reduce((s: number, c: any) => s + parseFloat(c.insights.frequency || '0'), 0) / active.length;
  const globalROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  // Health score (same logic as frontend)
  let score = 50;
  if (globalROAS >= 3) score += 25;
  else if (globalROAS >= 2) score += 15;
  else if (globalROAS >= 1) score += 5;
  else if (globalROAS > 0 && globalROAS < 1) score -= 15;
  else if (totalSpend > 0 && totalResults === 0) score -= 25;

  if (avgCPM > 80) score -= 15;
  else if (avgCPM > 50) score -= 5;
  else if (avgCPM < 20) score += 10;

  if (avgCTR > 2) score += 10;
  else if (avgCTR > 1) score += 5;
  else if (avgCTR < 0.5) score -= 10;

  if (avgFreq > 3) score -= 15;
  else if (avgFreq > 2) score -= 5;

  score = Math.max(0, Math.min(100, score));

  // Day health notification
  if (score >= 80) {
    alerts.push({
      priority: 'opportunity',
      title: '🔥 Dia excelente! Score: ' + score + '/100',
      body: `ROAS ${globalROAS.toFixed(2)}x | ${totalResults} vendas | Gasto ${fmt(totalSpend)}. Escala agressiva liberada — aumente 20-30%!`,
    });
  } else if (score < 40 && totalSpend > 30) {
    alerts.push({
      priority: 'critical',
      title: '🚨 Dia crítico! Score: ' + score + '/100',
      body: `ROAS ${globalROAS.toFixed(2)}x | Gasto ${fmt(totalSpend)} | CPM ${fmt(avgCPM)}. Reduza orçamentos ou pause campanhas fracas.`,
    });
  }

  // Per-campaign alerts
  for (const c of active) {
    const roas = getROAS(c.insights);
    const results = getResults(c.insights);
    const cpa = getCPA(c.insights);
    const spend = parseFloat(c.insights.spend || '0');
    const ctr = parseFloat(c.insights.ctr || '0');
    const freq = parseFloat(c.insights.frequency || '0');

    // Winner
    if (roas >= 2 && results >= 2) {
      alerts.push({
        priority: 'opportunity',
        title: `🏆 Winner: ${c.name.substring(0, 40)}`,
        body: `ROAS ${roas.toFixed(2)}x | ${results} vendas | CPA ${fmt(cpa)}. Escale 20% o orçamento!`,
      });
    }

    // High CPA losing money
    if (cpa > 0 && spend > 20 && roas < 1) {
      alerts.push({
        priority: 'critical',
        title: `⚠️ CPA alto: ${c.name.substring(0, 40)}`,
        body: `CPA ${fmt(cpa)} com ROAS ${roas.toFixed(2)}x. Considere pausar ou trocar criativo.`,
      });
    }

    // Saturated
    if (freq > 3 || (ctr < 0.5 && spend > 30)) {
      alerts.push({
        priority: 'warning',
        title: `💀 Saturando: ${c.name.substring(0, 40)}`,
        body: `Freq ${freq.toFixed(1)} | CTR ${ctr.toFixed(2)}%. Público cansou. Teste novos criativos.`,
      });
    }

    // Spending without results
    if (spend > 50 && results === 0) {
      alerts.push({
        priority: 'critical',
        title: `🔴 Sem vendas: ${c.name.substring(0, 40)}`,
        body: `Já gastou ${fmt(spend)} sem conversão. Revise criativo e página.`,
      });
    }

    // Ready to scale
    if (roas >= 1.5 && results >= 5 && score >= 60) {
      alerts.push({
        priority: 'opportunity',
        title: `🚀 Escalar: ${c.name.substring(0, 40)}`,
        body: `ROAS ${roas.toFixed(2)}x estável com ${results} vendas. ${score >= 80 ? 'Dia excelente — aumente 30%!' : 'Aumente 20% e monitore 48h.'}`,
      });
    }
  }

  return alerts;
}

// ========== OneSignal push ==========

async function sendPush(title: string, body: string, url?: string) {
  const appId = Deno.env.get('ONESIGNAL_APP_ID');
  const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) throw new Error('OneSignal not configured');

  const payload = {
    app_id: appId,
    included_segments: ['Total Subscriptions'],
    target_channel: 'push',
    headings: { en: title },
    contents: { en: body },
    chrome_web_icon: 'https://paycheckout.lovable.app/pwa-192x192.png',
    url: url || 'https://paycheckout.lovable.app/admin/meta-ads',
  };

  const res = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return await res.json();
}

// ========== Main handler ==========

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[meta-ads-alerts] Starting analysis...');

    // Fetch all active accounts
    const accountIds = await getAllActiveAccounts();
    console.log(`[meta-ads-alerts] Found ${accountIds.length} active accounts`);

    if (accountIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No active accounts', alerts: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch campaigns from all accounts
    const allCampaigns = [];
    for (const accId of accountIds) {
      try {
        const campaigns = await getCampaignsForAccount(accId);
        allCampaigns.push(...campaigns);
      } catch (err) {
        console.error(`[meta-ads-alerts] Error fetching account ${accId}:`, err.message);
      }
    }

    console.log(`[meta-ads-alerts] Analyzed ${allCampaigns.length} campaigns`);

    // Generate alerts
    const alerts = analyzeAndGenerateAlerts(allCampaigns);
    console.log(`[meta-ads-alerts] Generated ${alerts.length} alerts`);

    if (alerts.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No alerts to send', alerts: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send push for each alert (max 5 to avoid spam)
    const toSend = alerts.slice(0, 5);
    const pushResults = [];

    for (const alert of toSend) {
      try {
        const result = await sendPush(alert.title, alert.body);
        pushResults.push({ title: alert.title, sent: !!result.id });
        console.log(`[meta-ads-alerts] Push sent: ${alert.title}`);
      } catch (err) {
        console.error(`[meta-ads-alerts] Push error:`, err.message);
        pushResults.push({ title: alert.title, sent: false, error: err.message });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      accounts: accountIds.length,
      campaigns: allCampaigns.length,
      alerts_generated: alerts.length,
      alerts_sent: pushResults.filter((r) => r.sent).length,
      details: pushResults,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[meta-ads-alerts] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
