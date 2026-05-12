import type { SmallDealCard, BigDealCard, DoodadCard } from '../config/cards';
import type { MarketEvent } from '../config/marketEvents';
import type { Asset, GameState } from './gameTypes';

type WeightedItem<T> = {
  item: T;
  weight: number;
};

export type OpportunityDealType = 'small' | 'big';

export interface PacingWeights {
  smallDeal: number;
  bigDeal: number;
  incomeAsset: number;
  growthAsset: number;
  stock: number;
  market: number;
  doodad: number;
}

const STOCK_SYMBOLS = ['MYT4U', 'OK4U', 'MYJT', 'Stock'];

const safeNum = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalize = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const chooseWeighted = <T>(items: WeightedItem<T>[], random: () => number = Math.random): T => {
  const viableItems = items.filter(({ weight }) => weight > 0);
  if (viableItems.length === 0) {
    return items[0].item;
  }

  const totalWeight = viableItems.reduce((sum, { weight }) => sum + weight, 0);
  let cursor = random() * totalWeight;

  for (const { item, weight } of viableItems) {
    cursor -= weight;
    if (cursor <= 0) {
      return item;
    }
  }

  return viableItems[viableItems.length - 1].item;
};

const isStockCard = (card: SmallDealCard | BigDealCard): boolean => {
  return card.category === 'stock' || (card.tags || []).some(tag => normalize(tag) === 'stock');
};

const isStockAsset = (asset: Asset): boolean => {
  return asset.category === 'stock' ||
    (asset.tags || []).some(tag => normalize(tag) === 'stock' || STOCK_SYMBOLS.some(symbol => normalize(symbol) === normalize(tag)));
};

const getAssetKeyCandidates = (asset: Asset): string[] => {
  return [asset.symbol, asset.name, asset.category, asset.subtype, ...(asset.tags || [])]
    .map(normalize)
    .filter(Boolean);
};

const marketMatchesHeldAsset = (event: MarketEvent, assets: Asset[]): boolean => {
  const effect = event.effect;
  if (!effect || assets.length === 0) {
    return false;
  }

  const targets = [
    effect.assetName,
    effect.assetCategory,
    effect.targetTag,
    effect.targetName,
    ...(effect.assetTags || []),
  ].map(normalize).filter(Boolean);

  if (targets.length === 0) {
    return false;
  }

  return assets.some(asset => {
    const candidates = getAssetKeyCandidates(asset);
    return targets.some(target =>
      candidates.some(candidate => candidate === target || candidate.includes(target) || target.includes(candidate))
    );
  });
};

const hasRecentLog = (state: GameState, keywords: string[], withinSteps: number): boolean => {
  const currentStep = safeNum(state.actionStep);
  return (state.actionLog || []).some(log =>
    currentStep - safeNum(log.step) <= withinSteps &&
    keywords.some(keyword => log.message.includes(keyword))
  );
};

const getAvailableCash = (state: GameState): number => safeNum(state.cash);

const getPassiveWeeklyIncome = (state: GameState): number => {
  return (state.assets || []).reduce((sum, asset) => sum + safeNum(asset.weeklyIncome), 0);
};

const getDealAffordability = (state: GameState, downPayment: number): 'affordable' | 'stretch' | 'unaffordable' => {
  const cash = getAvailableCash(state);
  if (cash >= downPayment) return 'affordable';
  if (cash + Math.max(0, getPassiveWeeklyIncome(state) * 12) >= downPayment) return 'stretch';
  return 'unaffordable';
};

export const getPacingWeights = (state: GameState): PacingWeights => {
  const actionStep = safeNum(state.actionStep);
  const cash = getAvailableCash(state);
  const assetCount = state.assets?.length || 0;
  const passiveWeeklyIncome = getPassiveWeeklyIncome(state);
  const recentMarket = hasRecentLog(state, ['股价', '市场', '加息', '通货膨胀'], 3);
  const recentDoodad = hasRecentLog(state, ['支出「'], 3);
  const recentAssetBuy = hasRecentLog(state, ['买入「'], 3);
  const hasStock = (state.assets || []).some(isStockAsset);

  const earlyGame = actionStep < 8 || assetCount === 0;
  const cashPressure = cash < 1500 || passiveWeeklyIncome < 0;
  const readyForBigDeal = state.track === 'fast_track' || cash >= 10000 || passiveWeeklyIncome >= 800;

  return {
    smallDeal: earlyGame ? 9 : readyForBigDeal ? 4 : 7,
    bigDeal: readyForBigDeal ? 6 : 1,
    incomeAsset: cashPressure ? 8 : 5,
    growthAsset: recentMarket ? 3 : 5,
    stock: hasStock || recentMarket ? 7 : earlyGame ? 4 : 5,
    market: hasStock || assetCount >= 2 ? 7 : recentAssetBuy ? 4 : 2,
    doodad: cashPressure || recentDoodad ? 1 : 4,
  };
};

