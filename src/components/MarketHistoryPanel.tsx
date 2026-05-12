import { Activity, ArrowDown, ArrowUp, Minus } from 'lucide-react';

export interface MarketHistoryPoint {
  step: number;
  price: number;
  label?: string;
}

export interface MarketHistorySeries {
  symbol: string;
  name?: string;
  points: MarketHistoryPoint[];
}

interface MarketHistoryPanelProps {
  series: MarketHistorySeries[];
  title?: string;
  emptyText?: string;
  maxSeries?: number;
}

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function getTrend(points: MarketHistoryPoint[]) {
  if (points.length < 2) return 0;
  return points[points.length - 1].price - points[points.length - 2].price;
}

function buildSparkline(points: MarketHistoryPoint[]) {
  if (points.length === 0) return '';

  const width = 120;
  const height = 34;
  const min = Math.min(...points.map(point => point.price));
  const max = Math.max(...points.map(point => point.price));
  const range = Math.max(max - min, 1);

  return points.map((point, index) => {
    const x = points.length === 1 ? width : (index / (points.length - 1)) * width;
    const y = height - ((point.price - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

export function MarketHistoryPanel({
  series,
  title = '市场历史',
  emptyText = '暂无市场价格变化',
  maxSeries = 4,
}: MarketHistoryPanelProps) {
  const visibleSeries = series.slice(0, maxSeries);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-700">
          <Activity size={18} className="text-indigo-500" />
          {title}
        </h3>
        {series.length > 0 && (
          <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-600">
            {series.length} 支
          </span>
        )}
      </div>

      {visibleSeries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
          {emptyText}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleSeries.map(item => {
            const latest = item.points[item.points.length - 1];
            const first = item.points[0];
            const trend = getTrend(item.points);
            const totalChange = latest && first ? latest.price - first.price : 0;
            const TrendIcon = trend > 0 ? ArrowUp : trend < 0 ? ArrowDown : Minus;
            const trendClass = trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-slate-400';
            const points = buildSparkline(item.points);

            return (
              <article key={item.symbol} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-slate-800">{item.symbol}</h4>
                    {item.name && <p className="mt-0.5 truncate text-xs text-slate-400">{item.name}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold text-slate-800">{latest ? formatMoney(latest.price) : '-'}</div>
                    <div className={`mt-0.5 flex items-center justify-end gap-0.5 text-xs font-semibold ${trendClass}`}>
                      <TrendIcon size={12} />
                      {trend === 0 ? '$0' : `${trend > 0 ? '+' : ''}${formatMoney(trend)}`}
                    </div>
                  </div>
                </div>

                <div className="mt-3 h-10 overflow-hidden rounded-lg bg-white px-2 py-1">
                  {points ? (
                    <svg viewBox="0 0 120 34" className="h-full w-full" preserveAspectRatio="none" role="img" aria-label={`${item.symbol} 价格走势`}>
                      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" className={trend >= 0 ? 'text-green-500' : 'text-red-500'} />
                    </svg>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-300">等待价格</div>
                  )}
                </div>

                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>{item.points.length} 次记录</span>
                  <span className={totalChange >= 0 ? 'text-green-600' : 'text-red-500'}>
                    累计 {totalChange >= 0 ? '+' : ''}{formatMoney(totalChange)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
