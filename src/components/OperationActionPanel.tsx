import { useMemo, useState } from 'react';
import { Briefcase, ShieldCheck, Search, SlidersHorizontal, Target, WalletCards } from 'lucide-react';
import type { GameState, OperationActionId } from '../logic/gameTypes';
import {
  OPERATION_ACTIONS,
  canSelectOperationAction,
  isBusinessAsset,
} from '../logic/operationActions';

interface OperationActionPanelProps {
  gameState: GameState;
  canAct: boolean;
  onSelectAction: (actionId: OperationActionId, targetAssetId?: string) => void;
}

const actionIcons: Record<OperationActionId, typeof Search> = {
  find_opportunity: Search,
  market_research: Target,
  frugal_management: WalletCards,
  down_payment_negotiation: SlidersHorizontal,
  asset_management: Briefcase,
  insurance: ShieldCheck,
};

export function OperationActionPanel({ gameState, canAct, onSelectAction }: OperationActionPanelProps) {
  const businessAssets = useMemo(() => (gameState.assets || []).filter(isBusinessAsset), [gameState.assets]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(businessAssets[0]?.id || '');

  const activeEffects = (gameState.operationEffects || []).filter(effect => effect.remainingTurns > 0);
  const hasSelectedOperation = Boolean(gameState.selectedOperation);

  return (
    <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">经营动作</h3>
          <p className="text-xs text-slate-500">掷骰前可选 1 个，也可以直接掷骰。</p>
        </div>
        {hasSelectedOperation && (
          <span className="text-xs font-semibold text-blue-700 bg-white px-2 py-1 rounded-full border border-blue-100">
            本回合已选择
          </span>
        )}
      </div>

      {businessAssets.length > 0 && (
        <select
          value={selectedAssetId}
          onChange={(event) => setSelectedAssetId(event.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg border border-blue-100 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {businessAssets.map(asset => (
            <option key={asset.id} value={asset.id}>{asset.name}</option>
          ))}
        </select>
      )}

      <div className="grid grid-cols-2 gap-2">
        {OPERATION_ACTIONS.map(action => {
          const Icon = actionIcons[action.id];
          const targetAssetId = action.requiresBusinessAsset ? selectedAssetId : undefined;
          const check = canSelectOperationAction(gameState, action.id, targetAssetId);
          const disabled = !canAct || !check.canSelect;

          return (
            <button
              key={action.id}
              type="button"
              title={disabled ? check.reason : action.effectSummary}
              onClick={() => onSelectAction(action.id, targetAssetId)}
              disabled={disabled}
              className={`min-h-[86px] rounded-xl border p-3 text-left transition ${
                disabled
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-white border-blue-100 text-slate-700 hover:border-blue-300 hover:shadow-sm active:scale-[0.98]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold">
                  <Icon size={15} />
                  {action.name}
                </span>
                <span className="text-xs font-semibold">{action.cost > 0 ? `$${action.cost}` : '$0'}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed">{action.effectSummary}</p>
            </button>
          );
        })}
      </div>

      {activeEffects.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {activeEffects.map(effect => (
            <span key={effect.id} className="px-2 py-1 bg-white border border-blue-100 rounded-full text-xs text-blue-700">
              {effect.source || effect.type} · {effect.remainingTurns} 回合
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
