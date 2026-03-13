import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MetaAccount {
  id: string;
  name: string;
  account_id: string;
  currency: string;
  account_status: number;
  amount_spent: string;
}

export interface MetaInsights {
  spend: string;
  impressions: string;
  reach: string;
  frequency: string;
  cpm: string;
  ctr: string;
  cpc: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
  purchase_roas?: Array<{ action_type: string; value: string }>;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  insights: MetaInsights | null;
}

export interface MetaAdSet {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  optimization_goal?: string;
  billing_event?: string;
  insights: MetaInsights | null;
}

export interface MetaAd {
  id: string;
  name: string;
  status: string;
  adset_id: string;
  campaign_id: string;
  creative?: { title?: string; body?: string; thumbnail_url?: string };
  insights: MetaInsights | null;
}

type DatePreset = "today" | "yesterday" | "last_7d" | "last_30d" | "custom";

async function callMetaAds(payload: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("meta-ads", {
    body: payload,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.data;
}

export function useMetaAds() {
  const [accounts, setAccounts] = useState<MetaAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [adsets, setAdsets] = useState<MetaAdSet[]>([]);
  const [ads, setAds] = useState<MetaAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [customRange, setCustomRange] = useState<{ since: string; until: string } | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const getDateParams = useCallback(() => {
    if (datePreset === "custom" && customRange) {
      return { since: customRange.since, until: customRange.until };
    }
    return { date_preset: datePreset };
  }, [datePreset, customRange]);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callMetaAds({ action: "list_accounts" });
      setAccounts(data || []);
      if (data?.length > 0 && !selectedAccount) {
        setSelectedAccount(data[0].id);
      }
    } catch (err: any) {
      toast.error("Erro ao buscar contas: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  const fetchCampaigns = useCallback(async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const data = await callMetaAds({
        action: "list_campaigns",
        account_id: selectedAccount,
        ...getDateParams(),
      });
      setCampaigns(data || []);
      setLastRefresh(new Date());
    } catch (err: any) {
      toast.error("Erro ao buscar campanhas: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, getDateParams]);

  const fetchAdSets = useCallback(async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const data = await callMetaAds({
        action: "list_adsets",
        account_id: selectedAccount,
        ...getDateParams(),
      });
      setAdsets(data || []);
      setLastRefresh(new Date());
    } catch (err: any) {
      toast.error("Erro ao buscar conjuntos: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, getDateParams]);

  const fetchAds = useCallback(async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const data = await callMetaAds({
        action: "list_ads",
        account_id: selectedAccount,
        ...getDateParams(),
      });
      setAds(data || []);
      setLastRefresh(new Date());
    } catch (err: any) {
      toast.error("Erro ao buscar anúncios: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, getDateParams]);

  const toggleStatus = useCallback(async (objectId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      await callMetaAds({ action: "update_status", object_id: objectId, new_status: newStatus });
      toast.success(newStatus === "ACTIVE" ? "Ativado!" : "Pausado!");
      return newStatus;
    } catch (err: any) {
      toast.error("Erro: " + err.message);
      return currentStatus;
    }
  }, []);

  const updateBudget = useCallback(async (objectId: string, budgetType: string, amount: string) => {
    try {
      await callMetaAds({ action: "update_budget", object_id: objectId, budget_type: budgetType, budget_amount: amount });
      toast.success("Orçamento atualizado!");
      return true;
    } catch (err: any) {
      toast.error("Erro: " + err.message);
      return false;
    }
  }, []);

  const duplicate = useCallback(async (objectId: string, objectType: string) => {
    try {
      await callMetaAds({ action: "duplicate", object_id: objectId, object_type: objectType });
      toast.success("Duplicado com sucesso!");
      return true;
    } catch (err: any) {
      toast.error("Erro: " + err.message);
      return false;
    }
  }, []);

  return {
    accounts, selectedAccount, setSelectedAccount,
    campaigns, adsets, ads,
    loading, datePreset, setDatePreset,
    customRange, setCustomRange,
    lastRefresh,
    fetchAccounts, fetchCampaigns, fetchAdSets, fetchAds,
    toggleStatus, updateBudget, duplicate,
  };
}
