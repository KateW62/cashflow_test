import { GameState, GameSpace, Asset, ActionLogEntry, StockPrice, BankruptcyLiquidationEntry } from './gameTypes';
import type { OperationActionId, OperationEffect } from './gameTypes';
import { getRandomProfession, getTotalExpenses, Profession } from '../config/professions';
import { SmallDealCard, BigDealCard, smallDealCards, bigDealCards, doodadCards } from '../config/cards';
import { Dream } from '../config/dreams';
import { MarketEvent, marketEvents } from '../config/marketEvents';
import { SmartUnemploymentSystem } from './SmartUnemploymentSystem';
import { SmartMarketSystem } from './SmartMarketSystem';
import {
  chooseOpportunityDealType,
  selectPacedBigDealCard,
  selectPacedDoodadCard,
  selectPacedMarketEvent,
  selectPacedSmallDealCard,
} from './gamePacing';
import {
  advanceOperationEffectsAfterRoll,
  applyOperationActionState,
  consumeFirstOperationEffect,
  getAssetCashflowMultiplier,
  getFirstOperationEffect,
} from './operationActions';

export const MAX_LOAN_MULTIPLIER = 10;
const STOCK_SYMBOLS = ['MYT4U', 'OK4U', 'MYJT', 'Stock'];

const createRatRaceBoard = (): GameSpace[] => {
  const boardConfig = [
    'Payday',
    'Opportunity',
    'Doodad',
    'Opportunity',
    'Market',
    'Opportunity',
    'Charity',
    'Opportunity',
    'Payday',
    'Opportunity',
    'Market',
    'Opportunity',
    'Baby',
    'Opportunity',
    'Doodad',
    'Opportunity',
    'Payday',
    'Opportunity',
    'Downsized',
    'Opportunity',
    'Market',
    'Opportunity',
    'Doodad',
    'Opportunity',
  ];

  return boardConfig.map((type, index) => ({
    id: index,
    type: type as any,
  }));
};

const createFastTrackBoard = (): GameSpace[] => {
  return [
    { id: 0, type: 'BigDeal' },
    { id: 1, type: 'Dream' },
    { id: 2, type: 'BigDeal' },
    { id: 3, type: 'Dream' },
    { id: 4, type: 'BigDeal' },
    { id: 5, type: 'Dream' },
    { id: 6, type: 'BigDeal' },
    { id: 7, type: 'Dream' },
  ];
};

const DEFAULT_STOCK_PRICES: StockPrice[] = [
  { tag: 'Stock', price: 10 },
  { tag: 'MYT4U', price: 10 },
  { tag: 'OK4U', price: 8 },
  { tag: 'MYJT', price: 10 },
];

export const initialState = (profession: Profession | null = null, dream: Dream | null = null): GameState => {
  const selectedProfession = profession || getRandomProfession();

  // 核心逻辑：将所有月度初始数据除以 3，转换为周度数据
  const weeklyProfessionData: Profession = {
    ...selectedProfession,
    salary: Math.floor(selectedProfession.salary / 3),
    tax: Math.floor(selectedProfession.tax / 3),
    mortgage: Math.floor(selectedProfession.mortgage / 3),
    studentLoan: Math.floor(selectedProfession.studentLoan / 3),
    otherExpenses: Math.floor(selectedProfession.otherExpenses / 3),
    childExpense: Math.floor(selectedProfession.childExpense / 3),
    cash: selectedProfession.cash, // 初始现金保持不变
  };

  return {
    track: 'rat_race',
    profession: selectedProfession.name,
    professionData: weeklyProfessionData, // 使用转换后的周数据
    cash: weeklyProfessionData.cash,
    children: 0,
    selectedDream: dream,
    assets: [],
    loans: [],
    currentPosition: 0,
    gameBoard: createRatRaceBoard(),
    lastRoll: 0,
    currentEvent: null,
    currentSpecialEvent: null,
    canRoll: true,
    status: {
      isDownsized: false,
      downsizedTurnsRemaining: 0,
      unemploymentPaydayCount: 0,
      unemploymentCount: 0,
      hasCharityBonus: false,
      charityTurnsRemaining: 0,
    },
    inflationMultiplier: 1.0,
    mortgageMultiplier: 1.0,
    marketPrices: [...DEFAULT_STOCK_PRICES],
    operationEffects: [],
    bankruptcyLiquidation: [],
    actionLog: [],
    actionStep: 0,
    isMultiplayer: false,
  };
};

export const safeNum = (val: unknown, fallback: number = 0): number => {
  const n = Number(val);
  return isNaN(n) || !isFinite(n) ? fallback : n;
};

const normalizeKey = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const getStockSymbol = (tags: string[] = [], name: string = ''): string => {
  const candidates = [...tags, name];
  return STOCK_SYMBOLS.find(symbol =>
    candidates.some(candidate => normalizeKey(candidate).includes(normalizeKey(symbol)))
  ) || 'Stock';
};

const isStockLike = (item: Pick<Asset, 'category' | 'tags' | 'name'>): boolean => {
  return normalizeKey(item.category) === 'stock' ||
    (item.tags || []).some(tag => normalizeKey(tag) === 'stock' || STOCK_SYMBOLS.some(symbol => normalizeKey(tag) === normalizeKey(symbol))) ||
    STOCK_SYMBOLS.some(symbol => normalizeKey(item.name).includes(normalizeKey(symbol)));
};

const assetMatchesTags = (asset: Pick<Asset, 'category' | 'tags' | 'name' | 'subtype' | 'symbol'>, tags: string[] = []): boolean => {
  if (tags.length === 0) {
    return true;
  }

  const candidates = [asset.category, asset.subtype, asset.symbol, asset.name, ...(asset.tags || [])]
    .map(normalizeKey)
    .filter(Boolean);

  return tags.map(normalizeKey).some(tag =>
    candidates.some(candidate => candidate === tag || candidate.includes(tag) || tag.includes(candidate))
  );
};

const findStockPriceEntry = (state: GameState, stockSymbol: string, tags: string[] = [], name: string = ''): StockPrice | undefined => {
  const marketPrices = state.marketPrices || DEFAULT_STOCK_PRICES;
  const normalizedSymbol = normalizeKey(stockSymbol);
  const specificAliases = [stockSymbol, ...tags, name]
    .map(normalizeKey)
    .filter(alias => alias && alias !== 'stock');

  const findByAlias = (aliases: string[]) => marketPrices.find(price => {
    const priceAliases = [price.tag, price.symbol, ...(price.tags || [])].map(normalizeKey).filter(Boolean);
    return priceAliases.some(alias => aliases.includes(alias));
  });

  return findByAlias([normalizedSymbol])
    || findByAlias(specificAliases)
    || findByAlias(['stock']);
};

const getCurrentStockPrice = (state: GameState, stockSymbol: string, tags: string[] = [], name: string = ''): number => {
  const entry = findStockPriceEntry(state, stockSymbol, tags, name);
  return safeNum(entry?.currentPrice ?? entry?.price, 10);
};

