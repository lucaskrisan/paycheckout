import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const META_API = 'https://graph.facebook.com/v21.0';

async function authenticateUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Unauthorized');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Invalid token');
  return user;
}

async function metaFetch(endpoint: string, params: Record<string, string> = {}, method = 'GET', body?: any) {
  const token = Deno.env.get('META_ACCESS_TOKEN');
  if (!token) throw new Error('META_ACCESS_TOKEN not configured');

  const url = new URL(`${META_API}${endpoint}`);
  url.searchParams.set('access_token', token);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const options: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), options);
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }

  return data;
}

// ========== Handlers ==========

async function listAccounts() {
  const data = await metaFetch('/me/adaccounts', {
    fields: 'id,name,account_id,currency,account_status,amount_spent',
    limit: '100',
  });
  return data.data || [];
}

async function listCampaigns(accountId: string, datePreset: string, since?: string, until?: string) {
  const fields = 'id,name,status,objective,daily_budget,lifetime_budget,budget_remaining';
  const insightFields = 'spend,impressions,reach,frequency,cpm,ctr,cpc,actions,cost_per_action_type,purchase_roas';
  
  // Get campaigns
  const campaigns = await metaFetch(`/${accountId}/campaigns`, {
    fields,
    filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] }]),
    limit: '200',
  });

  // Get insights for each campaign
  const results = [];
  for (const campaign of (campaigns.data || [])) {
    try {
      const insightParams: Record<string, string> = { fields: insightFields };
      if (since && until) {
        insightParams.time_range = JSON.stringify({ since, until });
      } else {
        insightParams.date_preset = datePreset || 'today';
      }
      const insights = await metaFetch(`/${campaign.id}/insights`, insightParams);
      results.push({ ...campaign, insights: insights.data?.[0] || null });
    } catch {
      results.push({ ...campaign, insights: null });
    }
  }

  return results;
}

async function listAdSets(accountId: string, datePreset: string, since?: string, until?: string) {
  const fields = 'id,name,status,campaign_id,daily_budget,lifetime_budget,budget_remaining,optimization_goal,billing_event';
  const insightFields = 'spend,impressions,reach,frequency,cpm,ctr,cpc,actions,cost_per_action_type,purchase_roas';

  const adsets = await metaFetch(`/${accountId}/adsets`, {
    fields,
    filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] }]),
    limit: '200',
  });

  const results = [];
  for (const adset of (adsets.data || [])) {
    try {
      const insightParams: Record<string, string> = { fields: insightFields };
      if (since && until) {
        insightParams.time_range = JSON.stringify({ since, until });
      } else {
        insightParams.date_preset = datePreset || 'today';
      }
      const insights = await metaFetch(`/${adset.id}/insights`, insightParams);
      results.push({ ...adset, insights: insights.data?.[0] || null });
    } catch {
      results.push({ ...adset, insights: null });
    }
  }

  return results;
}

async function listAds(accountId: string, datePreset: string, since?: string, until?: string) {
  const fields = 'id,name,status,adset_id,campaign_id,creative{title,body,thumbnail_url}';
  const insightFields = 'spend,impressions,reach,frequency,cpm,ctr,cpc,actions,cost_per_action_type,purchase_roas';

  const ads = await metaFetch(`/${accountId}/ads`, {
    fields,
    filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] }]),
    limit: '200',
  });

  const results = [];
  for (const ad of (ads.data || [])) {
    try {
      const insightParams: Record<string, string> = { fields: insightFields };
      if (since && until) {
        insightParams.time_range = JSON.stringify({ since, until });
      } else {
        insightParams.date_preset = datePreset || 'today';
      }
      const insights = await metaFetch(`/${ad.id}/insights`, insightParams);
      results.push({ ...ad, insights: insights.data?.[0] || null });
    } catch {
      results.push({ ...ad, insights: null });
    }
  }

  return results;
}

async function updateStatus(objectId: string, newStatus: string) {
  const token = Deno.env.get('META_ACCESS_TOKEN')!;
  const res = await fetch(`${META_API}/${objectId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `status=${newStatus}&access_token=${token}`,
  });
  return await res.json();
}

async function updateBudget(objectId: string, budgetType: string, amount: string) {
  const token = Deno.env.get('META_ACCESS_TOKEN')!;
  const res = await fetch(`${META_API}/${objectId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `${budgetType}=${amount}&access_token=${token}`,
  });
  return await res.json();
}

async function duplicateObject(objectId: string, objectType: string) {
  const token = Deno.env.get('META_ACCESS_TOKEN')!;
  const endpoint = objectType === 'campaign' ? 'copies' : 'copies';
  const res = await fetch(`${META_API}/${objectId}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `status_option=PAUSED&access_token=${token}`,
  });
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await authenticateUser(req);
    const { action, account_id, date_preset, since, until, object_id, new_status, budget_type, budget_amount, object_type } = await req.json();

    let result: any;

    switch (action) {
      case 'list_accounts':
        result = await listAccounts();
        break;
      case 'list_campaigns':
        result = await listCampaigns(account_id, date_preset, since, until);
        break;
      case 'list_adsets':
        result = await listAdSets(account_id, date_preset, since, until);
        break;
      case 'list_ads':
        result = await listAds(account_id, date_preset, since, until);
        break;
      case 'update_status':
        result = await updateStatus(object_id, new_status);
        break;
      case 'update_budget':
        result = await updateBudget(object_id, budget_type, budget_amount);
        break;
      case 'duplicate':
        result = await duplicateObject(object_id, object_type);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[meta-ads] Error:', error?.message);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: error?.message === 'Unauthorized' || error?.message === 'Invalid token' ? 401 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
