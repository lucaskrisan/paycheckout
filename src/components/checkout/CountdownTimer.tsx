import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  minutes?: number;
}

const CountdownTimer = ({ minutes = 15 }: CountdownTimerProps) => {
  const [seconds, setSeconds] = useState(minutes * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="w-full bg-destructive text-destructive-foreground py-2.5 flex items-center justify-center gap-2">
      <span className="text-lg font-bold font-mono">
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
      <Clock className="w-4 h-4" />
      <span className="text-sm font-medium">Oferta por tempo limitado</span>
    </div>
  );
};

export default CountdownTimer;