const addLog = (
  state: GameState,
  message: string,
  cashChange: number,
  type: 'positive' | 'negative' | 'neutral' = 'neutral'
): ActionLogEntry => {
  // 避免循环调用，直接计算基础财务数据
  const safeProfessionData = state.professionData ?? {
    salary: 0, tax: 0, mortgage: 0, studentLoan: 0, otherExpenses: 0, childExpense: 0,
  };
  
  // 简单计算被动收入，避免递归
  const passiveIncome = (state.assets || []).reduce((sum, asset) => {
    return sum + safeNum(asset?.weeklyIncome, 0) * getAssetCashflowMultiplier(state, asset);
  }, 0);
  
  const salary = safeNum(safeProfessionData.salary);
  const totalIncome = salary + passiveIncome;
  const weeklyCashFlow = totalIncome - safeNum(safeProfessionData.mortgage) - safeNum(safeProfessionData.otherExpenses);
  
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    step: state.actionStep,
    message,
    cashChange,
    type,
    timestamp: new Date().toISOString(),
    passiveIncome,
    weeklyCashFlow,
  };
};

export const calculateFinancials = (state: GameState) => {
  const safeChildren = safeNum(state.children);
  const safeInflation = safeNum(state.inflationMultiplier, 1.0) || 1.0;
  const safeMortgageMultiplier = safeNum(state.mortgageMultiplier, 1.0) || 1.0;

  const passiveIncome = (state.assets || []).reduce((sum, asset) => {
    return sum + safeNum(asset?.weeklyIncome, 0) * getAssetCashflowMultiplier(state, asset);
  }, 0);

  const loanInterest = (state.loans || []).reduce((sum, loan) => {
    return sum + safeNum(loan?.weeklyInterest, 0);
  }, 0);

  const safeProfessionData = state.professionData ?? {
    salary: 0, tax: 0, mortgage: 0, studentLoan: 0, otherExpenses: 0, childExpense: 0,
  };

  const baseMortgage = safeNum(safeProfessionData.mortgage);
  const adjustedMortgage = Math.floor(baseMortgage * safeMortgageMultiplier);
  const professionWithAdjustedMortgage: Profession = {
    ...safeProfessionData,
    mortgage: adjustedMortgage,
  } as Profession;

  const weeklyTotalExpenses = getTotalExpenses(professionWithAdjustedMortgage, safeChildren, safeInflation) + loanInterest;
  const salary = safeNum(safeProfessionData.salary);
  const weeklyTotalIncome = salary + passiveIncome;
  const weeklyCashFlow = weeklyTotalIncome - weeklyTotalExpenses;
  const safeCash = safeNum(state.cash);

  const totalLoans = (state.loans || []).reduce((sum, loan) => sum + safeNum(loan?.amount, 0), 0);
  const maxLoanAllowed = Math.max(0, weeklyCashFlow * MAX_LOAN_MULTIPLIER);
  const isOverLeveraged = maxLoanAllowed > 0 && totalLoans > maxLoanAllowed;

  return {
    totalIncome: safeNum(weeklyTotalIncome),
    totalExpenses: safeNum(weeklyTotalExpenses),
    weeklyCashFlow: safeNum(weeklyCashFlow),
    monthlyCashFlow: safeNum(weeklyCashFlow * 4),
    monthlyTotalIncome: safeNum(weeklyTotalIncome * 4),
    monthlyTotalExpenses: safeNum(weeklyTotalExpenses * 4),
    passiveIncome: safeNum(passiveIncome),
    loanInterest: safeNum(loanInterest),
    salary: safeNum(salary),
    safeCash,
    mortgageMultiplier: safeMortgageMultiplier,
    totalLoans,
    maxLoanAllowed,
    isOverLeveraged,
  };
};

export type Financials = ReturnType<typeof calculateFinancials>;

export const canEscapeRatRace = (state: GameState): boolean => {
  const { passiveIncome, totalExpenses } = calculateFinancials(state);
  return passiveIncome > totalExpenses;
};

export const escapeToFastTrack = (state: GameState): GameState => {
  if (!canEscapeRatRace(state)) {
    return state;
  }

  const { passiveIncome } = calculateFinancials(state);
  const bonus = passiveIncome * 100;
  const logEntry = addLog(state, `进入快车道！获得奖励 $${bonus.toLocaleString()}`, bonus, 'positive');

  return {
    ...state,
    assets: [...state.assets],
    track: 'fast_track',
    cash: state.cash + bonus,
    currentPosition: 0,
    gameBoard: createFastTrackBoard(),
    actionLog: [...(state.actionLog || []), logEntry],
    actionStep: state.actionStep + 1,
  };
};

export const handlePayday = (state: GameState): GameState => {
  const { weeklyCashFlow } = calculateFinancials(state);
  return {
    ...state,
    assets: [...state.assets],
    loans: [...state.loans],
    cash: state.cash + weeklyCashFlow,
  };
};

export const selectOperationAction = (
  state: GameState,
  actionId: OperationActionId,
  targetAssetId?: string,
): GameState => {
  const result = applyOperationActionState(state, actionId, targetAssetId);
  if (!result.applied) {
    return state;
  }

  const logType = result.cashChange < 0 ? 'negative' : 'neutral';
  const logEntry = addLog(state, result.message, result.cashChange, logType);

  return {
    ...result.state,
    actionLog: [...(state.actionLog || []), logEntry],
    actionStep: (state.actionStep || 0) + 1,
  };
};

export const canTakeLoan = (state: GameState, amount: number): { canTake: boolean; reason?: string } => {
  if (amount % 1000 !== 0 || amount <= 0) {
    return { canTake: false, reason: '贷款金额必须是$1000的倍数' };
  }

  const { weeklyCashFlow, totalLoans, maxLoanAllowed } = calculateFinancials(state);

  if (weeklyCashFlow <= 0) {
    return { canTake: false, reason: '您的现金流不足以覆盖贷款利息，银行拒绝了您的申请' };
  }

  const newTotalLoans = totalLoans + amount;
  if (maxLoanAllowed > 0 && newTotalLoans > maxLoanAllowed) {
    const remaining = Math.floor(maxLoanAllowed - totalLoans);
    return {
      canTake: false,
      reason: `超出杠杆上限！当前最大可贷 $${remaining > 0 ? remaining.toLocaleString() : 0}（现金流 × ${MAX_LOAN_MULTIPLIER}）`,
    };
  }

  const loanTermsEffect = getFirstOperationEffect(state, 'market_loan_terms');
  const interestModifier = loanTermsEffect?.amountModifier || 1;
  const newLoanInterest = (amount * 0.1 * interestModifier) / 4;
  const futureWeeklyFlow = weeklyCashFlow - newLoanInterest;

  if (futureWeeklyFlow < 0) {
    return { canTake: false, reason: '您的现金流不足以覆盖贷款利息，银行拒绝了您的申请' };
  }

  return { canTake: true };
};

export const takeLoan = (state: GameState, amount: number): GameState => {
  const loanCheck = canTakeLoan(state, amount);
  if (!loanCheck.canTake) {
    return state;
  }

  const loanTermsEffect = getFirstOperationEffect(state, 'market_loan_terms');
  const interestModifier = loanTermsEffect?.amountModifier || 1;
  const nextState = loanTermsEffect ? consumeFirstOperationEffect(state, 'market_loan_terms') : state;

  const newLoan = {
    id: `loan_${Date.now()}`,
    amount: amount,
    weeklyInterest: (amount * 0.1 * interestModifier) / 4,
    takenDate: new Date().toISOString(),
  };

  const loanTermsText = loanTermsEffect ? `（${loanTermsEffect.source || '信贷宽松'}已降低利息）` : '';
  const logEntry = addLog(nextState, `银行贷款 $${amount.toLocaleString()}，月利息 $${(amount * 0.1 * interestModifier).toLocaleString()}${loanTermsText}`, amount, 'neutral');

  return {
    ...nextState,
    assets: [...nextState.assets],
    cash: nextState.cash + amount,
    loans: [...nextState.loans, newLoan],
    actionLog: [...(nextState.actionLog || []), logEntry],
    actionStep: (nextState.actionStep || 0) + 1,
  };
};

