export default function PixelLearningProgress({ purchases }: { purchases: number }) {
  const target = 50;
  const pct = Math.min((purchases / target) * 100, 100);
  const remaining = Math.max(target - purchases, 0);

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-muted-foreground">Learning Phase</span>
        <span className="font-mono font-semibold">
          {purchases}/{target}
          {remaining > 0 && (
            <span className="text-muted-foreground font-normal ml-1">
              · faltam {remaining}
            </span>
          )}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
