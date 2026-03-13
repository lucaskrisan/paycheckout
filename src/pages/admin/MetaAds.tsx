import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid, Megaphone, Layers, FileImage } from "lucide-react";
import { useMetaAds } from "@/hooks/useMetaAds";
import { MetaAdsHeader } from "@/components/admin/meta-ads/MetaAdsHeader";
import { MetaDataTable } from "@/components/admin/meta-ads/MetaDataTable";
import { MetaAdsFunnel } from "@/components/admin/meta-ads/MetaAdsFunnel";
import { MetaAdsSummary } from "@/components/admin/meta-ads/MetaAdsSummary";
import { formatCurrency, getResults, getROAS, getConversionValue } from "@/components/admin/meta-ads/MetaInsightsHelpers";

export default function MetaAds() {
  const {
    accounts, selectedAccount, setSelectedAccount,
    campaigns, adsets, ads,
    loading, datePreset, setDatePreset,
    customRange, setCustomRange, lastRefresh,
    fetchAccounts, fetchCampaigns, fetchAdSets, fetchAds,
    toggleStatus, updateBudget, duplicate,
  } = useMetaAds();

  const [tab, setTab] = useState("campaigns");

  useEffect(() => { fetchAccounts(); }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    if (tab === "campaigns") fetchCampaigns();
    else if (tab === "adsets") fetchAdSets();
    else if (tab === "ads") fetchAds();
  }, [selectedAccount, tab, datePreset, customRange]);

  const handleRefresh = () => {
    if (tab === "campaigns") fetchCampaigns();
    else if (tab === "adsets") fetchAdSets();
    else if (tab === "ads") fetchAds();
    else fetchAccounts();
  };

  // Summary from campaigns (always from campaigns for top-level)
  const summary = campaigns.reduce(
    (acc, item) => {
      const ins = item.insights;
      if (!ins) return acc;
      acc.spend += parseFloat(ins.spend || "0");
      acc.results += getResults(ins);
      acc.roas += getROAS(ins);
      acc.convValue += getConversionValue(ins);
      acc.count++;
      return acc;
    },
    { spend: 0, results: 0, roas: 0, convValue: 0, count: 0 }
  );

  const avgROAS = summary.count > 0 ? summary.roas / summary.count : 0;

  // Get selected account name
  const selectedAccName = accounts.find((a) => a.id === selectedAccount)?.name || "";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[hsl(222,30%,14%)] border border-slate-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-200">Resumo</h2>
        </div>
        <MetaAdsHeader
          accounts={accounts}
          selectedAccount={selectedAccount}
          onSelectAccount={setSelectedAccount}
          datePreset={datePreset}
          onDatePreset={(v) => setDatePreset(v as any)}
          customRange={customRange}
          onCustomRange={setCustomRange}
          lastRefresh={lastRefresh}
          loading={loading}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Summary cards */}
      <MetaAdsSummary
        spend={summary.spend}
        conversionValue={summary.convValue}
        results={summary.results}
        roas={avgROAS}
      />

      {/* Funnel */}
      <MetaAdsFunnel />

      {/* Data tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-[hsl(222,30%,14%)] border border-slate-700/50 p-1 h-auto">
          <TabsTrigger value="accounts" className="gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 px-6 py-2.5">
            <LayoutGrid className="w-4 h-4" /> Contas
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 px-6 py-2.5">
            <Megaphone className="w-4 h-4" /> Campanhas
          </TabsTrigger>
          <TabsTrigger value="adsets" className="gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 px-6 py-2.5">
            <Layers className="w-4 h-4" /> Conjuntos
          </TabsTrigger>
          <TabsTrigger value="ads" className="gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 px-6 py-2.5">
            <FileImage className="w-4 h-4" /> Anúncios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4">
          <Card className="bg-[hsl(222,30%,14%)] border-slate-700/50">
            <CardHeader><CardTitle className="text-base text-slate-200">Contas de Anúncio</CardTitle></CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <p className="text-slate-500 text-sm py-8 text-center">
                  {loading ? "Carregando contas..." : "Nenhuma conta encontrada. Verifique o token."}
                </p>
              ) : (
                <div className="grid gap-3">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedAccount === acc.id
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-slate-700/50 hover:border-blue-500/50"
                      }`}
                      onClick={() => setSelectedAccount(acc.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-200">{acc.name || acc.account_id}</p>
                          <p className="text-xs text-slate-500">ID: {acc.account_id} • {acc.currency}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Gasto total</p>
                          <p className="font-semibold text-slate-200">{formatCurrency(parseInt(acc.amount_spent || "0", 10) / 100)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <MetaDataTable
            data={campaigns}
            loading={loading}
            searchPlaceholder="Filtrar por nome..."
            showObjective
            accountName={selectedAccName}
            onToggleStatus={toggleStatus}
            onUpdateBudget={updateBudget}
            onDuplicate={(id) => duplicate(id, "campaign")}
            onRefresh={fetchCampaigns}
          />
        </TabsContent>

        <TabsContent value="adsets" className="mt-4">
          <MetaDataTable
            data={adsets}
            loading={loading}
            searchPlaceholder="Filtrar por nome..."
            onToggleStatus={toggleStatus}
            onUpdateBudget={updateBudget}
            onDuplicate={(id) => duplicate(id, "adset")}
            onRefresh={fetchAdSets}
          />
        </TabsContent>

        <TabsContent value="ads" className="mt-4">
          <MetaDataTable
            data={ads}
            loading={loading}
            searchPlaceholder="Filtrar por nome..."
            onToggleStatus={toggleStatus}
            onUpdateBudget={updateBudget}
            onDuplicate={(id) => duplicate(id, "ad")}
            onRefresh={fetchAds}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
