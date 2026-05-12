import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';

export type RiskLevel = 'safe' | 'watch' | 'danger';

export interface RiskHint {
  id: string;
  level: RiskLevel;
  title: string;
  message: string;
  metric?: string;
  suggestion?: string;
}

interface RiskHintPanelProps {
  hints: RiskHint[];
  title?: string;
  emptyText?: string;
  maxItems?: number;
}

const levelConfig: Record<RiskLevel, {
  label: string;
  wrapper: string;
  badge: string;
  icon: typeof CheckCircle2;
}> = {
  safe: {
    label: '健康',
    wrapper: 'border-green-100 bg-green-50',
    badge: 'bg-green-100 text-green-700',
    icon: CheckCircle2,
  },
  watch: {
    label: '关注',
    wrapper: 'border-amber-100 bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
    icon: AlertTriangle,
  },
  danger: {
    label: '高风险',
    wrapper: 'border-red-100 bg-red-50',
    badge: 'bg-red-100 text-red-700',
    icon: ShieldAlert,
  },
};

function getOverallLevel(hints: RiskHint[]): RiskLevel {
  if (hints.some(hint => hint.level === 'danger')) return 'danger';
  if (hints.some(hint => hint.level === 'watch')) return 'watch';
  return 'safe';
}

export function RiskHintPanel({
  hints,
  title = '风险提示',
  emptyText = '当前没有明显风险',
  maxItems = 4,
}: RiskHintPanelProps) {
  const visibleHints = hints.slice(0, maxItems);
  const overallLevel = visibleHints.length > 0 ? getOverallLevel(visibleHints) : 'safe';
  const OverallIcon = overallLevel === 'danger' ? ShieldAlert : overallLevel === 'watch' ? AlertTriangle : ShieldCheck;
  const overallClass = overallLevel === 'danger' ? 'text-red-600' : overallLevel === 'watch' ? 'text-amber-600' : 'text-green-600';

  return (
    <section className="rounded-2xl bg-white p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-700">
          <OverallIcon size={18} className={overallClass} />
          {title}
        </h3>
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${levelConfig[overallLevel].badge}`}>
          {visibleHints.length === 0 ? '健康' : levelConfig[overallLevel].label}
        </span>
      </div>

      {visibleHints.length === 0 ? (
        <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-5 text-sm text-green-700">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleHints.map(hint => {
            const config = levelConfig[hint.level];
            const HintIcon = config.icon;

            return (
              <article key={hint.id} className={`rounded-xl border p-3 ${config.wrapper}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 rounded-full p-1.5 ${config.badge}`}>
                    <HintIcon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <h4 className="text-sm font-semibold text-slate-800">{hint.title}</h4>
                      {hint.metric && <span className="shrink-0 text-xs font-semibold text-slate-600">{hint.metric}</span>}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{hint.message}</p>
                    {hint.suggestion && (
                      <p className="mt-2 rounded-lg bg-white/70 px-2 py-1.5 text-xs leading-5 text-slate-500">
                        {hint.suggestion}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
