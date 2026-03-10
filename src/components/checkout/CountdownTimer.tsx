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
    <div className="flex items-center justify-center gap-2 bg-destructive/10 text-destructive rounded-lg px-4 py-2.5">
      <Clock className="w-4 h-4" />
      <span className="text-sm font-semibold">
        Oferta expira em {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    </div>
  );
};

export default CountdownTimer;
