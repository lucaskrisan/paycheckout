import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, LayoutGrid, Layers, FileImage, DollarSign, Target, TrendingUp, Percent } from "lucide-react";
import { useMetaAds } from "@/hooks/useMetaAds";
import { MetaAdsHeader } from "@/components/admin/meta-ads/MetaAdsHeader";
import { MetaDataTable } from "@/components/admin/meta-ads/MetaDataTable";
import { formatCurrency, formatNumber, getResults, getROAS, getConversionValue, getROI } from "@/components/admin/meta-ads/MetaInsightsHelpers";

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

  useEffect(() => {
    fetchAccounts();
  }, []);

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

  // Summary metrics from active tab data
  const activeData = tab === "campaigns" ? campaigns : tab === "adsets" ? adsets : ads;
  const summary = activeData.reduce(
    (acc, item) => {
      const ins = (item as any).insights;
      if (!ins) return acc;
      acc.spend += parseFloat(ins.spend || "0");
      acc.impressions += parseInt(ins.impressions || "0", 10);
      acc.results += getResults(ins);
      acc.roas += getROAS(ins);
      acc.conversionValue += getConversionValue(ins);
      acc.count++;
      return acc;
    },
    { spend: 0, impressions: 0, results: 0, roas: 0, conversionValue: 0, count: 0 }
  );

  const avgCPA = summary.results > 0 ? summary.spend / summary.results : 0;
  const avgROAS = summary.count > 0 ? summary.roas / summary.count : 0;
  const totalROI = summary.spend > 0 && summary.conversionValue > 0
    ? ((summary.conversionValue - summary.spend) / summary.spend) * 100
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Megaphone className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Meta Ads</h1>
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Investimento</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(summary.spend)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Resultados</p>
              <p className="text-lg font-bold text-foreground">{formatNumber(summary.results)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">CPA Médio</p>
              <p className="text-lg font-bold text-foreground">{avgCPA > 0 ? formatCurrency(avgCPA) : "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className={`w-8 h-8 ${avgROAS >= 1 ? "text-primary" : "text-destructive"}`} />
            <div>
              <p className="text-xs text-muted-foreground">ROAS Médio</p>
              <p className={`text-lg font-bold ${avgROAS >= 1 ? "text-primary" : "text-destructive"}`}>
                {avgROAS > 0 ? `${avgROAS.toFixed(2)}x` : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="accounts" className="gap-1.5">
            <LayoutGrid className="w-4 h-4" /> Contas
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5">
            <Megaphone className="w-4 h-4" /> Campanhas
          </TabsTrigger>
          <TabsTrigger value="adsets" className="gap-1.5">
            <Layers className="w-4 h-4" /> Conjuntos
          </TabsTrigger>
          <TabsTrigger value="ads" className="gap-1.5">
            <FileImage className="w-4 h-4" /> Anúncios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Contas de Anúncio</CardTitle>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  {loading ? "Carregando contas..." : "Nenhuma conta encontrada. Verifique o token."}
                </p>
              ) : (
                <div className="grid gap-3">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedAccount === acc.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedAccount(acc.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{acc.name || acc.account_id}</p>
                          <p className="text-xs text-muted-foreground">ID: {acc.account_id} • {acc.currency}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Gasto total</p>
                          <p className="font-semibold">{formatCurrency(parseInt(acc.amount_spent || "0", 10) / 100)}</p>
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
            searchPlaceholder="Buscar campanha..."
            showObjective
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
            searchPlaceholder="Buscar conjunto..."
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
            searchPlaceholder="Buscar anúncio..."
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
