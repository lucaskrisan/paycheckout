import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Pencil, Check, X, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MetaInsights } from "@/hooks/useMetaAds";
import {
  getResults, getCPA, getROAS, getConversionValue, getROI,
  formatCurrency, formatNumber, formatPercent, formatBudget,
} from "./MetaInsightsHelpers";

interface DataItem {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  insights: MetaInsights | null;
}

interface Props {
  data: DataItem[];
  loading: boolean;
  searchPlaceholder?: string;
  onToggleStatus: (id: string, status: string) => Promise<string>;
  onUpdateBudget: (id: string, type: string, amount: string) => Promise<boolean>;
  onDuplicate: (id: string) => Promise<boolean>;
  onRefresh: () => void;
  showObjective?: boolean;
}

export function MetaDataTable({
  data, loading, searchPlaceholder = "Buscar...",
  onToggleStatus, onUpdateBudget, onDuplicate, onRefresh, showObjective,
}: Props) {
  const [search, setSearch] = useState("");
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState("");
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const filtered = data.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = async (item: DataItem) => {
    setTogglingIds((prev) => new Set(prev).add(item.id));
    const newStatus = await onToggleStatus(item.id, item.status);
    item.status = newStatus;
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
    onRefresh();
  };

  const handleBudgetSave = async (item: DataItem) => {
    const cents = Math.round(parseFloat(budgetValue) * 100).toString();
    const type = item.daily_budget && item.daily_budget !== "0" ? "daily_budget" : "lifetime_budget";
    const ok = await onUpdateBudget(item.id, type, cents);
    if (ok) onRefresh();
    setEditingBudget(null);
  };

  const handleDuplicate = async (id: string) => {
    const ok = await onDuplicate(id);
    if (ok) onRefresh();
  };

  // Totals
  const totals = filtered.reduce(
    (acc, item) => {
      const ins = item.insights;
      if (!ins) return acc;
      acc.spend += parseFloat(ins.spend || "0");
      acc.impressions += parseInt(ins.impressions || "0", 10);
      acc.reach += parseInt(ins.reach || "0", 10);
      acc.results += getResults(ins);
      return acc;
    },
    { spend: 0, impressions: 0, reach: 0, results: 0 }
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Badge variant="secondary" className="text-xs">
          {filtered.length} {filtered.length === 1 ? "item" : "itens"}
        </Badge>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[50px]">Status</TableHead>
              <TableHead className="min-w-[200px]">Nome</TableHead>
              {showObjective && <TableHead>Objetivo</TableHead>}
              <TableHead className="text-right">Orçamento</TableHead>
              <TableHead className="text-right">Resultados</TableHead>
              <TableHead className="text-right">Investimento</TableHead>
              <TableHead className="text-right">CPA</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
              <TableHead className="text-right">CPM</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">CPC</TableHead>
              <TableHead className="text-right">Impressões</TableHead>
              <TableHead className="text-right">Alcance</TableHead>
              <TableHead className="text-right">Frequência</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                  Carregando dados do Meta...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                  Nenhum item encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => {
                const ins = item.insights;
                const roas = getROAS(ins);
                const cpa = getCPA(ins);

                return (
                  <TableRow key={item.id} className="hover:bg-muted/20">
                    <TableCell>
                      <Switch
                        checked={item.status === "ACTIVE"}
                        disabled={togglingIds.has(item.id)}
                        onCheckedChange={() => handleToggle(item)}
                        className="data-[state=checked]:bg-primary"
                      />
                    </TableCell>
                    <TableCell className="font-medium text-sm max-w-[250px] truncate" title={item.name}>
                      {item.name}
                    </TableCell>
                    {showObjective && (
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.objective?.replace(/_/g, " ").toLowerCase() || "—"}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {editingBudget === item.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <Input
                            value={budgetValue}
                            onChange={(e) => setBudgetValue(e.target.value)}
                            className="w-24 h-7 text-xs"
                            type="number"
                            step="0.01"
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleBudgetSave(item)}>
                            <Check className="w-3 h-3 text-primary" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingBudget(null)}>
                            <X className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() => {
                            setEditingBudget(item.id);
                            const raw = item.daily_budget && item.daily_budget !== "0"
                              ? parseInt(item.daily_budget, 10) / 100
                              : item.lifetime_budget ? parseInt(item.lifetime_budget, 10) / 100 : 0;
                            setBudgetValue(raw.toString());
                          }}
                        >
                          {formatBudget(item.daily_budget, item.lifetime_budget)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{getResults(ins)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(ins?.spend || "0")}</TableCell>
                    <TableCell className={`text-right ${cpa > 0 ? "" : "text-muted-foreground"}`}>
                      {cpa > 0 ? formatCurrency(cpa) : "—"}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${roas >= 1 ? "text-primary" : roas > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {roas > 0 ? `${roas.toFixed(2)}x` : "—"}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(ins?.cpm || "0")}</TableCell>
                    <TableCell className="text-right">{formatPercent(ins?.ctr || "0")}</TableCell>
                    <TableCell className="text-right">{formatCurrency(ins?.cpc || "0")}</TableCell>
                    <TableCell className="text-right">{formatNumber(ins?.impressions || "0")}</TableCell>
                    <TableCell className="text-right">{formatNumber(ins?.reach || "0")}</TableCell>
                    <TableCell className="text-right">
                      {ins?.frequency ? parseFloat(ins.frequency).toFixed(2).replace(".", ",") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                              setEditingBudget(item.id);
                              const raw = item.daily_budget && item.daily_budget !== "0"
                                ? parseInt(item.daily_budget, 10) / 100
                                : item.lifetime_budget ? parseInt(item.lifetime_budget, 10) / 100 : 0;
                              setBudgetValue(raw.toString());
                            }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar orçamento</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDuplicate(item.id)}>
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Duplicar</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {filtered.length > 0 && (
            <TableFooter>
              <TableRow className="bg-muted/40 font-semibold">
                <TableCell />
                <TableCell>Total ({filtered.length})</TableCell>
                {showObjective && <TableCell />}
                <TableCell />
                <TableCell className="text-right">{totals.results}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.spend)}</TableCell>
                <TableCell className="text-right">
                  {totals.results > 0 ? formatCurrency(totals.spend / totals.results) : "—"}
                </TableCell>
                <TableCell />
                <TableCell className="text-right">
                  {totals.impressions > 0 ? formatCurrency((totals.spend / totals.impressions) * 1000) : "—"}
                </TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right">{formatNumber(totals.impressions)}</TableCell>
                <TableCell className="text-right">{formatNumber(totals.reach)}</TableCell>
                <TableCell />
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
