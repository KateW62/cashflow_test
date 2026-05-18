import type { Asset, GameState, OperationActionId, OperationEffect } from './gameTypes';

export interface OperationActionDefinition {
  id: OperationActionId;
  name: string;
  cost: number;
  durationTurns: number;
  description: string;
  effectSummary: string;
  requiresBusinessAsset?: boolean;
}

export const OPERATION_ACTIONS: OperationActionDefinition[] = [
  {
    id: 'find_opportunity',
    name: '找机会',
    cost: 300,
    durationTurns: 1,
    description: '主动找项目、看店、问渠道。',
    effectSummary: '下一次机会格更容易出现生意或正现金流资产。',
  },
  {
    id: 'market_research',
    name: '研究市场',
    cost: 500,
    durationTurns: 1,
    description: '研究行业趋势和持仓相关消息。',
    effectSummary: '下一次市场格更容易出现与你持仓相关的市场事件。',
  },
  {
    id: 'frugal_management',
    name: '节流管理',
    cost: 0,
    durationTurns: 1,
    description: '提前控制非必要开销。',
    effectSummary: '下一次额外支出降低 30%，最低不低于 $200。',
  },
  {
    id: 'down_payment_negotiation',
    name: '谈判首付',
    cost: 400,
    durationTurns: 1,
    description: '和卖家谈付款条件。',
    effectSummary: '下一次非股票资产购买首付降低 10%。',
  },
  {
    id: 'asset_management',
    name: '资产管理',
    cost: 600,
    durationTurns: 3,
    description: '集中优化一个生意资产。',
    effectSummary: '选择一个生意资产，现金流提高 10%，持续 3 回合。',
    requiresBusinessAsset: true,
  },
  {
    id: 'insurance',
    name: '买保险',
    cost: 800,
    durationTurns: 1,
    description: '为突发风险买一层缓冲。',
    effectSummary: '下一次失业或破产清算损失降低 30%。',
  },
];

const normalize = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const hasMatchingTag = (asset: Asset, tags: string[] = []): boolean => {
  if (tags.length === 0) {
    return true;
  }

  const assetTags = [asset.category, asset.subtype, asset.symbol, asset.name, ...(asset.tags || [])]
    .map(normalize)
    .filter(Boolean);

  return tags.map(normalize).some(tag =>
    assetTags.some(assetTag => assetTag === tag || assetTag.includes(tag) || tag.includes(assetTag))
  );
};

export const isBusinessAsset = (asset: Asset): boolean => {
  return normalize(asset.category) === 'business' || (asset.tags || []).some(tag => normalize(tag) === 'business');
};

export const getOperationActionDefinition = (actionId: OperationActionId): OperationActionDefinition | undefined => {
  return OPERATION_ACTIONS.find(action => action.id === actionId);
};