export const repayLoan = (state: GameState, loanId: string): GameState => {
  const loan = state.loans.find(l => l.id === loanId);
  if (!loan || state.cash < loan.amount) {
    return state;
  }

  const logEntry = addLog(state, `还清贷款 $${loan.amount.toLocaleString()}，月利息减少 $${(loan.weeklyInterest * 4).toLocaleString()}`, -loan.amount, 'neutral');

  return {
    ...state,
    assets: [...state.assets],
    cash: state.cash - loan.amount,
    loans: state.loans.filter(l => l.id !== loanId),
    actionLog: [...(state.actionLog || []), logEntry],
    actionStep: (state.actionStep || 0) + 1,
  };
};

export const handleBankruptcy = (state: GameState): GameState => {
  let currentCash = safeNum(state.cash);
  let remainingAssets = [...(state.assets || [])];
  let operationEffects = [...(state.operationEffects || [])];
  const logs: ActionLogEntry[] = [];
  const liquidation: BankruptcyLiquidationEntry[] = [];

  if (currentCash >= 0) {
    return { ...state, bankruptcyLiquidation: [] };
  }

  const insuranceEffect = getFirstOperationEffect(state, 'insurance');
  if (insuranceEffect?.amountModifier) {
    const coverage = Math.round(Math.abs(currentCash) * (1 - insuranceEffect.amountModifier));
    currentCash += coverage;
    operationEffects = consumeFirstOperationEffect(state, 'insurance').operationEffects;
    logs.push(addLog(
      state,
      `保险理赔：破产现金缺口减少 $${coverage.toLocaleString()}`,
      coverage,
      'positive'
    ));
  }

  const getLiquidationValue = (asset: Asset) => calculateSalePrice(asset, state, state.currentEvent || {});

  while (currentCash < 0 && remainingAssets.length > 0) {
    const deficit = Math.abs(currentCash);
    const stockIndex = remainingAssets.findIndex(asset => {
      if (!isStockLike(asset)) return false;
      const stockSymbol = asset.symbol || getStockSymbol(asset.tags, asset.name);
      const currentPrice = getCurrentStockPrice(state, stockSymbol, asset.tags, asset.name);
      return safeNum(asset.shares, 0) > 0 && currentPrice > 0;
    });

    if (stockIndex >= 0) {
      const stockAsset = remainingAssets[stockIndex];
      const stockSymbol = stockAsset.symbol || getStockSymbol(stockAsset.tags, stockAsset.name);
      const currentPrice = getCurrentStockPrice(state, stockSymbol, stockAsset.tags, stockAsset.name);
      const currentShares = Math.floor(safeNum(stockAsset.shares, 0));
      const sharesToSell = Math.min(currentShares, Math.ceil(deficit / currentPrice));
      const salePrice = Math.round(sharesToSell * currentPrice);
      const remainingShares = currentShares - sharesToSell;

      currentCash += salePrice;
      liquidation.push({
        assetId: stockAsset.id,
        assetName: stockAsset.name,
        salePrice,
        sharesSold: sharesToSell,
        remainingShares,
        weeklyIncomeLost: remainingShares > 0 ? 0 : safeNum(stockAsset.weeklyIncome),
        reason: `按当前市场价 $${currentPrice.toLocaleString()} 自动卖出股票`,
      });
      logs.push(addLog(
        state,
        `破产清算：自动卖出「${stockAsset.name}」${sharesToSell} 股 @$${currentPrice.toLocaleString()}，获得现金 $${salePrice.toLocaleString()}`,
        salePrice,
        'positive'
      ));

      if (remainingShares > 0) {
        const keepRatio = remainingShares / currentShares;
        remainingAssets[stockIndex] = {
          ...stockAsset,
          shares: remainingShares,
          cost: Math.round(safeNum(stockAsset.cost) * keepRatio),
          downPayment: Math.round(safeNum(stockAsset.downPayment) * keepRatio),
          sharePrice: currentPrice,
          weeklyIncome: 0,
        };
      } else {
        remainingAssets.splice(stockIndex, 1);
      }
      continue;
    }

    const rankedAssets = remainingAssets
      .map((asset, index) => ({
        asset,
        index,
        salePrice: getLiquidationValue(asset),
        incomeLoss: safeNum(asset.weeklyIncome),
      }))
      .filter(item => item.salePrice > 0)
      .sort((a, b) => {
        const aNoIncome = a.incomeLoss <= 0 ? 0 : 1;
        const bNoIncome = b.incomeLoss <= 0 ? 0 : 1;
        if (aNoIncome !== bNoIncome) return aNoIncome - bNoIncome;
        if (a.salePrice >= deficit && b.salePrice >= deficit && a.incomeLoss !== b.incomeLoss) {
          return a.incomeLoss - b.incomeLoss;
        }
        return b.salePrice - a.salePrice;
      });

    const nextAsset = rankedAssets[0];
    if (!nextAsset) break;

    currentCash += nextAsset.salePrice;
    liquidation.push({
      assetId: nextAsset.asset.id,
      assetName: nextAsset.asset.name,
      salePrice: nextAsset.salePrice,
      weeklyIncomeLost: nextAsset.incomeLoss,
      reason: nextAsset.incomeLoss <= 0 ? '优先清算不产生正现金流的资产' : '清算可覆盖现金缺口的资产',
    });
    logs.push(addLog(
      state,
      `破产清算：自动变卖资产「${nextAsset.asset.name}」，获得现金 $${nextAsset.salePrice.toLocaleString()}`,
      nextAsset.salePrice,
      'positive'
    ));
    remainingAssets.splice(nextAsset.index, 1);
  }

  const newState: GameState = {
    ...state,
    cash: currentCash,
    assets: remainingAssets,
    operationEffects,
    bankruptcyLiquidation: liquidation,
    actionLog: [...(state.actionLog || []), ...logs],
    actionStep: (state.actionStep || 0) + logs.length,
  };

  return newState;
};

