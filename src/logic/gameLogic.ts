import { GameState, GameSpace, Asset, ActionLogEntry, StockPrice } from './gameTypes';
import { getRandomProfession, getTotalExpenses, Profession } from '../config/professions';
import { getRandomSmallDealCard, getRandomBigDealCard, getRandomDoodadCard, SmallDealCard, BigDealCard, smallDealCards } from '../config/cards';
import { Dream } from '../config/dreams';
import { getRandomMarketEvent, MarketEvent } from '../config/marketEvents';
import { SmartUnemploymentSystem } from './SmartUnemploymentSystem';
import { SmartMarketSystem } from './SmartMarketSystem';
import { getAdjustedStockPrice, applyMarketTrendsToStockPrices } from './StockMarketIntegration';

export const MAX_LOAN_MULTIPLIER = 10;

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
    actionLog: [],
    actionStep: 0,
    isMultiplayer: false,
  };
};

export const safeNum = (val: unknown, fallback: number = 0): number => {
  const n = Number(val);
  return isNaN(n) || !isFinite(n) ? fallback : n;
};

const addLog = (
  state: GameState,
  message: string,
  cashChange: number,
  type: 'positive' | 'negative' | 'neutral' = 'neutral'
): ActionLogEntry => {
  // 避免循环调用，直接计算基础财务数据
  const safeChildren = safeNum(state.children);
  const safeProfessionData = state.professionData ?? {
    salary: 0, tax: 0, mortgage: 0, studentLoan: 0, otherExpenses: 0, childExpense: 0,
  };
  
  // 简单计算被动收入，避免递归
  const passiveIncome = (state.assets || []).reduce((sum, asset) => {
    return sum + safeNum(asset?.monthlyIncome, 0);
  }, 0);
  
  const salary = safeNum(safeProfessionData.salary);
  const totalIncome = salary + passiveIncome;
  const monthlyCashFlow = totalIncome - safeNum(safeProfessionData.mortgage) - safeNum(safeProfessionData.otherExpenses);
  
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    step: state.actionStep,
    message,
    cashChange,
    type,
    timestamp: new Date().toISOString(),
    passiveIncome,
    monthlyCashFlow,
  };
};