export const createOperationEffect = (
  actionId: OperationActionId,
  targetAssetId?: string,
): OperationEffect | null => {
  const action = getOperationActionDefinition(actionId);
  if (!action) {
    return null;
  }

  const baseEffect: OperationEffect = {
    id: `operation_${actionId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: actionId,
    targetAssetId,
    remainingTurns: action.durationTurns,
    source: action.name,
  };

  switch (actionId) {
    case 'frugal_management':
    case 'insurance':
      return { ...baseEffect, amountModifier: 0.7 };
    case 'down_payment_negotiation':
      return { ...baseEffect, amountModifier: 0.9 };
    case 'asset_management':
      return { ...baseEffect, cashflowMultiplier: 1.1 };
    case 'find_opportunity':
      return { ...baseEffect, tags: ['business', 'Income'] };
    case 'market_research':
      return { ...baseEffect, tags: ['market_research'] };
    default:
      return baseEffect;
  }
};

export const canSelectOperationAction = (
  state: GameState,
  actionId: OperationActionId,
  targetAssetId?: string,
): { canSelect: boolean; reason?: string } => {
  const action = getOperationActionDefinition(actionId);
  if (!action) {
    return { canSelect: false, reason: '经营动作不存在' };
  }

  if (state.selectedOperation) {
    return { canSelect: false, reason: '本回合已经选择过经营动作' };
  }

  if (state.cash < action.cost) {
    return { canSelect: false, reason: '现金不足，无法执行这个经营动作' };
  }

  if (action.requiresBusinessAsset) {
    const targetAsset = (state.assets || []).find(asset => asset.id === targetAssetId);
    if (!targetAsset || !isBusinessAsset(targetAsset)) {
      return { canSelect: false, reason: '请选择一个生意资产进行管理' };
    }
  }

  return { canSelect: true };
};

export const applyOperationActionState = (
  state: GameState,
  actionId: OperationActionId,
  targetAssetId?: string,
): { state: GameState; applied: boolean; message: string; cashChange: number; reason?: string } => {
  const action = getOperationActionDefinition(actionId);
  const check = canSelectOperationAction(state, actionId, targetAssetId);
  if (!action || !check.canSelect) {
    return {
      state,
      applied: false,
      message: '',
      cashChange: 0,
      reason: check.reason || '无法执行经营动作',
    };
  }

  const effect = createOperationEffect(actionId, targetAssetId);
  if (!effect) {
    return { state, applied: false, message: '', cashChange: 0, reason: '无法生成经营效果' };
  }

  const targetName = targetAssetId
    ? state.assets.find(asset => asset.id === targetAssetId)?.name
    : undefined;
  const message = targetName
    ? `经营动作：${action.name}「${targetName}」，${action.effectSummary}`
    : `经营动作：${action.name}，${action.effectSummary}`;

  return {
    state: {
      ...state,
      cash: state.cash - action.cost,
      operationEffects: [...(state.operationEffects || []), effect],
      selectedOperation: actionId,
    },
    applied: true,
    message,
    cashChange: -action.cost,
  };
};

export const advanceOperationEffects = (effects: OperationEffect[] = []): OperationEffect[] => {
  return effects
    .map(effect => ({ ...effect, remainingTurns: effect.remainingTurns - 1 }))
    .filter(effect => effect.remainingTurns > 0);
};

export const advanceOperationEffectsAfterRoll = (effects: OperationEffect[] = []): OperationEffect[] => {
  const consumedByRoll: OperationEffect['type'][] = ['find_opportunity', 'market_research'];
  const consumedByMatchingEvent: OperationEffect['type'][] = [
    'frugal_management',
    'down_payment_negotiation',
    'insurance',
  ];

  return effects
    .map(effect => {
      if (consumedByRoll.includes(effect.type)) {
        return null;
      }

      if (consumedByMatchingEvent.includes(effect.type)) {
        return effect;
      }

      return { ...effect, remainingTurns: effect.remainingTurns - 1 };
    })
    .filter((effect): effect is OperationEffect => Boolean(effect && effect.remainingTurns > 0));
};

export const getAssetCashflowMultiplier = (state: GameState, asset: Asset): number => {
  return (state.operationEffects || []).reduce((multiplier, effect) => {
    if (!effect.cashflowMultiplier) {
      return multiplier;
    }

    const matchesTarget = effect.targetAssetId ? effect.targetAssetId === asset.id : true;
    const matchesTags = hasMatchingTag(asset, effect.tags);
    return matchesTarget && matchesTags ? multiplier * effect.cashflowMultiplier : multiplier;
  }, 1);
};

export const getFirstOperationEffect = (
  state: GameState,
  type: OperationEffect['type'],
): OperationEffect | undefined => {
  return (state.operationEffects || []).find(effect => effect.type === type);
};

export const consumeFirstOperationEffect = (
  state: GameState,
  type: OperationEffect['type'],
): GameState => {
  let consumed = false;
  return {
    ...state,
    operationEffects: (state.operationEffects || []).filter(effect => {
      if (!consumed && effect.type === type) {
        consumed = true;
        return false;
      }
      return true;
    }),
  };
};