export const rollDice = (state: GameState, diceCount: number = 1): GameState => {
  // 更新市场趋势系统
  const marketSystem = getMarketSystem();
  marketSystem.updateMarket(state.actionStep || 0);
  
  // 获取当前市场趋势用于显示
  const currentTrend = marketSystem.getCurrentTrend();
  if (currentTrend) {
    // 可以在UI上显示当前市场状态
    console.log(`当前市场趋势：${currentTrend.name} - ${currentTrend.description}`);
  }
  
  // 去掉 isMultiplayer 限制，让单机失业也要停留在原地
  if (state.status.isDownsized && state.status.downsizedTurnsRemaining > 0) {
    const remaining = state.status.downsizedTurnsRemaining - 1;
    const logEntry = addLog(state, `失业中，跳过本回合（剩余 ${remaining} 轮）`, 0, 'negative');
    return {
      ...state,
      professionData: state.professionData,
      assets: [...(state.assets || [])],
      loans: [...(state.loans || [])],
      children: state.children ?? 0,
      currentSpecialEvent: null,
      canRoll: remaining > 0 ? false : true,
      actionLog: [...(state.actionLog || []), logEntry],
      actionStep: (state.actionStep || 0) + 1,
      operationEffects: advanceOperationEffectsAfterRoll(state.operationEffects || []),
      selectedOperation: undefined,
      status: {
        ...state.status,
        downsizedTurnsRemaining: remaining,
        unemploymentPaydayCount: remaining > 0 ? state.status.unemploymentPaydayCount : 0,
      }
    };
  }

  let totalRoll = 0;
  for (let i = 0; i < diceCount; i++) {
    totalRoll += Math.floor(Math.random() * 6) + 1;
  }

  const boardSize = state.gameBoard.length;
  const newPosition = (state.currentPosition + totalRoll) % boardSize;

  let newState: GameState = {
    ...state,
    professionData: state.professionData,
    assets: [...(state.assets || [])],
    loans: [...(state.loans || [])],
    children: state.children ?? 0,
    inflationMultiplier: state.inflationMultiplier ?? 1.0,
    mortgageMultiplier: state.mortgageMultiplier ?? 1.0,
    marketPrices: state.marketPrices || [...DEFAULT_STOCK_PRICES],
    operationEffects: state.operationEffects || [],
    selectedOperation: undefined,
    actionLog: state.actionLog || [],
    actionStep: (state.actionStep || 0) + 1,
    currentPosition: newPosition,
    lastRoll: totalRoll,
  };

  if (state.status.hasCharityBonus && state.status.charityTurnsRemaining > 0) {
    newState = {
      ...newState,
      assets: [...newState.assets],
      status: {
        ...state.status,
        charityTurnsRemaining: state.status.charityTurnsRemaining - 1,
        hasCharityBonus: state.status.charityTurnsRemaining - 1 > 0,
      },
    };
  }

  // 直接使用已有的 boardSize，不要重新声明
  const pathIndices: number[] = [];
  
  // 扫描本次移动经过的所有格子索引
  for (let i = 1; i <= totalRoll; i++) {
    pathIndices.push((state.currentPosition + i) % boardSize);
  }

  // 计算路径中包含的发薪格数量
  const paydayCount = pathIndices.filter(idx => state.gameBoard[idx].type === 'Payday').length;
  
  let tempState = { ...newState };

  if (paydayCount > 0) {
    const { weeklyCashFlow } = calculateFinancials(tempState);
    const safeWCF = safeNum(weeklyCashFlow);

    // 循环处理每一个经过的发薪点
    for (let j = 0; j < paydayCount; j++) {
      const isUnemployed = !state.isMultiplayer 
        ? tempState.status.unemploymentPaydayCount > 0 
        : tempState.status.unemploymentCount > 0;

      if (isUnemployed) {
        // 失业停薪处理
        const isMulti = state.isMultiplayer;
        const currentField = isMulti ? 'unemploymentCount' : 'unemploymentPaydayCount';
        const remaining = Math.max(0, (tempState.status[currentField] as number) - 1);

        tempState = {
          ...tempState,
          status: {
            ...tempState.status,
            [currentField]: remaining
          }
        };

        const logEntry = addLog(tempState, `停薪：经过发薪点，失业停薪剩余 ${remaining} 次`, 0, 'negative');
        tempState.actionLog = [...(tempState.actionLog || []), logEntry];
      } else {
        // 正常发放周薪
        tempState.cash += safeWCF;
        const logEntry = addLog(tempState, `发薪日：周现金流 $${safeWCF.toLocaleString()} 入账`, safeWCF, safeWCF >= 0 ? 'positive' : 'negative');
        tempState.actionLog = [...(tempState.actionLog || []), logEntry];
      }
    }

    tempState.paydayMessage = paydayCount > 1 
      ? `银行结算：经过了 ${paydayCount} 个发薪格，已合并处理` 
      : `银行结算：周现金流已入账`;
  } else {
    tempState.paydayMessage = undefined;
  }

  // 将结算后的状态同步回 newState
  newState = { ...tempState };
  const landedSpace = newState.gameBoard[newPosition]; 

  switch (landedSpace.type) {
    case 'Opportunity': {
      const dealType = chooseOpportunityDealType(newState);
      const currentEvent = dealType === 'big'
        ? selectPacedBigDealCard(newState, bigDealCards)
        : selectPacedSmallDealCard(newState, smallDealCards);
      newState = { ...newState, assets: [...newState.assets], loans: [...newState.loans], currentEvent, canRoll: false };
      break;
    }
    case 'Doodad':
      newState = { ...newState, assets: [...newState.assets], loans: [...newState.loans], currentEvent: selectPacedDoodadCard(newState, doodadCards), canRoll: false };
      break;
    case 'BigDeal':
      newState = { ...newState, assets: [...newState.assets], loans: [...newState.loans], currentEvent: selectPacedBigDealCard(newState, bigDealCards), canRoll: false };
      break;
case 'Market': {
      const marketEvent = selectPacedMarketEvent(newState, marketEvents);
      let updatedPrices = [...newState.marketPrices]; // 保持不可变性

      // 只要有 effect，就尝试更新价格
      if (marketEvent.effect) {
        const { assetTags, assetName, priceMultiplier, fixedPrice } = marketEvent.effect;
        
        // 调用增强后的更新函数（确保该函数能处理多种参数）
        updatedPrices = updateMarketPrices(
          newState, 
          assetTags || [], 
          priceMultiplier || 1, 
          fixedPrice, 
          assetName
        );
      }

      // 处理全局宏观影响（如加息、通胀）
      let tempState = { ...newState, marketPrices: updatedPrices, currentEvent: marketEvent, canRoll: false };
      
      if (marketEvent.globalMacro) {
        // 这里可以根据 impact 类型（mortgage/expenses）动态调整状态
        // 例如：if (marketEvent.globalMacro.impact === 'mortgage') ...
      }

      newState = tempState;
      break;
    }
    case 'Downsized':
      newState = { ...newState, assets: [...newState.assets], loans: [...newState.loans], currentSpecialEvent: 'downsized', canRoll: false };
      break;
    case 'Charity':
      newState = { ...newState, assets: [...newState.assets], loans: [...newState.loans], currentSpecialEvent: 'charity', canRoll: false };
      break;
    case 'Baby':
      newState = { ...newState, assets: [...newState.assets], loans: [...newState.loans], currentSpecialEvent: 'baby', canRoll: false };
      break;
    case 'Dream':
      newState = { ...newState, assets: [...newState.assets], loans: [...newState.loans], currentSpecialEvent: 'dream', canRoll: false };
      break;
    case 'Payday':
      newState = { ...newState, assets: [...newState.assets], loans: [...newState.loans], canRoll: true };
      break;
    default:
      newState = { ...newState, assets: [...newState.assets], loans: [...newState.loans], canRoll: true };
      break;
  }

  return {
    ...newState,
    operationEffects: advanceOperationEffectsAfterRoll(newState.operationEffects || []),
    selectedOperation: undefined,
  };
};

export const canBuyOpportunity = (state: GameState): boolean => {
  try {
    const { isOverLeveraged } = calculateFinancials(state);
    return !isOverLeveraged;
  } catch (error) {
    console.error('Error in canBuyOpportunity:', error);
    return false; // 出错时默认不允许购买
  }
};

