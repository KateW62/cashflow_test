import { AlertCircle, ScrollText, Users } from 'lucide-react';
import type { GameState } from '../logic/gameTypes';
import type { Financials } from '../logic/gameLogic';

interface GameStatusBarProps {
  gameState: GameState;
  financials: Financials;
  leverageBlocked: boolean;
  roomId?: string | null;
  isMyTurn?: boolean;
  currentTurnPlayerId?: string | null;
  onOpenLog: () => void;
}

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

export function GameStatusBar({
  gameState,
  financials,
  leverageBlocked,
  roomId,
  isMyTurn,
  currentTurnPlayerId,
  onOpenLog,
}: GameStatusBarProps) {
  const cashTone = gameState.cash >= 0 ? 'text-emerald-700' : 'text-red-600';
  const flowTone = financials.monthlyCashFlow >= 0 ? 'text-blue-700' : 'text-red-600';
  const monthlyPassiveIncome = financials.passiveIncome * 4;
  const monthlyExpenses = financials.monthlyTotalExpenses;
  const freedomRatio = monthlyExpenses > 0 ? monthlyPassiveIncome / monthlyExpenses : 0;
  const freedomPercent = Math.min(999, Math.round(freedomRatio * 100));
  const freedomGap = Math.max(0, monthlyExpenses - monthlyPassiveIncome);
  const freedomTone = freedomRatio >= 1 ? 'text-emerald-700' : freedomRatio >= 0.5 ? 'text-amber-700' : 'text-slate-700';
  const freedomText = freedomRatio >= 1
    ? '已达到财富自由'
    : `还差 ${formatMoney(freedomGap)}/月`;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-3 py-3 shadow-sm backdrop-blur md:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-slate-900 md:text-2xl">现金流游戏</h1>
            <p className="truncate text-xs text-slate-500 md:text-sm">
              {gameState.profession} · {gameState.track === 'rat_race' ? '老鼠赛跑' : '快车道'}
              {gameState.selectedDream && ` · 梦想: ${gameState.selectedDream.name}`}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpenLog}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition hover:bg-slate-200 md:w-auto md:px-3"
              title="操作日志"
            >
              <ScrollText size={18} />
              <span className="ml-1 hidden text-sm font-semibold md:inline">日志</span>
            </button>
            {roomId && (
              <div className="hidden rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 md:block">
                <div className="flex items-center gap-1 font-semibold">
                  <Users size={14} />
                  {roomId}
                </div>
                {currentTurnPlayerId && <div>{isMyTurn ? '轮到你了' : '等待其他玩家'}</div>}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          <div className="rounded-xl bg-emerald-50 px-3 py-2">
            <div className="text-[11px] font-medium text-slate-500">现金</div>
            <div className={`text-base font-bold ${cashTone}`}>{formatMoney(gameState.cash)}</div>
          </div>
          <div className="rounded-xl bg-blue-50 px-3 py-2">
            <div className="text-[11px] font-medium text-slate-500">月现金流</div>
            <div className={`text-base font-bold ${flowTone}`}>{formatMoney(financials.monthlyCashFlow)}</div>
          </div>
          <div className="rounded-xl bg-amber-50 px-3 py-2">
            <div className="text-[11px] font-medium text-slate-500">被动收入/月</div>
            <div className="text-base font-bold text-amber-700">{formatMoney(monthlyPassiveIncome)}</div>
          </div>
          <div className="rounded-xl bg-red-50 px-3 py-2">
            <div className="text-[11px] font-medium text-slate-500">月支出</div>
            <div className="text-base font-bold text-red-700">{formatMoney(monthlyExpenses)}</div>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <div className="text-[11px] font-medium text-slate-500">资产/贷款</div>
            <div className="text-base font-bold text-slate-800">{gameState.assets.length} / {gameState.loans.length}</div>
          </div>
          <div className="col-span-2 rounded-xl bg-cyan-50 px-3 py-2 md:col-span-1">
            <div className="text-[11px] font-medium text-slate-500">自由进度</div>
            <div className={`text-base font-bold ${freedomTone}`}>{freedomPercent}%</div>
            <div className="truncate text-[11px] text-slate-500">{freedomText}</div>
          </div>
          <div className={`col-span-2 rounded-xl px-3 py-2 md:col-span-6 ${leverageBlocked ? 'bg-red-50' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 md:hidden">
              {leverageBlocked && <AlertCircle size={12} className="text-red-600" />}
              贷款上限
            </div>
            <div className={`text-sm font-bold ${leverageBlocked ? 'text-red-600' : 'text-slate-800'}`}>
              <span className="hidden md:inline">贷款上限：</span>
              {formatMoney(financials.totalLoans)} / {formatMoney(financials.maxLoanAllowed)}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
