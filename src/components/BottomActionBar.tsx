import { AlertCircle, Briefcase, Dice6, DollarSign, Layers, RotateCcw } from 'lucide-react';

interface BottomActionBarProps {
  canRollDice: boolean;
  diceToRoll: number;
  canEscape: boolean;
  track: 'rat_race' | 'fast_track';
  assetCount: number;
  loanCount: number;
  onRollDice: (diceCount?: number) => void;
  onEscapeRatRace: () => void;
  onOpenOperations: () => void;
  onOpenAssets: () => void;
  onOpenLoan: () => void;
  onOpenInfo: () => void;
  onRestart: () => void;
}

export function BottomActionBar({
  canRollDice,
  diceToRoll,
  canEscape,
  track,
  assetCount,
  loanCount,
  onRollDice,
  onEscapeRatRace,
  onOpenOperations,
  onOpenAssets,
  onOpenLoan,
  onOpenInfo,
  onRestart,
}: BottomActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="mx-auto max-w-5xl">
        {canEscape && track === 'rat_race' && (
          <button
            type="button"
            onClick={onEscapeRatRace}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 text-sm font-bold text-white shadow"
          >
            进入快车道
          </button>
        )}

        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <button
            type="button"
            onClick={() => onRollDice(diceToRoll)}
            disabled={!canRollDice}
            className={`flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-5 text-base font-bold shadow transition ${
              canRollDice
                ? 'bg-blue-600 text-white active:scale-[0.98] md:hover:bg-blue-700'
                : 'bg-slate-200 text-slate-400'
            }`}
          >
            <Dice6 size={22} />
            掷骰子{diceToRoll > 1 ? ` x${diceToRoll}` : ''}
          </button>

          <button
            type="button"
            onClick={onOpenOperations}
            className="flex min-h-[52px] w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"
            title="经营动作"
          >
            <Briefcase size={21} />
          </button>

          <button
            type="button"
            onClick={onOpenAssets}
            className="relative flex min-h-[52px] w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"
            title="资产"
          >
            <Layers size={21} />
            {assetCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                {assetCount}
              </span>
            )}
          </button>
        </div>

        <div className="mt-2 grid grid-cols-4 gap-2 text-xs font-semibold">
          <button type="button" onClick={onOpenLoan} className="rounded-xl bg-orange-50 px-2 py-2 text-orange-700">
            <DollarSign className="mx-auto mb-0.5" size={15} />
            贷款{loanCount > 0 ? ` ${loanCount}` : ''}
          </button>
          <button type="button" onClick={onOpenInfo} className="rounded-xl bg-slate-100 px-2 py-2 text-slate-700">
            <AlertCircle className="mx-auto mb-0.5" size={15} />
            信息
          </button>
          <button type="button" onClick={onOpenAssets} className="rounded-xl bg-slate-100 px-2 py-2 text-slate-700">
            <Layers className="mx-auto mb-0.5" size={15} />
            资产
          </button>
          <button type="button" onClick={onRestart} className="rounded-xl bg-slate-100 px-2 py-2 text-slate-700">
            <RotateCcw className="mx-auto mb-0.5" size={15} />
            重开
          </button>
        </div>
      </div>
    </div>
  );
}