export const buyOpportunity = (state: GameState, card: SmallDealCard | BigDealCard): GameState => {
  let purchaseState = state;
  const safeCash = safeNum(state.cash);
  const { isOverLeveraged } = calculateFinancials(state);
  if (isOverLeveraged) {
    return state;
  }

  const isStock = isStockLike(card);
  const stockData = (card as SmallDealCard).stockData;
  const stockSymbol = getStockSymbol(card.tags, card.name);
  const stockPrice = isStock ? getCurrentStockPrice(state, stockSymbol, card.tags, card.name) : 0;
  const stockShares = isStock ? Math.max(1, Math.floor(safeNum(stockData?.shares, 1))) : 0;
  let downPaymentModifier = 1;
  const discountNotes: string[] = [];

  if (!isStock) {
    const negotiationEffect = getFirstOperationEffect(state, 'down_payment_negotiation');
    if (negotiationEffect?.amountModifier) {
      downPaymentModifier *= negotiationEffect.amountModifier;
      discountNotes.push('谈判首付');
      purchaseState = consumeFirstOperationEffect(purchaseState, 'down_payment_negotiation');
    }

    (state.operationEffects || [])
      .filter(effect => effect.type === 'market_purchase_discount' && effect.amountModifier && assetMatchesTags(card, effect.tags))
      .forEach(effect => {
        downPaymentModifier *= safeNum(effect.amountModifier, 1);
        if (effect.source) {
          discountNotes.push(effect.source);
        }
      });
  }

  const safeDownPayment = isStock
    ? Math.round(stockShares * stockPrice)
    : Math.max(0, Math.round(safeNum(card.downPayment) * downPaymentModifier));

  if (safeCash < safeDownPayment) {
    return state;
  }

  // 确保所有必需的属性都有值
  const newAsset: Asset = {
    id: `asset_${Date.now()}`,
    name: card.name || 'Unknown Asset',
    category: card.category || 'real_estate',
    subtype: card.subtype || 'Income',
    tags: [...(card.tags || [])],
    cost: isStock ? safeDownPayment : safeNum(card.totalCost),
    downPayment: safeDownPayment,
    weeklyIncome: isStock ? 0 : safeNum(card.monthlyIncome, 0) / 4, // 股票靠价差盈利，不产生现金流
    purchaseDate: new Date().toISOString(),
    ...(isStock ? {
      symbol: stockSymbol,
      shares: stockShares,
      sharePrice: stockPrice,
    } : {}),
  };

  const logMessage = isStock
    ? `买入「${card.name}」${stockShares} 股 @$${stockPrice.toLocaleString()}，共 $${safeDownPayment.toLocaleString()}，月收益 $0`
    : `买入「${card.name}」首付 $${safeDownPayment.toLocaleString()}${discountNotes.length ? `（${discountNotes.join('、')}已生效）` : ''}，月收益 ${card.monthlyIncome >= 0 ? '+' : ''}$${card.monthlyIncome}`;
  const logEntry = addLog(purchaseState, logMessage, -safeDownPayment, 'negative');

  return {
    ...purchaseState,
    professionData: purchaseState.professionData,
    assets: [...(purchaseState.assets || []), newAsset],
    loans: [...(purchaseState.loans || [])],
    children: purchaseState.children ?? 0,
    inflationMultiplier: purchaseState.inflationMultiplier ?? 1.0,
    mortgageMultiplier: purchaseState.mortgageMultiplier ?? 1.0,
    marketPrices: purchaseState.marketPrices || [...DEFAULT_STOCK_PRICES],
    actionLog: [...(purchaseState.actionLog || []), logEntry],
    actionStep: (purchaseState.actionStep || 0) + 1,
    cash: safeCash - safeDownPayment,
    currentEvent: null,
    canRoll: true,
  };
};

export const declineOpportunity = (state: GameState): GameState => {
  return {
    ...state,
    assets: [...state.assets],
    currentEvent: null,
    canRoll: true,
  };
};

export const payDoodad = (state: GameState, card: any): GameState => {
  const frugalEffect = getFirstOperationEffect(state, 'frugal_management');
  const baseCost = safeNum(card.cost);
  const cost = frugalEffect?.amountModifier
    ? Math.max(200, Math.round(baseCost * frugalEffect.amountModifier))
    : baseCost;
  const nextState = frugalEffect ? consumeFirstOperationEffect(state, 'frugal_management') : state;
  const discountMessage = frugalEffect ? `（节流管理减少 $${(baseCost - cost).toLocaleString()}）` : '';
  const logEntry = addLog(nextState, `支出「${card.name}」$${cost.toLocaleString()}${discountMessage}`, -cost, 'negative');
  return {
    ...nextState,
    assets: [...nextState.assets],
    cash: nextState.cash - cost,
    currentEvent: null,
    canRoll: true,
    actionLog: [...(nextState.actionLog || []), logEntry],
    actionStep: (nextState.actionStep || 0) + 1,
  };
};

// 全局智能失业系统实例
let unemploymentSystem: SmartUnemploymentSystem | null = null;

/**
 * 获取智能失业系统实例（单例模式）
 */
export const getUnemploymentSystem = (): SmartUnemploymentSystem => {
  if (!unemploymentSystem) {
    unemploymentSystem = new SmartUnemploymentSystem();
  }
  return unemploymentSystem;
};

// 全球市场系统实例
let marketSystemInstance: SmartMarketSystem | null = null;

/**
 * 获取市场系统实例（单例模式）
 */
export const getMarketSystem = (): SmartMarketSystem => {
  if (!marketSystemInstance) {
    marketSystemInstance = new SmartMarketSystem();
  }
  return marketSystemInstance;
};

/**
 * 记录玩家投资决策（用于行为分析）
 */
export const recordInvestmentBehavior = (state: GameState, investmentType: 'high' | 'medium' | 'low', success: boolean): void => {
  const system = getUnemploymentSystem();
  system.recordPlayerBehavior({
    type: success ? 'conservative_move' : 'poor_decision',
    riskLevel: investmentType,
    timestamp: Date.now()
  });
};

/**
 * 记录贷款行为
 */
export const recordLoanBehavior = (state: GameState, amount: number, isRepayment: boolean): void => {
  const system = getUnemploymentSystem();
  system.recordPlayerBehavior({
    type: isRepayment ? 'conservative_move' : 'high_risk_investment',
    riskLevel: amount > 50000 ? 'high' : amount > 20000 ? 'medium' : 'low',
    timestamp: Date.now()
  });
};

/**
 * 检查是否应该发生失业（替代原有的固定概率）
 */
export const shouldTriggerUnemployment = (state: GameState): boolean => {
  const system = getUnemploymentSystem();
  const risk = system.calculateUnemploymentRisk(state);
  
  // 使用计算出的风险概率
  return Math.random() < risk;
};

export const handleDownsized = (state: GameState): GameState => {
  const safeCash = safeNum(state.cash);
  const insuranceEffect = getFirstOperationEffect(state, 'insurance');
  const penaltyMultiplier = insuranceEffect?.amountModifier || 1;
  const cashPenalty = Math.floor(Math.max(0, safeCash) * 0.1 * penaltyMultiplier);
  const nextState = insuranceEffect ? consumeFirstOperationEffect(state, 'insurance') : state;

  const skipTurns = state.isMultiplayer ? 2 : 0;
  const unemploymentPaydayCount = state.isMultiplayer ? 0 : 2;
  const unemploymentCount = state.isMultiplayer ? 2 : 0;

  // 智能失业系统：记录这次失业事件
  const system = getUnemploymentSystem();
  system.recordPlayerBehavior({
    type: 'poor_decision',
    riskLevel: 'high',
    timestamp: Date.now(),
    description: '失业事件发生'
  });

  // 获取风险报告用于日志
  const riskReport = system.getRiskReport(state);
  const riskPercentage = Math.round(riskReport.currentRisk * 100);

  const insuranceText = insuranceEffect ? '，保险已降低损失' : '';
  const logEntry = addLog(nextState, `失业！扣除 10% 现金 $${cashPenalty.toLocaleString()}${insuranceText}，停薪 ${unemploymentPaydayCount || unemploymentCount} 次（当前失业风险：${riskPercentage}%）`, -cashPenalty, 'negative');

  return {
    ...nextState,
    professionData: nextState.professionData,
    assets: [...(nextState.assets || [])],
    loans: [...(nextState.loans || [])],
    children: nextState.children ?? 0,
    inflationMultiplier: nextState.inflationMultiplier ?? 1.0,
    marketPrices: nextState.marketPrices || [...DEFAULT_STOCK_PRICES],
    actionLog: [...(nextState.actionLog || []), logEntry],
    actionStep: (nextState.actionStep || 0) + 1,
    cash: safeCash - cashPenalty,
    status: {
      ...state.status,
      isDownsized: skipTurns > 0,
      downsizedTurnsRemaining: skipTurns,
      unemploymentPaydayCount,
      unemploymentCount,
    },
    currentEvent: null,
    currentSpecialEvent: null,
    canRoll: true,
  };
};

