// @ts-nocheck
import { useMemo } from "react";
import { Globe } from "@/components/ui/cobe-globe";

const STATE_COORDS: Record<string, [number, number]> = {
  AC: [-9.9747, -67.8100], AL: [-9.6658, -35.7353], AM: [-3.1190, -60.0217],
  AP: [0.0349, -51.0694], BA: [-12.9714, -38.5124], CE: [-3.7172, -38.5433],
  DF: [-15.7975, -47.8919], ES: [-20.3155, -40.3128], GO: [-16.6869, -49.2648],
  MA: [-2.5297, -44.2825], MG: [-19.9167, -43.9345], MS: [-20.4697, -54.6201],
  MT: [-15.5960, -56.0969], PA: [-1.4558, -48.5024], PB: [-7.1195, -34.8450],
  PE: [-8.0476, -34.8770], PI: [-5.0892, -42.8019], PR: [-25.4284, -49.2733],
  RJ: [-22.9068, -43.1729], RN: [-5.7945, -35.2110], RO: [-8.7612, -63.9004],
  RR: [2.8195, -60.6714], RS: [-30.0346, -51.2177], SC: [-27.5954, -48.5480],
  SE: [-10.9091, -37.0677], SP: [-23.5505, -46.6333], TO: [-10.1689, -48.3317],
};

interface BrazilMapProps {
  salesByState: Record<string, { count: number; revenue: number }>;
}

const BrazilMap = ({ salesByState }: BrazilMapProps) => {
  const markers = useMemo(() => {
    return Object.entries(salesByState)
      .filter(([uf]) => STATE_COORDS[uf])
      .map(([uf, data]) => ({
        id: uf.toLowerCase(),
        location: STATE_COORDS[uf],
        label: `${uf}: ${data.count} vendas`,
      }));
  }, [salesByState]);

  const arcs = useMemo(() => {
    const sorted = Object.entries(salesByState)
      .filter(([uf]) => STATE_COORDS[uf] && uf !== "DF")
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 3);
    return sorted.map(([uf]) => ({
      id: `${uf.toLowerCase()}-df`,
      from: STATE_COORDS[uf],
      to: STATE_COORDS["DF"],
    }));
  }, [salesByState]);

  return (
    <div className="flex flex-col items-center">
      <Globe
        markers={markers}
        arcs={arcs}
        className="w-full max-w-[360px]"
        markerColor={[0.2, 0.8, 0.4]}
        baseColor={[0.15, 0.15, 0.2]}
        arcColor={[0.2, 0.9, 0.5]}
        glowColor={[0.1, 0.3, 0.15]}
        dark={1}
        mapBrightness={6}
        markerSize={0.03}
        markerElevation={0.02}
        speed={0.002}
        theta={0.3}
      />
      <p className="text-xs text-muted-foreground mt-2">
        Arraste para girar • {markers.length} estados com vendas
      </p>
    </div>
  );
};

export default BrazilMap;
