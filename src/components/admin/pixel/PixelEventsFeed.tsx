import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Event {
  id: string;
  event_name: string;
  source: string;
  created_at: string;
  customer_name: string | null;
  visitor_id: string | null;
}

export default function PixelEventsFeed() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("pixel_events")
        .select("id, event_name, source, created_at, customer_name, visitor_id")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setEvents(data as Event[]);
    };
    load();

    const channel = supabase
      .channel("pixel-events-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pixel_events" },
        (payload) => {
          setEvents((prev) => [payload.new as Event, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sourceColor = (source: string) =>
    source === "browser"
      ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
      : source === "server"
        ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30"
        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Radio className="w-5 h-5 text-primary animate-pulse" />
        <h3 className="font-semibold">Feed ao vivo</h3>
        <span className="text-xs text-muted-foreground">(últimos 50)</span>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Aguardando eventos…</p>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto font-mono text-xs">
          {events.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50"
            >
              <span className="text-muted-foreground tabular-nums">
                {new Date(e.created_at).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <Badge variant="outline" className={`text-[10px] ${sourceColor(e.source)}`}>
                {e.source}
              </Badge>
              <span className="font-semibold">{e.event_name}</span>
              <span className="text-muted-foreground truncate flex-1">
                {e.customer_name || e.visitor_id?.slice(0, 12) || "anônimo"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