export const handleCharity = (state: GameState, donated: boolean): GameState => {
  if (!donated) {
    return {
      ...state,
      professionData: state.professionData,
      assets: [...(state.assets || [])],
      loans: [...(state.loans || [])],
      children: state.children ?? 0,
      inflationMultiplier: state.inflationMultiplier ?? 1.0,
      currentSpecialEvent: null,
      canRoll: true,
    };
  }

  const { monthlyTotalIncome } = calculateFinancials(state);
  const safeTotalIncome = safeNum(monthlyTotalIncome);
  const donationAmount = Math.floor(safeTotalIncome * 0.1);
  const safeCash = safeNum(state.cash);
  const logEntry = addLog(state, `慈善捐赠 $${donationAmount.toLocaleString()}，获得3回合双骰子`, -donationAmount, 'negative');

  return {
    ...state,
    professionData: state.professionData,
    assets: [...(state.assets || [])],
    loans: [...(state.loans || [])],
    children: state.children ?? 0,
    inflationMultiplier: state.inflationMultiplier ?? 1.0,
    marketPrices: state.marketPrices || [...DEFAULT_STOCK_PRICES],
    actionLog: [...(state.actionLog || []), logEntry],
    actionStep: (state.actionStep || 0) + 1,
    cash: safeCash - donationAmount,
    status: {
      ...state.status,
      hasCharityBonus: true,
      charityTurnsRemaining: 3,
    },
    currentSpecialEvent: null,
    canRoll: true,
  };
};

export const handleBaby = (state: GameState): GameState => {
  if (state.children >= 3) {
    return { ...state, currentSpecialEvent: null, canRoll: true };
  }

  const newChildren = (state.children ?? 0) + 1;
  const childExpense = safeNum(state.professionData?.childExpense);
  
  // 先增加孩子数量
  let newState: GameState = {
    ...state,
    children: newChildren,
    currentSpecialEvent: null,
    canRoll: true,
  };

  // 立即触发全量财务计算，检查由于支出增加是否导致杠杆破裂
  const { weeklyCashFlow, isOverLeveraged } = calculateFinancials(newState);
  
  const logMessage = `家庭添丁！孩子数量 ${newChildren}，周支出增加 $${childExpense.toLocaleString()}${isOverLeveraged ? '。警告：您的现金流已不足以支撑当前贷款杠杆！' : ''}`;
  const logEntry = addLog(newState, logMessage, 0, 'negative');

  return {
    ...newState,
    actionLog: [...(state.actionLog || []), logEntry],
    actionStep: (state.actionStep || 0) + 1,
  };
};

export const handleDream = (state: GameState, purchased: boolean): GameState => {
  if (!purchased || !state.selectedDream) {
    return {
      ...state,
      assets: [...state.assets],
      currentSpecialEvent: null,
      canRoll: true,
    };
  }

  if (state.cash < state.selectedDream.cost) {
    return {
      ...state,
      assets: [...state.assets],
      currentSpecialEvent: null,
      canRoll: true,
    };
  }

  const cost = state.selectedDream.cost;
  const logEntry = addLog(state, `实现梦想「${state.selectedDream.name}」花费 $${cost.toLocaleString()}，游戏胜利！`, -cost, 'positive');

  return {
    ...state,
    assets: [...state.assets],
    cash: state.cash - cost,
    currentSpecialEvent: 'winner',
    canRoll: false,
    actionLog: [...(state.actionLog || []), logEntry],
    actionStep: (state.actionStep || 0) + 1,
  };
};

export const getSpaceColor = (spaceType: string): string => {
  switch (spaceType) {
    case 'Payday': return 'bg-green-400';
    case 'Opportunity': return 'bg-blue-400';
    case 'Doodad': return 'bg-red-400';
    case 'Market': return 'bg-yellow-400';
    case 'Downsized': return 'bg-gray-700';
    case 'Charity': return 'bg-pink-400';
    case 'Baby': return 'bg-sky-400';
    case 'BigDeal': return 'bg-orange-400';
    case 'Dream': return 'bg-cyan-400';
    default: return 'bg-gray-200';
  }
};

export const getSpaceLabel = (spaceType: string): string => {
  switch (spaceType) {
    case 'Payday': return '发薪';
    case 'Opportunity': return '机会';
    case 'Doodad': return '支出';
    case 'Market': return '市场';
    case 'Downsized': return '失业';
    case 'Charity': return '慈善';
    case 'Baby': return '孩子';
    case 'BigDeal': return '大买卖';
    case 'Dream': return '梦想';
    default: return '';
  }
};

export const getMarketPrice = (state: GameState, tag: string): number => {
  return getCurrentStockPrice(state, tag);
};

export const getOpportunityStockPrice = (state: GameState, card: SmallDealCard | BigDealCard): number => {
  const stockSymbol = getStockSymbol(card.tags, card.name);
  return getCurrentStockPrice(state, stockSymbol, card.tags, card.name);
};

export const getOpportunityDownPayment = (state: GameState, card: SmallDealCard | BigDealCard): number => {
  if (isStockLike(card)) {
    const stockData = (card as SmallDealCard).stockData;
    const stockSymbol = getStockSymbol(card.tags, card.name);
    const stockPrice = getCurrentStockPrice(state, stockSymbol, card.tags, card.name);
    const stockShares = Math.max(1, Math.floor(safeNum(stockData?.shares, 1)));
    return Math.round(stockShares * stockPrice);
  }

  let modifier = 1;
  const negotiationEffect = getFirstOperationEffect(state, 'down_payment_negotiation');
  if (negotiationEffect?.amountModifier) {
    modifier *= negotiationEffect.amountModifier;
  }

  (state.operationEffects || [])
    .filter(effect => effect.type === 'market_purchase_discount' && effect.amountModifier && assetMatchesTags(card, effect.tags))
    .forEach(effect => {
      modifier *= safeNum(effect.amountModifier, 1);
    });

  return Math.max(0, Math.round(safeNum(card.downPayment) * modifier));
};

