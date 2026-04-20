interface EMQRow {
  event_name: string;
  avg_emq: number;
  avg_dedup: number;
  avg_vid: number;
  browser: number;
  server: number;
  dual: number;
}

export default function PixelEMQTable({ rows }: { rows: EMQRow[] }) {
  if (!rows || rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Sem dados de EMQ no período. Os snapshots são gerados conforme eventos disparam.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        EMQ por evento
      </p>
      <div className="rounded border overflow-hidden text-sm">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="text-xs">
              <th className="text-left px-2 py-1.5 font-medium">Evento</th>
              <th className="text-right px-2 py-1.5 font-medium">EMQ</th>
              <th className="text-right px-2 py-1.5 font-medium">Qtd</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const total = r.browser + r.server + r.dual;
              const color =
                r.avg_emq >= 7.5
                  ? "text-emerald-600 dark:text-emerald-400"
                  : r.avg_emq >= 6
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-destructive";
              const icon = r.avg_emq >= 7.5 ? "✅" : r.avg_emq >= 6 ? "⚠️" : "🔴";
              return (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1.5">{r.event_name}</td>
                  <td className={`px-2 py-1.5 text-right font-mono font-semibold ${color}`}>
                    {r.avg_emq.toFixed(1)} {icon}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                    {total.toLocaleString("pt-BR")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
