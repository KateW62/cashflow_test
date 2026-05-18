import type { ActionLogEntry, Asset, GameState, Loan, StockPrice } from './gameTypes';
import { getAssetCashflowMultiplier } from './operationActions';

const STOCK_SYMBOLS = ['MYT4U', 'OK4U', 'MYJT', 'Stock'];

export type TradeDirection = 'buy' | 'sell';
export type TradeKind = 'stock' | 'asset' | 'loan' | 'operation' | 'market' | 'other';
export type RiskLevel = 'info' | 'warning' | 'danger';

export interface TradeReplayEntry {
  id: string;
  step: number;
  direction: TradeDirection;
  kind: TradeKind;
  name: string;
  amount: number;
  shares?: number;
  pricePerShare?: number;
  realizedProfit?: number;
  message: string;
  timestamp: string;
}

export interface HoldingSummary {
  id: string;
  name: string;
  category: string;
  isStock: boolean;
  symbol?: string;
  shares?: number;
  costBasis: number;
  currentValue: number;
  unrealizedProfit: number;
  weeklyIncome: number;
  monthlyIncome: number;
  returnMultiple: number;
}

export interface TradeReplaySummary {
  entries: TradeReplayEntry[];
  holdings: HoldingSummary[];
  totalBuyAmount: number;
  totalSellAmount: number;
  totalRealizedProfit: number;
  totalUnrealizedProfit: number;
  totalCurrentValue: number;
}

export interface RiskHint {
  id: string;
  level: RiskLevel;
  title: string;
  message: string;
  value?: number;
}

export interface MarketSnapshotItem {
  symbol: string;
  price: number;
  heldShares: number;
  holdingValue: number;
}

export interface MarketSnapshot {
  step: number;
  timestamp: string;
  prices: MarketSnapshotItem[];
}

export interface MarketHistoryPoint {
  step: number;
  timestamp: string;
  symbol: string;
  price: number;
  heldShares: number;
  holdingValue: number;
}

export interface MarketHistorySeries {
  symbol: string;
  points: MarketHistoryPoint[];
}

export interface GameSummary {
  profession: string;
  dreamName?: string;
  hasWon: boolean;
  track: GameState['track'];
  turns: number;
  cash: number;
  netWorth: number;
  totalAssetValue: number;
  totalLoans: number;
  passiveIncome: number;
  monthlyPassiveIncome: number;
  weeklyCashFlow: number;
  monthlyCashFlow: number;
  maxPositiveCashEvent: TradeReplayEntry | null;
  maxNegativeCashEvent: TradeReplayEntry | null;
  bestRealizedTrade: TradeReplayEntry | null;
  worstRealizedTrade: TradeReplayEntry | null;
  riskHints: RiskHint[];
}

interface BasicFinancials {
  salary: number;
  passiveIncome: number;
  loanInterest: number;
  totalIncome: number;
  totalExpenses: number;
  weeklyCashFlow: number;
  totalLoans: number;
}

const safeNumber = (value: unknown, fallback = 0): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const normalizeKey = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const parseMoney = (value: string | undefined): number => {
  if (!value) return 0;
  return safeNumber(value.replace(/[$,\s]/g, ''));
};

const isStockAsset = (asset: Pick<Asset, 'category' | 'tags' | 'name'>): boolean => {
  const tags = asset.tags || [];
  return normalizeKey(asset.category) === 'stock' ||
    tags.some(tag => normalizeKey(tag) === 'stock') ||
    STOCK_SYMBOLS.some(symbol => {
      const normalizedSymbol = normalizeKey(symbol);
      return tags.some(tag => normalizeKey(tag) === normalizedSymbol) ||
        normalizeKey(asset.name).includes(normalizedSymbol);
    });
};

const getStockSymbol = (asset: Pick<Asset, 'symbol' | 'tags' | 'name'>): string => {
  if (asset.symbol) return asset.symbol;

  const candidates = [asset.name, ...(asset.tags || [])];
  return STOCK_SYMBOLS.find(symbol =>
    symbol !== 'Stock' &&
    candidates.some(candidate => normalizeKey(candidate).includes(normalizeKey(symbol)))
  ) || 'Stock';
};

