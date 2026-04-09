import { GameState, StockPrice } from './gameTypes';
import { SmartMarketSystem } from './SmartMarketSystem';

/**
 * 股票市场集成模块
 * 将智能市场趋势系统与实际股票交易集成
 */

/**
 * 获取考虑市场趋势的股票价格
 * @param state 游戏状态
 * @param stockTag 股票标签（如 'MYT4U', 'OK4U'）
 * @param marketSystem 市场系统实例
 * @returns 调整后的股票价格
 */
export const getAdjustedStockPrice = (
  state: GameState, 
  stockTag: string, 
  marketSystem: SmartMarketSystem
): number => {
  // 1. 获取基础价格（从市场价格表）
  const basePrice = getMarketPrice(state, stockTag);
  
  // 2. 应用市场趋势乘数
  const adjustedPrice = marketSystem.applyTrendToPrice(basePrice, 'Stock');
  
  return Math.round(adjustedPrice);
};

/**
 * 获取所有股票的调整后价格
 * @param state 游戏状态
 * @param marketSystem 市场系统实例
 * @returns 调整后的股票价格数组
 */
export const getAllAdjustedStockPrices = (
  state: GameState, 
  marketSystem: SmartMarketSystem
): StockPrice[] => {
  const stockTags = ['MYT4U', 'OK4U', 'MYJT', 'Stock'];
  
  return stockTags.map(tag => ({
    tag,
    price: getAdjustedStockPrice(state, tag, marketSystem)
  }));
};

/**
 * 更新市场价格表以反映当前趋势
 * @param state 游戏状态
 * @param marketSystem 市场系统实例
 * @returns 更新后的游戏状态
 */
export const applyMarketTrendsToStockPrices = (
  state: GameState,
  marketSystem: SmartMarketSystem
): GameState => {
  // 获取调整后的所有股票价格
  const adjustedPrices = getAllAdjustedStockPrices(state, marketSystem);
  
  // 更新市场价格表
  const updatedMarketPrices = state.marketPrices.map(price => {
    const adjusted = adjustedPrices.find(p => p.tag === price.tag);
    return adjusted ? { ...price, price: adjusted.price } : price;
  });
  
  return {
    ...state,
    marketPrices: updatedMarketPrices
  };
};

/**
 * 辅助函数：从市场价格表中获取股票价格
 */
const getMarketPrice = (state: GameState, tag: string): number => {
  const entry = state.marketPrices?.find(p => p.tag.toLowerCase() === tag.toLowerCase());
  return entry?.price || 10; // 默认价格
};

/**
 * 获取股票买卖建议
 * @param state 游戏状态
 * @param marketSystem 市场系统实例
 * @returns 买卖建议
 */
export const getStockTradingAdvice = (
  state: GameState,
  marketSystem: SmartMarketSystem
): { recommendation: string; confidence: number } => {
  const currentTrend = marketSystem.getCurrentTrend();
  
  if (!currentTrend) {
    return {
      recommendation: '市场稳定，按计划投资',
      confidence: 0.5
    };
  }
  
  const { cycle, multiplier } = currentTrend;
  const isStockAffected = currentTrend.affectedCategories.includes('Stock');
  
  if (!isStockAffected) {
    return {
      recommendation: '当前趋势不影响股票市场',
      confidence: 0.3
    };
  }
  
  switch (cycle) {
    case 'boom':
      if (multiplier > 1.3) {
        return {
          recommendation: '股市繁荣！考虑卖出获利，避免追高',
          confidence: 0.8
        };
      }
      return {
        recommendation: '股市向好，可适量买入',
        confidence: 0.6
      };
      
    case 'recession':
      if (multiplier < 0.8) {
        return {
          recommendation: '股市低迷！保持现金，等待机会',
          confidence: 0.9
        };
      }
      return {
        recommendation: '股市偏弱，谨慎操作',
        confidence: 0.7
      };
      
    case 'stable':
      return {
        recommendation: '市场平稳，按计划投资',
        confidence: 0.5
      };
      
    default:
      return {
        recommendation: '关注市场变化',
        confidence: 0.3
      };
  }
};

/**
 * 计算股票投资的预期收益
 * @param state 游戏状态
 * @param stockTag 股票标签
 * @param investmentAmount 投资金额
 * @param marketSystem 市场系统实例
 * @returns 预期收益分析
 */
export const calculateStockInvestmentReturn = (
  state: GameState,
  stockTag: string,
  investmentAmount: number,
  marketSystem: SmartMarketSystem
): {
  currentPrice: number;
  adjustedPrice: number;
  expectedReturn: number;
  riskLevel: 'low' | 'medium' | 'high';
  advice: string;
} => {
  const currentPrice = getMarketPrice(state, stockTag);
  const adjustedPrice = getAdjustedStockPrice(state, stockTag, marketSystem);
  const currentTrend = marketSystem.getCurrentTrend();
  
  let expectedReturn = 0;
  let riskLevel: 'low' | 'medium' | 'high' = 'medium';
  let advice = '';
  
  if (currentTrend && currentTrend.affectedCategories.includes('Stock')) {
    const { cycle, multiplier } = currentTrend;
    
    // 基于趋势计算预期收益
    switch (cycle) {
      case 'boom':
        expectedReturn = (multiplier - 1) * 100; // 百分比
        riskLevel = multiplier > 1.3 ? 'high' : 'medium';
        advice = '考虑获利了结，避免追高';
        break;
        
      case 'recession':
        expectedReturn = (multiplier - 1) * 100; // 负值
        riskLevel = 'high';
        advice = '等待更好的买入时机';
        break;
        
      case 'stable':
        expectedReturn = 5; // 稳定收益预期
        riskLevel = 'low';
        advice = '适合长期投资';
        break;
    }
  } else {
    // 无趋势影响时的默认预期
    expectedReturn = 8;
    riskLevel = 'medium';
    advice = '按计划投资';
  }
  
  return {
    currentPrice,
    adjustedPrice,
    expectedReturn,
    riskLevel,
    advice
  };
};