export const updateMarketPrices = (
  state: GameState, 
  tags: string[], 
  multiplier: number = 1, 
  fixedPrice?: number, 
  targetName?: string
): StockPrice[] => {
  // 确保 marketPrices 存在，如果不存在则使用默认值
  const currentPrices = state.marketPrices || [];

  return currentPrices.map(stock => {
    // 1. 匹配逻辑：
    // 优先匹配具体的股票代码 (symbol)，其次匹配标签 (tags)
    const stockAliases = [stock.tag, stock.symbol, ...(stock.tags || [])].filter(Boolean).map(t => String(t).toLowerCase());
    const nameMatch = targetName && stockAliases.includes(targetName.toLowerCase());
    const tagMatch = tags.length > 0 && tags.some(incomingTag =>
      stockAliases.includes(incomingTag.toLowerCase())
    );

    if (nameMatch || tagMatch) {
      // 2. 价格更新逻辑：
      // 如果卡片定义了固定价格 (fixedPrice)，则直接使用；否则在当前价基础上乘倍率
      const newPrice = fixedPrice !== undefined 
        ? fixedPrice 
        : Math.round(safeNum(stock.currentPrice ?? stock.price, 0) * multiplier);
      
      return { ...stock, price: newPrice, currentPrice: newPrice };
    }

    // 不匹配的股票保持原样，不做任何修改
    return stock;
  });
};

export const buyStockShares = (state: GameState, assetId: string, sharesToBuy: number): GameState => {
  const asset = state.assets.find(a => a.id === assetId);
  if (!asset || sharesToBuy <= 0) return state;

  const stockSymbol = asset.symbol || getStockSymbol(asset.tags, asset.name);
  const currentPrice = getCurrentStockPrice(state, stockSymbol, asset.tags, asset.name);
  const totalCost = Math.round(sharesToBuy * currentPrice);

  if (safeNum(state.cash) < totalCost) return state;

  const updatedAsset: Asset = {
    ...asset,
    shares: (asset.shares ?? 0) + sharesToBuy,
    cost: asset.cost + totalCost,
    downPayment: asset.downPayment + totalCost,
    weeklyIncome: 0,
    sharePrice: currentPrice,
  };

  const logEntry = addLog(state, `买入「${asset.name}」${sharesToBuy} 股 @$${currentPrice.toLocaleString()}，共 $${totalCost.toLocaleString()}`, -totalCost, 'negative');

  return {
    ...state,
    cash: state.cash - totalCost,
    assets: state.assets.map(a => a.id === assetId ? updatedAsset : a),
    actionLog: [...(state.actionLog || []), logEntry],
    actionStep: (state.actionStep || 0) + 1,
  };
};

export const sellStockShares = (state: GameState, assetId: string, sharesToSell: number): GameState => {
  const asset = state.assets.find(a => a.id === assetId);
  if (!asset || sharesToSell <= 0) return state;

  const currentShares = asset.shares ?? 0;
  if (sharesToSell > currentShares) return state;

  const stockSymbol = asset.symbol || getStockSymbol(asset.tags, asset.name);
  const currentPrice = getCurrentStockPrice(state, stockSymbol, asset.tags, asset.name);
  const totalRevenue = Math.round(sharesToSell * currentPrice);

  const remainingShares = currentShares - sharesToSell;
  const logEntry = addLog(
    state, 
    `卖出「${asset.name}」${sharesToSell} 股 @$${currentPrice}，回款 $${totalRevenue.toLocaleString()}`, 
    totalRevenue, 
    'positive'
  );

  // 处理全部卖完的情况
  if (remainingShares <= 0) {
    return {
      ...state,
      cash: state.cash + totalRevenue,
      assets: state.assets.filter(a => a.id !== assetId),
      actionLog: [...(state.actionLog || []), logEntry],
      actionStep: (state.actionStep || 0) + 1,
    };
  }

  // 处理部分卖出的情况（按比例缩减成本和首付）
  const avgCostPerShare = asset.shares && asset.shares > 0 ? asset.cost / asset.shares : currentPrice;
  const updatedAsset: Asset = {
    ...asset,
    shares: remainingShares,
    cost: Math.round(remainingShares * avgCostPerShare),
    downPayment: Math.round(remainingShares * avgCostPerShare),
    weeklyIncome: 0,
    sharePrice: currentPrice, 
  };

  const finalState = {
    ...state,
    cash: state.cash + totalRevenue,
    assets: state.assets.map(a => a.id === assetId ? updatedAsset : a),
    actionLog: [...(state.actionLog || []), logEntry],
    actionStep: (state.actionStep || 0) + 1,
  };

  return finalState;
};