const getPriceAliases = (price: StockPrice): string[] => {
  return [price.tag, price.symbol, ...(price.tags || [])].map(normalizeKey).filter(Boolean);
};

const getCurrentStockPrice = (state: GameState, assetOrSymbol: Pick<Asset, 'symbol' | 'tags' | 'name'> | string): number => {
  const symbol = typeof assetOrSymbol === 'string' ? assetOrSymbol : getStockSymbol(assetOrSymbol);
  const tags = typeof assetOrSymbol === 'string' ? [] : assetOrSymbol.tags || [];
  const name = typeof assetOrSymbol === 'string' ? '' : assetOrSymbol.name;
  const marketPrices = state.marketPrices || [];
  const specificAliases = [symbol, ...tags, name]
    .map(normalizeKey)
    .filter(alias => alias && alias !== 'stock');

  const specificEntry = marketPrices.find(price =>
    getPriceAliases(price).some(alias => specificAliases.includes(alias))
  );
  const stockEntry = marketPrices.find(price =>
    getPriceAliases(price).includes('stock')
  );
  const matchedEntry = specificEntry || stockEntry;

  return safeNumber(matchedEntry?.currentPrice ?? matchedEntry?.price, 10);
};

const calculateFinancials = (state: GameState): BasicFinancials => {
  const profession = state.professionData;
  const children = safeNumber(state.children);
  const inflation = safeNumber(state.inflationMultiplier, 1) || 1;
  const mortgageMultiplier = safeNumber(state.mortgageMultiplier, 1) || 1;
  const salary = safeNumber(profession?.salary);
  const passiveIncome = (state.assets || []).reduce((sum, asset) =>
    sum + safeNumber(asset.weeklyIncome) * getAssetCashflowMultiplier(state, asset)
  , 0);
  const loanInterest = (state.loans || []).reduce((sum, loan: Loan) => sum + safeNumber(loan.weeklyInterest), 0);
  const baseExpenses = safeNumber(profession?.tax) +
    Math.floor(safeNumber(profession?.mortgage) * mortgageMultiplier) +
    safeNumber(profession?.studentLoan) +
    safeNumber(profession?.otherExpenses) +
    safeNumber(profession?.childExpense) * children;
  const totalExpenses = Math.floor(baseExpenses * inflation) + loanInterest;
  const totalIncome = salary + passiveIncome;

  return {
    salary,
    passiveIncome,
    loanInterest,
    totalIncome,
    totalExpenses,
    weeklyCashFlow: totalIncome - totalExpenses,
    totalLoans: (state.loans || []).reduce((sum, loan) => sum + safeNumber(loan.amount), 0),
  };
};

const getAssetCurrentValue = (state: GameState, asset: Asset): number => {
  if (isStockAsset(asset)) {
    const shares = safeNumber(asset.shares, 0);
    return Math.round((shares > 0 ? shares : 1) * getCurrentStockPrice(state, asset));
  }

  return safeNumber(asset.cost);
};

const findRelatedBuyCost = (entries: TradeReplayEntry[], name: string, shares?: number): number => {
  const normalizedName = normalizeKey(name);
  const matchingBuys = entries.filter(entry =>
    entry.direction === 'buy' &&
    normalizeKey(entry.name) === normalizedName
  );

  if (!matchingBuys.length) return 0;

  const totalShares = matchingBuys.reduce((sum, entry) => sum + safeNumber(entry.shares), 0);
  const totalCost = matchingBuys.reduce((sum, entry) => sum + entry.amount, 0);
  if (shares && totalShares > 0) {
    return Math.round((totalCost / totalShares) * shares);
  }

  return totalCost;
};