export const chooseOpportunityDealType = (state: GameState, random: () => number = Math.random): OpportunityDealType => {
  const weights = getPacingWeights(state);
  if (state.track === 'fast_track') {
    return 'big';
  }

  return chooseWeighted<OpportunityDealType>([
    { item: 'small', weight: weights.smallDeal },
    { item: 'big', weight: weights.bigDeal },
  ], random);
};

export const selectPacedSmallDealCard = (
  state: GameState,
  cards: SmallDealCard[],
  random: () => number = Math.random,
): SmallDealCard => {
  const weights = getPacingWeights(state);
  const fallback = cards[0];

  return chooseWeighted(cards.map(card => {
    const affordability = getDealAffordability(state, safeNum(card.downPayment));
    const affordableWeight = affordability === 'affordable' ? 6 : affordability === 'stretch' ? 2 : 0.3;
    const incomeWeight = card.monthlyIncome > 0 ? weights.incomeAsset : weights.growthAsset;
    const stockWeight = isStockCard(card) ? weights.stock : 1;
    const earlyCashflowBoost = (state.assets?.length || 0) < 2 && card.monthlyIncome > 0 ? 2 : 1;

    return {
      item: card,
      weight: Math.max(0.1, affordableWeight * incomeWeight * stockWeight * earlyCashflowBoost),
    };
  }), random) || fallback;
};

export const selectPacedBigDealCard = (
  state: GameState,
  cards: BigDealCard[],
  random: () => number = Math.random,
): BigDealCard => {
  const weights = getPacingWeights(state);
  const fallback = cards[0];

  return chooseWeighted(cards.map(card => {
    const affordability = getDealAffordability(state, safeNum(card.downPayment));
    const affordableWeight = affordability === 'affordable' ? 8 : affordability === 'stretch' ? 3 : 0.2;
    const incomeWeight = card.monthlyIncome > 0 ? weights.incomeAsset : weights.growthAsset;

    return {
      item: card,
      weight: Math.max(0.1, affordableWeight * incomeWeight),
    };
  }), random) || fallback;
};

export const selectPacedDoodadCard = (
  state: GameState,
  cards: DoodadCard[],
  random: () => number = Math.random,
): DoodadCard => {
  const cash = getAvailableCash(state);
  const recentDoodad = hasRecentLog(state, ['支出「'], 3);
  const fallback = cards[0];

  return chooseWeighted(cards.map(card => {
    const cost = safeNum(card.cost);
    const affordable = cash >= cost;
    const cashBufferRatio = cash > 0 ? cost / cash : 2;
    const pressurePenalty = cash < 1500 || recentDoodad ? 0.35 : 1;
    const bufferWeight = cashBufferRatio <= 0.35 ? 6 : cashBufferRatio <= 0.8 ? 3 : affordable ? 1 : 0.2;

    return {
      item: card,
      weight: Math.max(0.1, bufferWeight * pressurePenalty),
    };
  }), random) || fallback;
};

export const selectPacedMarketEvent = (
  state: GameState,
  events: MarketEvent[],
  random: () => number = Math.random,
): MarketEvent => {
  const weights = getPacingWeights(state);
  const hasAssets = (state.assets || []).length > 0;
  const hasStocks = (state.assets || []).some(isStockAsset);
  const fallback = events[0];

  return chooseWeighted(events.map(event => {
    const matchesHeldAsset = marketMatchesHeldAsset(event, state.assets || []);
    const isStockEvent = event.type === 'stock_surge' || event.type === 'stock_crash';
    const isMacroEvent = event.type === 'inflation' || event.type === 'global_macro';
    const isPositiveLiquidityEvent = event.allowSelling && matchesHeldAsset;
    const usefulMarketWeight = isPositiveLiquidityEvent ? 10 : hasAssets ? 3 : 0.5;
    const stockEventWeight = isStockEvent ? (hasStocks ? weights.market + 4 : 1) : 1;
    const macroPenalty = isMacroEvent && getAvailableCash(state) < 1500 ? 0.35 : 1;

    return {
      item: event,
      weight: Math.max(0.1, usefulMarketWeight * stockEventWeight * macroPenalty),
    };
  }), random) || fallback;
};
