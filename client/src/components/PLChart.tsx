import { useMemo, useState } from "react";
import { formatCurrency } from "../utils/format";

export interface PLChartPoint {
  date: string;
  label: string;
  value: number;
}

const WIDTH = 600;
const HEIGHT = 220;
const PAD_X = 8;
const PAD_TOP = 16;
const PAD_BOTTOM = 16;

export default function PLChart({ points }: { points: PLChartPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const hasData = points.length > 1;
  const last = points.at(-1);
  const shown = hoverIndex !== null ? points[hoverIndex] : last;
  const isProfit = (shown?.value ?? 0) >= 0;
  const color = isProfit ? "#059669" : "#dc2626";
  const colorClass = isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";

  const { path, areaPath, coords, zeroY, minV, maxV } = useMemo(() => {
    if (!hasData) {
      return { path: "", areaPath: "", coords: [] as { x: number; y: number }[], zeroY: HEIGHT / 2, minV: 0, maxV: 0 };
    }
    const values = points.map((p) => p.value);
    let min = Math.min(...values, 0);
    let max = Math.max(...values, 0);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const range = max - min;
    const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const scaleY = (v: number) => PAD_TOP + plotH - ((v - min) / range) * plotH;
    const plotW = WIDTH - PAD_X * 2;
    const coords = points.map((p, i) => ({
      x: PAD_X + (points.length === 1 ? 0 : (i / (points.length - 1)) * plotW),
      y: scaleY(p.value),
    }));
    const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(" ");
    const areaPath = `${path} L ${coords.at(-1)!.x.toFixed(2)} ${HEIGHT - PAD_BOTTOM} L ${coords[0].x.toFixed(2)} ${HEIGHT - PAD_BOTTOM} Z`;
    return { path, areaPath, coords, zeroY: scaleY(0), minV: min, maxV: max };
  }, [points, hasData]);

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!hasData) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const plotW = WIDTH - PAD_X * 2;
    const ratio = Math.min(1, Math.max(0, (relX - PAD_X) / plotW));
    const idx = Math.round(ratio * (points.length - 1));
    setHoverIndex(idx);
  }

  const gradientId = `pl-gradient-${isProfit ? "up" : "down"}`;

  return (
    <div>
      <div className="mb-1">
        <p className={`text-3xl font-semibold ${colorClass}`}>
          {shown ? formatCurrency(shown.value) : formatCurrency(0)}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {hoverIndex !== null && shown ? shown.label : hasData ? `Since ${points[0].label}` : "No closed trades yet"}
        </p>
      </div>

      {hasData ? (
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full touch-none select-none"
          style={{ height: HEIGHT }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {minV < 0 && maxV > 0 && (
            <line x1={PAD_X} y1={zeroY} x2={WIDTH - PAD_X} y2={zeroY} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="4 4" />
          )}

          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
          <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          {hoverIndex !== null && coords[hoverIndex] && (
            <>
              <line
                x1={coords[hoverIndex].x}
                y1={PAD_TOP}
                x2={coords[hoverIndex].x}
                y2={HEIGHT - PAD_BOTTOM}
                stroke="currentColor"
                strokeOpacity={0.2}
              />
              <circle cx={coords[hoverIndex].x} cy={coords[hoverIndex].y} r={4.5} fill={color} stroke="white" strokeWidth={1.5} />
            </>
          )}
        </svg>
      ) : (
        <div
          className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-sm text-slate-400"
          style={{ height: HEIGHT }}
        >
          Close a trade to start plotting P/L
        </div>
      )}
    </div>
  );
}