const parseTradeEntry = (log: ActionLogEntry, previousEntries: TradeReplayEntry[]): TradeReplayEntry | null => {
  const message = log.message || '';
  const stockBuyMatch = message.match(/买入「(.+?)」(\d+)\s*股\s*@\$?([\d,]+).*共\s*\$?([\d,]+)/);
  if (stockBuyMatch) {
    return {
      id: log.id,
      step: log.step,
      direction: 'buy',
      kind: 'stock',
      name: stockBuyMatch[1],
      shares: safeNumber(stockBuyMatch[2]),
      pricePerShare: parseMoney(stockBuyMatch[3]),
      amount: parseMoney(stockBuyMatch[4]),
      message,
      timestamp: log.timestamp,
    };
  }

  const stockSellMatch = message.match(/卖出「(.+?)」(\d+)\s*股\s*@\$?([\d,]+).*回款\s*\$?([\d,]+)/);
  if (stockSellMatch) {
    const name = stockSellMatch[1];
    const shares = safeNumber(stockSellMatch[2]);
    const amount = parseMoney(stockSellMatch[4]);
    const estimatedCost = findRelatedBuyCost(previousEntries, name, shares);
    return {
      id: log.id,
      step: log.step,
      direction: 'sell',
      kind: 'stock',
      name,
      shares,
      pricePerShare: parseMoney(stockSellMatch[3]),
      amount,
      realizedProfit: estimatedCost ? amount - estimatedCost : undefined,
      message,
      timestamp: log.timestamp,
    };
  }

  const assetBuyMatch = message.match(/买入「(.+?)」首付\s*\$?([\d,]+)/);
  if (assetBuyMatch) {
    return {
      id: log.id,
      step: log.step,
      direction: 'buy',
      kind: 'asset',
      name: assetBuyMatch[1],
      amount: parseMoney(assetBuyMatch[2]),
      message,
      timestamp: log.timestamp,
    };
  }

  const assetSellMatch = message.match(/(?:出售资产|出售|政府征收)「(.+?)」(?:获得|获赔)?\s*\$?([\d,]+)/);
  if (assetSellMatch) {
    const name = assetSellMatch[1];
    const amount = parseMoney(assetSellMatch[2]);
    const estimatedCost = findRelatedBuyCost(previousEntries, name);
    return {
      id: log.id,
      step: log.step,
      direction: 'sell',
      kind: 'asset',
      name,
      amount,
      realizedProfit: estimatedCost ? amount - estimatedCost : undefined,
      message,
      timestamp: log.timestamp,
    };
  }

  const operationMatch = message.match(/经营动作：(.+?)(?:「(.+?)」)?，(.+)/);
  if (operationMatch) {
    return {
      id: log.id,
      step: log.step,
      direction: 'buy',
      kind: 'operation',
      name: operationMatch[2] ? `${operationMatch[1]}：${operationMatch[2]}` : operationMatch[1],
      amount: Math.abs(safeNumber(log.cashChange)),
      message,
      timestamp: log.timestamp,
    };
  }

  const marketEffectMatch = message.match(/市场(?:影响|机会|压力)：(.+)/);
  if (marketEffectMatch) {
    const expenseMatch = message.match(/支出\s*\$?([\d,]+)/);
    const amount = expenseMatch ? parseMoney(expenseMatch[1]) : Math.abs(safeNumber(log.cashChange));
    return {
      id: log.id,
      step: log.step,
      direction: log.cashChange > 0 ? 'sell' : 'buy',
      kind: 'market',
      name: marketEffectMatch[1],
      amount,
      message,
      timestamp: log.timestamp,
    };
  }

  return null;
};

