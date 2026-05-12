import { Award, BarChart3, RefreshCw, Trophy } from 'lucide-react';

export interface GameSummaryMetric {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'good' | 'bad';
}

export interface GameSummaryHighlight {
  label: string;
  title: string;
  value?: string | number;
  description?: string;
}

export interface GameSummaryPanelProps {
  isVisible: boolean;
  title?: string;
  subtitle?: string;
  metrics: GameSummaryMetric[];
  highlights?: GameSummaryHighlight[];
  onRestart?: () => void;
  restartLabel?: string;
}

function getMetricTone(tone: GameSummaryMetric['tone']) {
  if (tone === 'good') return 'text-green-600';
  if (tone === 'bad') return 'text-red-500';
  return 'text-slate-800';
}

export function GameSummaryPanel({
  isVisible,
  title = '游戏总结',
  subtitle = '这局现金流路径已经完成',
  metrics,
  highlights = [],
  onRestart,
  restartLabel = '再来一局',
}: GameSummaryPanelProps) {
  if (!isVisible) return null;

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Trophy size={14} />
            胜利复盘
          </div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>

        {onRestart && (
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <RefreshCw size={16} />
            {restartLabel}
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(metric => (
          <div key={metric.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs font-medium text-slate-400">{metric.label}</div>
            <div className={`mt-1 break-words text-lg font-bold ${getMetricTone(metric.tone)}`}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      {highlights.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <BarChart3 size={16} className="text-emerald-500" />
            关键表现
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            {highlights.map(highlight => (
              <article key={`${highlight.label}-${highlight.title}`} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <Award size={14} />
                  {highlight.label}
                </div>
                <h4 className="text-sm font-bold text-slate-800">{highlight.title}</h4>
                {highlight.value != null && <div className="mt-1 text-lg font-bold text-emerald-700">{highlight.value}</div>}
                {highlight.description && <p className="mt-2 text-xs leading-5 text-slate-500">{highlight.description}</p>}
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