export const handleMarketEvent = (state: GameState, soldAssetId?: string, salePrice?: number): GameState => {
  const safeCash = safeNum(state.cash);
  const marketEvent = state.currentEvent as any;

  let newCash = safeCash;
  let newAssets = [...(state.assets || [])];
  let newMortgageMultiplier = safeNum(state.mortgageMultiplier, 1.0) || 1.0;
  let newOperationEffects = [...(state.operationEffects || [])];
  const newLogEntries: ActionLogEntry[] = [];

  // 1. 处理手动出售资产
  if (soldAssetId && salePrice !== undefined) {
    const safeSalePrice = safeNum(salePrice);
    const soldAsset = newAssets.find(a => a.id === soldAssetId);
    if (soldAsset) {
      newLogEntries.push(addLog(state, `出售「${soldAsset.name}」获得 $${safeSalePrice.toLocaleString()}`, safeSalePrice, 'positive'));
    }
    newCash = newCash + safeSalePrice;
    newAssets = newAssets.filter(a => a.id !== soldAssetId);
  }

  // 2. 处理政府征收 (AutoSettle)
  if (marketEvent?.type === 'government_buyout' && marketEvent?.effect?.autoSettle) {
    const targetTags: string[] = marketEvent.effect.assetTags || [];
    const fixedBuyout = safeNum(marketEvent.effect.fixedBuyout);

    newAssets = newAssets.filter(asset => {
      const matches = targetTags.some(tag =>
        (asset.tags || []).some(t => t.toLowerCase() === tag.toLowerCase()) ||
        (asset.subtype && asset.subtype.toLowerCase() === tag.toLowerCase())
      );
      if (matches) {
        newLogEntries.push(addLog(state, `政府征收「${asset.name}」获赔 $${fixedBuyout.toLocaleString()}`, fixedBuyout, 'positive'));
        newCash += fixedBuyout;
        return false; // 从资产列表中移除
      }
      return true;
    });
  }

  // 3. 处理全局宏观经济（加息/通胀）
  if (marketEvent?.globalMacro) {
    const { impact, changeRate } = marketEvent.globalMacro;
    if (impact === 'mortgage') {
      newMortgageMultiplier = Math.round(newMortgageMultiplier * safeNum(changeRate, 1.0) * 100) / 100;
      newLogEntries.push(addLog(state, `加息：房贷倍率升至 ×${newMortgageMultiplier}`, 0, 'negative'));
    }
    if (impact === 'expenses') {
      const nextInflation = Math.round((safeNum(state.inflationMultiplier, 1.0) || 1.0) * safeNum(changeRate, 1.0) * 100) / 100;
      newLogEntries.push(addLog(state, `通货膨胀：生活支出倍率升至 ×${nextInflation}`, 0, 'negative'));
    }
  }

  const newInflation = marketEvent?.globalMacro?.impact === 'expenses'
    ? Math.round((safeNum(state.inflationMultiplier, 1.0) || 1.0) * safeNum(marketEvent.globalMacro.changeRate, 1.0) * 100) / 100
    : marketEvent?.inflationEffect
      ? (safeNum(state.inflationMultiplier, 1.0) || 1.0) * 1.1
      : (safeNum(state.inflationMultiplier, 1.0) || 1.0);

 if (marketEvent?.inflationEffect) {
      newLogEntries.push(addLog(state, '通货膨胀：月支出增加 10%', 0, 'negative'));
    }

  if (marketEvent?.effect) {
    const effect = marketEvent.effect;
    const durationTurns = Math.max(1, safeNum(effect.durationTurns, 1));
    const source = marketEvent.name;
    const effectTags = effect.assetTags || [];
    const matchingAssets = newAssets.filter(asset => assetMatchesTags(asset, effectTags));

    const pushCashflowEffect = (tags: string[], multiplier: number, effectSource: string) => {
      if (!Number.isFinite(multiplier) || multiplier === 1) {
        return;
      }

      const operationEffect: OperationEffect = {
        id: `market_${marketEvent.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'market_cashflow',
        remainingTurns: durationTurns,
        cashflowMultiplier: multiplier,
        tags,
        source: effectSource,
      };
      newOperationEffects.push(operationEffect);
      const direction = multiplier > 1 ? '提高' : '降低';
      newLogEntries.push(addLog(
        state,
        `市场影响：${effectSource} 使匹配资产现金流${direction} ${Math.round(Math.abs(multiplier - 1) * 100)}%，持续 ${durationTurns} 回合`,
        0,
        multiplier > 1 ? 'positive' : 'negative'
      ));
    };

    if (effect.positiveTags?.length || effect.negativeTags?.length) {
      pushCashflowEffect(effect.positiveTags || [], safeNum(effect.incomeMultiplier, 1), `${source}（利好）`);
      pushCashflowEffect(effect.negativeTags || [], safeNum(effect.negativeIncomeMultiplier, 1), `${source}（压力）`);
    } else {
      pushCashflowEffect(effectTags, safeNum(effect.incomeMultiplier, 1), source);
    }

    if (effect.purchaseDiscount && effectTags.length > 0) {
      newOperationEffects.push({
        id: `market_discount_${marketEvent.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'market_purchase_discount',
        remainingTurns: durationTurns,
        amountModifier: Math.max(0, 1 - safeNum(effect.purchaseDiscount, 0)),
        tags: effectTags,
        source,
      });
      newLogEntries.push(addLog(
        state,
        `市场机会：${source}，新买入匹配资产首付降低 ${Math.round(safeNum(effect.purchaseDiscount, 0) * 100)}%，持续 ${durationTurns} 回合`,
        0,
        'positive'
      ));
    }

    if (effect.loanInterestModifier) {
      newOperationEffects.push({
        id: `market_loan_${marketEvent.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'market_loan_terms',
        remainingTurns: durationTurns,
        amountModifier: safeNum(effect.loanInterestModifier, 1),
        tags: effectTags,
        source,
      });
      newLogEntries.push(addLog(
        state,
        `市场机会：${source}，下一次贷款月利息倍率 ×${safeNum(effect.loanInterestModifier, 1)}，持续 ${durationTurns} 回合`,
        0,
        'positive'
      ));
    }

    if (effect.oneTimeCost && matchingAssets.length > 0) {
      const totalCost = Math.round(safeNum(effect.oneTimeCost) * matchingAssets.length);
      newCash -= totalCost;
      newLogEntries.push(addLog(
        state,
        `市场压力：${source}，${matchingAssets.length} 个匹配资产产生一次性支出 $${totalCost.toLocaleString()}`,
        -totalCost,
        'negative'
      ));
    }
  }

    return {
      ...state,
      assets: newAssets,
      cash: newCash,
      inflationMultiplier: newInflation,
      mortgageMultiplier: newMortgageMultiplier,
      operationEffects: newOperationEffects,
      marketPrices: state.marketPrices || [...DEFAULT_STOCK_PRICES],
      currentEvent: null,
      canRoll: true,
      actionLog: [...(state.actionLog || []), ...newLogEntries],
      actionStep: (state.actionStep || 0) + 1,
    };
}; // <--- 确保这个大括号和分号存在，用来结束 handleMarketEvent
  
export const sellAsset = (state: GameState, assetId: string, salePrice: number): GameState => {
  const assetToSell = state.assets.find(a => a.id === assetId);
  if (!assetToSell) {
    return state;
  }

  const safeSalePrice = safeNum(salePrice);
  const safeCash = safeNum(state.cash);
  const logEntry = addLog(state, `出售资产「${assetToSell.name}」获得 $${safeSalePrice.toLocaleString()}`, safeSalePrice, 'positive');

  return {
    ...state,
    professionData: state.professionData,
    assets: state.assets.filter(a => a.id !== assetId),
    loans: [...(state.loans || [])],
    children: state.children ?? 0,
    inflationMultiplier: state.inflationMultiplier ?? 1.0,
    marketPrices: state.marketPrices || [...DEFAULT_STOCK_PRICES],
    actionLog: [...(state.actionLog || []), logEntry],
    actionStep: (state.actionStep || 0) + 1,
    cash: safeCash + safeSalePrice,
  };
};

export const getAffectedAssets = (state: GameState, marketEvent: any) => {
  if (!marketEvent.effect) return [];

  const { assetName, assetCategory, assetTags } = marketEvent.effect;

  return state.assets.filter(asset => {
    if (assetName) {
      const normalizedAssetName = asset.name.toLowerCase();
      const normalizedSearchName = assetName.toLowerCase();
      if (normalizedAssetName.includes(normalizedSearchName)) return true;
      if (asset.tags && asset.tags.some(tag => {
        const normalizedTag = tag.toLowerCase();
        return normalizedTag.includes(normalizedSearchName) || normalizedSearchName.includes(normalizedTag);
      })) return true;
    }

    if (assetCategory) {
      if (asset.category === assetCategory) return true;
      if (asset.tags && asset.tags.some(tag => tag.toLowerCase() === assetCategory.toLowerCase())) return true;
    }

    if (assetTags && asset.tags) {
      if (assetTags.some((eventTag: string) => {
        const normalizedEventTag = eventTag.toLowerCase();
        return asset.tags.some((assetTag: string) => {
          const normalizedAssetTag = assetTag.toLowerCase();
          return normalizedAssetTag.includes(normalizedEventTag) ||
                 normalizedEventTag.includes(normalizedAssetTag) ||
                 asset.name.toLowerCase().includes(normalizedEventTag);
        });
      })) {
        return true;
      }
    }

    return false;
  });
};

export const calculateSalePrice = (asset: Asset, state: GameState, marketEvent: any): number => {
  if (isStockLike(asset)) {
    const stockSymbol = asset.symbol || getStockSymbol(asset.tags, asset.name);
    const currentPrice = getCurrentStockPrice(state, stockSymbol, asset.tags, asset.name);
    const shares = safeNum(asset.shares, 0);
    return Math.round((shares > 0 ? shares : 1) * currentPrice);
  }

  const effect = marketEvent?.effect;
  if (effect) {
    if (effect.fixedPrice) return safeNum(effect.fixedPrice);
    if (effect.offerPrice) return safeNum(effect.offerPrice);
    if (effect.fixedBuyout) return safeNum(effect.fixedBuyout);
    
    if (effect.priceMultiplier) {
      return Math.floor(safeNum(asset.cost) * safeNum(effect.priceMultiplier, 1));
    }
  }

  return safeNum(asset.cost);
};

export const getStockAssets = (state: GameState): Asset[] => {
  return (state.assets || []).filter(a =>
    (a.tags || []).some(t => ['Stock', 'stock', 'MYT4U', 'OK4U', 'MYJT'].includes(t))
  );
};

export const getSmallDealCards = () => smallDealCards.filter(c => c.downPayment < 10000);
export const getBigBusinessCards = () => smallDealCards.filter(c => c.downPayment >= 10000);