export const summarizeTrades = (state: GameState): TradeReplaySummary => {
  const entries = (state.actionLog || []).reduce<TradeReplayEntry[]>((acc, log) => {
    const parsed = parseTradeEntry(log, acc);
    return parsed ? [...acc, parsed] : acc;
  }, []);

  const holdings = (state.assets || []).map<HoldingSummary>(asset => {
    const currentValue = getAssetCurrentValue(state, asset);
    const costBasis = safeNumber(asset.cost || asset.downPayment);
    const weeklyIncome = safeNumber(asset.weeklyIncome) * getAssetCashflowMultiplier(state, asset);

    return {
      id: asset.id,
      name: asset.name,
      category: asset.category,
      isStock: isStockAsset(asset),
      symbol: isStockAsset(asset) ? getStockSymbol(asset) : undefined,
      shares: asset.shares,
      costBasis,
      currentValue,
      unrealizedProfit: currentValue - costBasis,
      weeklyIncome,
      monthlyIncome: weeklyIncome * 4,
      returnMultiple: costBasis > 0 ? currentValue / costBasis : 0,
    };
  });

  const totalBuyAmount = entries
    .filter(entry => entry.direction === 'buy' && (entry.kind === 'stock' || entry.kind === 'asset'))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const totalSellAmount = entries
    .filter(entry => entry.direction === 'sell' && (entry.kind === 'stock' || entry.kind === 'asset'))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const totalRealizedProfit = entries.reduce((sum, entry) => sum + safeNumber(entry.realizedProfit), 0);
  const totalUnrealizedProfit = holdings.reduce((sum, holding) => sum + holding.unrealizedProfit, 0);
  const totalCurrentValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);

  return {
    entries,
    holdings,
    totalBuyAmount,
    totalSellAmount,
    totalRealizedProfit,
    totalUnrealizedProfit,
    totalCurrentValue,
  };
};

export const getRiskHints = (state: GameState): RiskHint[] => {
  const financials = calculateFinancials(state);
  const tradeSummary = summarizeTrades(state);
  const totalAssetValue = tradeSummary.totalCurrentValue;
  const stockValue = tradeSummary.holdings
    .filter(holding => holding.isStock)
    .reduce((sum, holding) => sum + holding.currentValue, 0);
  const cash = safeNumber(state.cash);
  const hints: RiskHint[] = [];

  if (cash < 0) {
    hints.push({
      id: 'negative-cash',
      level: 'danger',
      title: '现金为负',
      message: '当前现金已经低于 0，需要尽快补现金、卖出资产或触发清算。',
      value: cash,
    });
  }

  if (financials.weeklyCashFlow < 0) {
    hints.push({
      id: 'negative-cash-flow',
      level: 'danger',
      title: '现金流为负',
      message: `每周现金流约为 $${financials.weeklyCashFlow.toLocaleString()}，继续掷骰会持续消耗现金。`,
      value: financials.weeklyCashFlow,
    });
  }

  if (financials.totalExpenses > 0 && cash >= 0 && cash < financials.totalExpenses * 2) {
    hints.push({
      id: 'low-cash-buffer',
      level: 'warning',
      title: '安全垫偏低',
      message: '现金不足以覆盖两周支出，遇到额外支出或失业会比较危险。',
      value: cash,
    });
  }

  if (financials.totalLoans > 0 && financials.weeklyCashFlow > 0 && financials.totalLoans > financials.weeklyCashFlow * 10) {
    hints.push({
      id: 'high-leverage',
      level: 'warning',
      title: '贷款压力偏高',
      message: '贷款余额已经超过当前周现金流的 10 倍，继续加杠杆会限制购买机会。',
      value: financials.totalLoans,
    });
  }

  if (totalAssetValue > 0 && stockValue / totalAssetValue >= 0.6) {
    hints.push({
      id: 'stock-concentration',
      level: 'warning',
      title: '股票仓位集中',
      message: '股票占资产估值超过 60%，市场卡下跌时净值波动会很明显。',
      value: stockValue / totalAssetValue,
    });
  }

  const bankruptcyLiquidation = state.bankruptcyLiquidation || [];
  if (bankruptcyLiquidation.length > 0) {
    hints.push({
      id: 'recent-liquidation',
      level: 'info',
      title: '刚发生破产清算',
      message: '系统刚自动卖出资产补现金，建议复盘清算顺序和现金流变化。',
      value: bankruptcyLiquidation.length,
    });
  }

  if (!hints.length) {
    hints.push({
      id: 'stable',
      level: 'info',
      title: '财务状态平稳',
      message: '当前没有明显风险，可以继续寻找提高被动收入的机会。',
    });
  }

  return hints;
};