export const calculateFinancials = (state: GameState) => {
  const safeChildren = safeNum(state.children);
  const safeInflation = safeNum(state.inflationMultiplier, 1.0) || 1.0;
  const safeMortgageMultiplier = safeNum(state.mortgageMultiplier, 1.0) || 1.0;

  const passiveIncome = (state.assets || []).reduce((sum, asset) => {
    return sum + safeNum(asset?.monthlyIncome, 0);
  }, 0);

  const loanInterest = (state.loans || []).reduce((sum, loan) => {
    return sum + safeNum(loan?.monthlyInterest, 0);
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

  const totalExpenses = getTotalExpenses(professionWithAdjustedMortgage, safeChildren, safeInflation) + loanInterest;
  const salary = safeNum(safeProfessionData.salary);
  const totalIncome = salary + passiveIncome;
  const monthlyCashFlow = totalIncome - totalExpenses;
  const safeCash = safeNum(state.cash);

  const totalLoans = (state.loans || []).reduce((sum, loan) => sum + safeNum(loan?.amount, 0), 0);
  const weeklyCashFlow = monthlyCashFlow;
  const maxLoanAllowed = Math.max(0, weeklyCashFlow * MAX_LOAN_MULTIPLIER);
  const isOverLeveraged = maxLoanAllowed > 0 && totalLoans > maxLoanAllowed;

  return {
    totalIncome: safeNum(totalIncome),
    totalExpenses: safeNum(totalExpenses),
    monthlyCashFlow: safeNum(monthlyCashFlow),
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
  const { monthlyCashFlow } = calculateFinancials(state);
  return {
    ...state,
    assets: [...state.assets],
    loans: [...state.loans],
    cash: state.cash + monthlyCashFlow,
  };
};

export const canTakeLoan = (state: GameState, amount: number): { canTake: boolean; reason?: string } => {
  if (amount % 1000 !== 0 || amount <= 0) {
    return { canTake: false, reason: '贷款金额必须是$1000的倍数' };
  }

  const { monthlyCashFlow, totalLoans, maxLoanAllowed } = calculateFinancials(state);

  if (monthlyCashFlow <= 0) {
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

  const newLoanInterest = amount * 0.1;
  const futureMonthlyFlow = monthlyCashFlow - newLoanInterest;

  if (futureMonthlyFlow < 0) {
    return { canTake: false, reason: '您的现金流不足以覆盖贷款利息，银行拒绝了您的申请' };
  }

  return { canTake: true };
};

export const takeLoan = (state: GameState, amount: number): GameState => {
  const loanCheck = canTakeLoan(state, amount);
  if (!loanCheck.canTake) {
    return state;
  }

  const newLoan = {
    id: `loan_${Date.now()}`,
    amount: amount,
    monthlyInterest: amount * 0.1,
    takenDate: new Date().toISOString(),
  };

  const logEntry = addLog(state, `银行贷款 $${amount.toLocaleString()}，月利息 $${(amount * 0.1).toLocaleString()}`, amount, 'neutral');

  return {
    ...state,
    assets: [...state.assets],
    cash: state.cash + amount,
    loans: [...state.loans, newLoan],
    actionLog: [...(state.actionLog || []), logEntry],
    actionStep: (state.actionStep || 0) + 1,
  };
};

export const repayLoan = (state: GameState, loanId: string): GameState => {
  const loan = state.loans.find(l => l.id === loanId);
  if (!loan || state.cash < loan.amount) {
    return state;
  }

  const logEntry = addLog(state, `还清贷款 $${loan.amount.toLocaleString()}，月利息减少 $${loan.monthlyInterest.toLocaleString()}`, -loan.amount, 'neutral');

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
  let logs: ActionLogEntry[] = [];

  // 1. 自动变卖资产逻辑
  while (currentCash < 0 && remainingAssets.length > 0) {
    // 优先卖出没有贷款的资产或高价值资产（这里可以根据你的策略调整）
    const assetIndex = 0; 
    const assetToSell = remainingAssets[assetIndex];
    
    // 计算售价（基于当前市场事件或初始成本）
    const salePrice = calculateSalePrice(assetToSell, state, state.currentEvent || {});
    currentCash += salePrice;
    
    const logEntry = addLog(
      state, 
      `破产清算：自动变卖资产「${assetToSell.name}」，获得现金 $${salePrice.toLocaleString()}`, 
      salePrice, 
      'positive'
    );
    logs.push(logEntry);

    // 移除资产
    remainingAssets.splice(assetIndex, 1);
  }

  // 2. 构造初步的新状态
  let newState: GameState = {
    ...state,
    cash: currentCash,
    assets: remainingAssets,
    actionLog: [...(state.actionLog || []), ...logs],
  };

  // 🛠️ 关键修复：显式调用财务计算函数
  // 只有重新调用 calculateFinancials，被移除资产的 weeklyIncome 才会从总现金流中扣除
  const updatedFinancials = calculateFinancials(newState);

  // 3. 返回最终对齐后的状态
  return {
    ...newState,
    // 确保 UI 上显示的月现金流（或周现金流）是即时更新后的
    // 如果你的 GameState 结构中直接存储了这些字段，请在此同步
    ...updatedFinancials 
  };
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
    const { monthlyCashFlow } = calculateFinancials(tempState);
    const safeWCF = safeNum(monthlyCashFlow);

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
    case 'Opportunity':
      newState = { ...newState, assets: [...newState.assets], loans: [...newState.loans], currentEvent: getRandomSmallDealCard(), canRoll: false };
      break;
    case 'Doodad':
      newState = { ...newState, assets: [...newState.assets], loans: [...newState.loans], currentEvent: getRandomDoodadCard(), canRoll: false };
      break;
    case 'BigDeal':
      newState = { ...newState, assets: [...newState.assets], loans: [...newState.loans], currentEvent: getRandomBigDealCard(), canRoll: false };
      break;
case 'Market': {
      const marketEvent = getRandomMarketEvent();
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

  return newState;
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
  const safeCash = safeNum(state.cash);
  const safeDownPayment = safeNum(card.downPayment);

  if (safeCash < safeDownPayment) {
    return state;
  }

  const { isOverLeveraged } = calculateFinancials(state);
  if (isOverLeveraged) {
    return state;
  }

  const isStock = (card.tags || []).some(t => t.toLowerCase() === 'stock');
  const stockData = (card as SmallDealCard).stockData;

  // 确保所有必需的属性都有值
  const newAsset: Asset = {
    id: `asset_${Date.now()}`,
    name: card.name || 'Unknown Asset',
    category: card.category || 'real_estate',
    subtype: card.subtype || 'Income',
    tags: [...(card.tags || [])],
    cost: safeNum(card.totalCost),
    downPayment: safeDownPayment,
    weeklyIncome: safeNum(card.monthlyIncome, 0) / 4, // 月收益转周收益
    purchaseDate: new Date().toISOString(),
    ...(isStock && stockData ? {
      symbol: card.symbol || card.name,
      shares: stockData.shares || 0,
      sharePrice: stockData.sharePrice || 0,
    } : {}),
  };

  const logEntry = addLog(state, `买入「${card.name}」首付 $${safeDownPayment.toLocaleString()}，月收益 ${card.monthlyIncome >= 0 ? '+' : ''}$${card.monthlyIncome}`, -safeDownPayment, 'negative');

  return {
    ...state,
    professionData: state.professionData,
    assets: [...(state.assets || []), newAsset],
    loans: [...(state.loans || [])],
    children: state.children ?? 0,
    inflationMultiplier: state.inflationMultiplier ?? 1.0,
    mortgageMultiplier: state.mortgageMultiplier ?? 1.0,
    marketPrices: state.marketPrices || [...DEFAULT_STOCK_PRICES],
    actionLog: [...(state.actionLog || []), logEntry],
    actionStep: (state.actionStep || 0) + 1,
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
  const cost = safeNum(card.cost);
  const logEntry = addLog(state, `支出「${card.name}」$${cost.toLocaleString()}`, -cost, 'negative');
  return {
    ...state,
    assets: [...state.assets],
    cash: state.cash - cost,
    currentEvent: null,
    canRoll: true,
    actionLog: [...(state.actionLog || []), logEntry],
    actionStep: (state.actionStep || 0) + 1,
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
    type: success ? 'successful_investment' : 'failed_investment',
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
    type: isRepayment ? 'loan_repayment' : 'loan_taken',
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
  const cashPenalty = Math.floor(Math.max(0, safeCash) * 0.1);

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

  const logEntry = addLog(state, `失业！扣除 10% 现金 $${cashPenalty.toLocaleString()}，停薪 ${unemploymentPaydayCount || unemploymentCount} 次（当前失业风险：${riskPercentage}%）`, -cashPenalty, 'negative');

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

  const { totalIncome } = calculateFinancials(state);
  const safeTotalIncome = safeNum(totalIncome);
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
  const { monthlyCashFlow: weeklyCashFlow, isOverLeveraged } = calculateFinancials(newState);
  
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
  const entry = (state.marketPrices || []).find(p => p.tag.toLowerCase() === tag.toLowerCase());
  return safeNum(entry?.price, 10);
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
    const nameMatch = targetName && stock.symbol === targetName;
    const tagMatch = tags.length > 0 && stock.tags?.some(t => 
      tags.map(incomingTag => incomingTag.toLowerCase()).includes(t.toLowerCase())
    );

    if (nameMatch || tagMatch) {
      // 2. 价格更新逻辑：
      // 如果卡片定义了固定价格 (fixedPrice)，则直接使用；否则在当前价基础上乘倍率
      const newPrice = fixedPrice !== undefined 
        ? fixedPrice 
        : Math.round(stock.currentPrice * multiplier);
      
      return { ...stock, currentPrice: newPrice };
    }

    // 不匹配的股票保持原样，不做任何修改
    return stock;
  });
};

export const buyStockShares = (state: GameState, assetId: string, sharesToBuy: number): GameState => {
  const asset = state.assets.find(a => a.id === assetId);
  if (!asset || sharesToBuy <= 0) return state;

  const priceTag = (asset.tags || []).find(t => ['Stock', 'MYT4U', 'OK4U', 'MYJT'].includes(t)) || 'Stock';
  
  // 应用市场趋势到股票价格
  const marketSystem = new SmartMarketSystem();
  const adjustedPrice = getAdjustedStockPrice(state, priceTag, marketSystem);
  
  const totalCost = Math.round(sharesToBuy * adjustedPrice);

  if (safeNum(state.cash) < totalCost) return state;

  const updatedAsset: Asset = {
    ...asset,
    shares: (asset.shares ?? 0) + sharesToBuy,
    cost: asset.cost + totalCost,
    downPayment: asset.downPayment + totalCost,
    sharePrice: adjustedPrice,
  };

  const logEntry = addLog(state, `买入「${asset.name}」${sharesToBuy} 股 @$${adjustedPrice}，共 $${totalCost.toLocaleString()}`, -totalCost, 'negative');

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

  // --- 关键修复开始 ---
  
  // 1. 查找当前股票在全局市场中的实时单价
  // 优先匹配 symbol (如 MYJT)，如果没有则看标签
  const marketPriceEntry = state.marketPrices?.find(p => 
    p.symbol === asset.name || (asset.tags || []).includes(p.symbol)
  );
  
  // 如果没找到市场价，则退而求其次使用资产初始买入价（保底）
  // 应用市场趋势调整
  const marketSystem = new SmartMarketSystem();
  const basePrice = marketPriceEntry ? marketPriceEntry.currentPrice : (asset.sharePrice || 0);
  const currentPrice = marketSystem.applyTrendToPrice(basePrice, 'Stock');
  
  // 2. 计算本次卖出的总收入
  const totalRevenue = Math.round(sharesToSell * currentPrice);
  
  // --- 关键修复结束 ---

  const remainingShares = currentShares - sharesToSell;
  const logEntry = addLog(
    state, 
    `卖出「${asset.name}」${sharesToSell} 股 @$${currentPrice}，回款 $${totalRevenue.toLocaleString()}`, 
    totalRevenue, 
    'positive'
  );

  // 处理全部卖完的情况
  if (remainingShares <= 0) {
    const newState = {
      ...state,
      cash: state.cash + totalRevenue,
      assets: state.assets.filter(a => a.id !== assetId),
      actionLog: [...(state.actionLog || []), logEntry],
      actionStep: (state.actionStep || 0) + 1,
    };
    // 别忘了我们之前说的：卖出资产后重算财务数据，防止被动收入（分红等）残余
    return { ...newState, ...calculateFinancials(newState) };
  }

  // 处理部分卖出的情况（按比例缩减成本和首付）
  const avgCostPerShare = asset.shares && asset.shares > 0 ? asset.cost / asset.shares : currentPrice;
  const updatedAsset: Asset = {
    ...asset,
    shares: remainingShares,
    cost: Math.round(remainingShares * avgCostPerShare),
    downPayment: Math.round(remainingShares * avgCostPerShare),
    // 记录卖出时的成交价
    sharePrice: currentPrice, 
  };

  const finalState = {
    ...state,
    cash: state.cash + totalRevenue,
    assets: state.assets.map(a => a.id === assetId ? updatedAsset : a),
    actionLog: [...(state.actionLog || []), logEntry],
    actionStep: (state.actionStep || 0) + 1,
  };

  // 同样重算财务数据
  return { ...finalState, ...calculateFinancials(finalState) };
};

export const handleMarketEvent = (state: GameState, soldAssetId?: string, salePrice?: number): GameState => {
  const safeCash = safeNum(state.cash);
  const marketEvent = state.currentEvent as any;

  let newCash = safeCash;
  let newAssets = [...(state.assets || [])];
  let newMortgageMultiplier = safeNum(state.mortgageMultiplier, 1.0) || 1.0;
  let newMarketPrices = [...(state.marketPrices || [])];
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
  if (marketEvent?.type === 'global_macro' && marketEvent?.globalMacro) {
    const { impact, changeRate } = marketEvent.globalMacro;
    if (impact === 'mortgage') {
      newMortgageMultiplier = Math.round(newMortgageMultiplier * safeNum(changeRate, 1.0) * 100) / 100;
      newLogEntries.push(addLog(state, `加息：房贷倍率升至 ×${newMortgageMultiplier}`, 0, 'negative'));
    }
  }

  // 4. 🚀 关键修复：支持固定价和特定名称的价格更新
  if (marketEvent?.effect) {
    const { assetTags, assetName, priceMultiplier, fixedPrice } = marketEvent.effect;
    // 只有当存在更新指令时才调用
    if (assetTags || assetName || fixedPrice || priceMultiplier) {
      newMarketPrices = updateMarketPrices(
        state, 
        assetTags || [], 
        priceMultiplier || 1.0, 
        fixedPrice, 
        assetName
      );
    }
  }

  const newInflation = marketEvent?.inflationEffect
    ? (safeNum(state.inflationMultiplier, 1.0) || 1.0) * 1.1
    : (safeNum(state.inflationMultiplier, 1.0) || 1.0);

 if (marketEvent?.inflationEffect) {
      newLogEntries.push(addLog(state, '通货膨胀：月支出增加 10%', 0, 'negative'));
    }

    // 构造中间状态并重算财务
    let nextState: GameState = {
      ...state,
      assets: newAssets,
      cash: newCash,
      inflationMultiplier: newInflation,
      mortgageMultiplier: newMortgageMultiplier,
      marketPrices: newMarketPrices,
      currentEvent: null,
      canRoll: true,
      actionLog: [...(state.actionLog || []), ...newLogEntries],
      actionStep: (state.actionStep || 0) + 1,
    };

    const finalFinancials = calculateFinancials(nextState);

    return {
      ...nextState,
      ...finalFinancials
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
  // 1. 优先逻辑：如果是股票 (Stock)，必须从全局实时价格表 marketPrices 中查询最新价
  const isStock = asset.subtype === 'stock' || (asset.tags || []).some(t => 
    ['Stock', 'stock', 'MYJT', 'OK4U', 'MYT4U'].includes(t)
  );

  if (isStock) {
    const marketPriceEntry = state.marketPrices?.find(p => 
      p.symbol === asset.name || (asset.tags || []).includes(p.symbol)
    );
    
    if (marketPriceEntry) {
      // 实时卖出总价 = 持有股数 * 当前市场单价
      const shares = safeNum(asset.shares, 0);
      return shares > 0 ? shares * marketPriceEntry.currentPrice : marketPriceEntry.currentPrice;
    }
  }

  // 2. 次优逻辑：如果是房地产或企业，检查当前市场事件是否有特殊出价 (如固定收购价)
  const effect = marketEvent?.effect;
  if (effect) {
    if (effect.fixedPrice) return safeNum(effect.fixedPrice);
    if (effect.offerPrice) return safeNum(effect.offerPrice);
    if (effect.fixedBuyout) return safeNum(effect.fixedBuyout);
    
    if (effect.priceMultiplier) {
      const basePrice = asset.shares && asset.sharePrice
        ? asset.shares * asset.sharePrice
        : safeNum(asset.cost);
      return Math.floor(basePrice * safeNum(effect.priceMultiplier, 1));
    }
  }

  // 3. 保底逻辑：如果没有匹配的市场价或事件，返回资产的初始成本/买入价
  return safeNum(asset.cost);
};

export const getStockAssets = (state: GameState): Asset[] => {
  return (state.assets || []).filter(a =>
    (a.tags || []).some(t => ['Stock', 'stock', 'MYT4U', 'OK4U', 'MYJT'].includes(t))
  );
};

export const getSmallDealCards = () => smallDealCards.filter(c => c.downPayment < 10000);
export const getBigBusinessCards = () => smallDealCards.filter(c => c.downPayment >= 10000);
