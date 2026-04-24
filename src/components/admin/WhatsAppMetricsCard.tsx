// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, CheckCheck, ShoppingCart, QrCode, BarChart3, Loader2 } from "lucide-react";

interface Metrics {
  sentToday: number;
  deliveryRate: number | null;
  cartRecovered: number;
  pixReminded: number;
}

const StatTile = ({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: any;
  label: string;
  value: string;
  hint?: string;
  accent: string;
}) => (
  <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/80 p-4">
    <div className="flex items-center gap-2">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
    <p className="text-2xl font-bold font-display text-foreground leading-none">{value}</p>
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

const WhatsAppMetricsCard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [todayRes, sentWeekRes, deliveredWeekRes, cartRes, pixRes] = await Promise.all([
        supabase
          .from("whatsapp_send_log")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", user.id)
          .eq("status", "sent")
          .gte("created_at", todayStart.toISOString()),
        supabase
          .from("whatsapp_send_log")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", user.id)
          .eq("status", "sent")
          .gte("created_at", sevenDaysAgo.toISOString()),
        supabase
          .from("whatsapp_send_log")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", user.id)
          .in("delivery_status", ["delivered", "read"])
          .gte("created_at", sevenDaysAgo.toISOString()),
        supabase
          .from("whatsapp_send_log")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", user.id)
          .eq("template_category", "abandono")
          .eq("status", "sent")
          .gte("created_at", sevenDaysAgo.toISOString()),
        supabase
          .from("whatsapp_send_log")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", user.id)
          .eq("template_category", "lembrete_pix")
          .eq("status", "sent")
          .gte("created_at", sevenDaysAgo.toISOString()),
      ]);

      const sentWeek = sentWeekRes.count || 0;
      const deliveredWeek = deliveredWeekRes.count || 0;
      const deliveryRate = sentWeek > 0 ? Math.round((deliveredWeek / sentWeek) * 100) : null;

      setMetrics({
        sentToday: todayRes.count || 0,
        deliveryRate,
        cartRecovered: cartRes.count || 0,
        pixReminded: pixRes.count || 0,
      });
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Métricas de envio
          <span className="ml-2 text-xs font-normal text-muted-foreground">(últimos 7 dias)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile
              icon={Send}
              label="Enviadas hoje"
              value={String(metrics?.sentToday ?? 0)}
              accent="bg-blue-500/10 text-blue-500"
            />
            <StatTile
              icon={CheckCheck}
              label="Taxa de entrega"
              value={metrics?.deliveryRate !== null ? `${metrics?.deliveryRate}%` : "—"}
              hint={metrics?.deliveryRate === null ? "Sem dados ainda" : "entregues / enviadas"}
              accent="bg-emerald-500/10 text-emerald-500"
            />
            <StatTile
              icon={ShoppingCart}
              label="Carrinhos recuperados"
              value={String(metrics?.cartRecovered ?? 0)}
              accent="bg-amber-500/10 text-amber-500"
            />
            <StatTile
              icon={QrCode}
              label="PIX lembrados"
              value={String(metrics?.pixReminded ?? 0)}
              accent="bg-violet-500/10 text-violet-500"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsAppMetricsCard;