export const getMarketSnapshot = (state: GameState): MarketSnapshot => {
  const prices = (state.marketPrices || []).map<MarketSnapshotItem>(price => {
    const symbol = price.symbol || price.tag;
    const matchingAssets = (state.assets || []).filter(asset =>
      isStockAsset(asset) && normalizeKey(getStockSymbol(asset)) === normalizeKey(symbol)
    );
    const heldShares = matchingAssets.reduce((sum, asset) => sum + safeNumber(asset.shares), 0);
    const currentPrice = safeNumber(price.currentPrice ?? price.price);

    return {
      symbol,
      price: currentPrice,
      heldShares,
      holdingValue: Math.round(heldShares * currentPrice),
    };
  });

  return {
    step: safeNumber(state.actionStep),
    timestamp: new Date().toISOString(),
    prices,
  };
};

export const formatMarketHistoryInput = (snapshots: MarketSnapshot[]): MarketHistorySeries[] => {
  const points = snapshots.flatMap(snapshot =>
    snapshot.prices.map<MarketHistoryPoint>(price => ({
      step: snapshot.step,
      timestamp: snapshot.timestamp,
      symbol: price.symbol,
      price: price.price,
      heldShares: price.heldShares,
      holdingValue: price.holdingValue,
    }))
  );
  const symbols = Array.from(new Set(points.map(point => point.symbol)));

  return symbols.map(symbol => ({
    symbol,
    points: points
      .filter(point => point.symbol === symbol)
      .sort((a, b) => a.step - b.step || a.timestamp.localeCompare(b.timestamp)),
  }));
};

export const getGameSummary = (state: GameState): GameSummary => {
  const financials = calculateFinancials(state);
  const tradeSummary = summarizeTrades(state);
  const totalAssetValue = tradeSummary.totalCurrentValue;
  const netWorth = safeNumber(state.cash) + totalAssetValue - financials.totalLoans;
  const sellEntries = tradeSummary.entries.filter(entry => entry.direction === 'sell');
  const realizedEntries = sellEntries.filter(entry => entry.realizedProfit !== undefined);
  const maxPositiveCashEvent = tradeSummary.entries.reduce<TradeReplayEntry | null>((best, entry) =>
    !best || entry.amount > best.amount ? entry : best
  , null);
  const maxNegativeCashEvent = tradeSummary.entries
    .filter(entry => entry.direction === 'buy')
    .reduce<TradeReplayEntry | null>((worst, entry) =>
      !worst || entry.amount > worst.amount ? entry : worst
    , null);
  const bestRealizedTrade = realizedEntries.reduce<TradeReplayEntry | null>((best, entry) =>
    !best || safeNumber(entry.realizedProfit) > safeNumber(best.realizedProfit) ? entry : best
  , null);
  const worstRealizedTrade = realizedEntries.reduce<TradeReplayEntry | null>((worst, entry) =>
    !worst || safeNumber(entry.realizedProfit) < safeNumber(worst.realizedProfit) ? entry : worst
  , null);

  return {
    profession: state.profession,
    dreamName: state.selectedDream?.name,
    hasWon: state.currentSpecialEvent === 'winner',
    track: state.track,
    turns: safeNumber(state.actionStep, state.actionLog?.length || 0),
    cash: safeNumber(state.cash),
    netWorth,
    totalAssetValue,
    totalLoans: financials.totalLoans,
    passiveIncome: financials.passiveIncome,
    monthlyPassiveIncome: financials.passiveIncome * 4,
    weeklyCashFlow: financials.weeklyCashFlow,
    monthlyCashFlow: financials.weeklyCashFlow * 4,
    maxPositiveCashEvent,
    maxNegativeCashEvent,
    bestRealizedTrade,
    worstRealizedTrade,
    riskHints: getRiskHints(state),
  };
};
