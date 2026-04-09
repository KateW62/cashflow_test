/**
 * 智能市场趋势系统 v1.0
 * 简单的市场周期管理
 */

export interface MarketTrend {
  id: string;
  name: string;
  description: string;
  cycle: 'boom' | 'stable' | 'recession';
  duration: number; // 持续时间（回合数）
  affectedCategories: string[];
  multiplier: number; // 价格乘数
}

export class SmartMarketSystem {
  private currentTrend: MarketTrend | null = null;
  private trendDuration: number = 0;
  private gameStep: number = 0;
  
  // 预定义的市场趋势
  private readonly marketTrends: MarketTrend[] = [
    {
      id: 'tech_boom',
      name: '科技繁荣',
      description: '科技公司股价飙升，创新企业获得高估值',
      cycle: 'boom',
      duration: 15,
      affectedCategories: ['Stock', 'Technology'],
      multiplier: 1.4
    },
    {
      id: 'housing_boom',
      name: '房地产繁荣',
      description: '房地产市场火热，房价快速上涨',
      cycle: 'boom',
      duration: 20,
      affectedCategories: ['RealEstate'],
      multiplier: 1.3
    },
    {
      id: 'economic_recession',
      name: '经济衰退',
      description: '经济下行，大部分资产价格下跌',
      cycle: 'recession',
      duration: 12,
      affectedCategories: ['Stock', 'RealEstate', 'Business'],
      multiplier: 0.7
    },
    {
      id: 'stable_growth',
      name: '稳定增长',
      description: '经济环境稳定，资产温和增长',
      cycle: 'stable',
      duration: 25,
      affectedCategories: ['Stock', 'RealEstate'],
      multiplier: 1.1
    }
  ];
  
  /**
   * 更新市场状态（每回合调用）
   */
  updateMarket(gameStep: number): void {
    this.gameStep = gameStep;
    
    // 减少当前趋势持续时间
    if (this.currentTrend) {
      this.trendDuration--;
      
      // 趋势结束
      if (this.trendDuration <= 0) {
        this.currentTrend = null;
      }
    }
    
    // 基于游戏进度决定新趋势
    this.checkForNewTrend();
  }
  
  /**
   * 检查是否需要生成新趋势
   */
  private checkForNewTrend(): void {
    if (this.currentTrend) return; // 已有活跃趋势
    
    // 基于游戏进度和随机性决定新趋势
    const trendProbability = this.calculateTrendProbability();
    
    if (Math.random() < trendProbability) {
      this.generateNewTrend();
    }
  }
  
  /**
   * 计算新趋势生成概率
   */
  private calculateTrendProbability(): number {
    let probability = 0.05; // 基础5%概率
    
    // 游戏越后期，趋势变化越频繁
    if (this.gameStep > 30) {
      probability += 0.05;
    }
    if (this.gameStep > 60) {
      probability += 0.05;
    }
    
    return probability;
  }
  
  /**
   * 生成新趋势
   */
  private generateNewTrend(): void {
    // 随机选择一个趋势（可以加入更智能的选择逻辑）
    const availableTrends = [...this.marketTrends];
    const weights = availableTrends.map(trend => {
      // 根据当前游戏进度调整权重
      switch (trend.cycle) {
        case 'boom':
          return this.gameStep < 20 ? 1.5 : 1.0; // 前期更容易繁荣
        case 'recession':
          return this.gameStep > 40 ? 1.5 : 0.5; // 后期更容易衰退
        default:
          return 1.0;
      }
    });
    
    // 加权随机选择
    const selectedIndex = this.weightedRandomChoice(availableTrends, weights);
    this.currentTrend = availableTrends[selectedIndex];
    this.trendDuration = this.currentTrend.duration;
  }
  
  /**
   * 加权随机选择
   */
  private weightedRandomChoice(items: any[], weights: number[]): number {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return i;
      }
    }
    
    return items.length - 1;
  }
  
  /**
   * 获取当前市场趋势
   */
  getCurrentTrend(): MarketTrend | null {
    return this.currentTrend;
  }
  
  /**
   * 应用市场趋势到资产价格
   */
  applyTrendToPrice(basePrice: number, category: string): number {
    if (!this.currentTrend) return basePrice;
    
    // 检查该类别是否受当前趋势影响
    if (this.currentTrend.affectedCategories.includes(category)) {
      return basePrice * this.currentTrend.multiplier;
    }
    
    return basePrice;
  }
  
  /**
   * 获取市场状态报告
   */
  getMarketReport(): MarketReport {
    if (!this.currentTrend) {
      return {
        status: 'stable',
        description: '市场处于稳定状态',
        trendName: null,
        remainingTurns: 0,
        recommendations: ['市场稳定，适合常规投资']
      };
    }
    
    const trend = this.currentTrend;
    let recommendations: string[] = [];
    
    switch (trend.cycle) {
      case 'boom':
        recommendations = [
          '📈 市场繁荣期，考虑获利了结',
          '💡 注意泡沫风险，不要过度投资'
        ];
        break;
      case 'recession':
        recommendations = [
          '📉 市场衰退期，保持现金储备',
          '💰 寻找被低估的优质资产'
        ];
        break;
      case 'stable':
        recommendations = [
          '🔄 市场稳定，按计划投资',
          '📊 关注长期价值投资'
        ];
        break;
    }
    
    return {
      status: trend.cycle,
      description: trend.description,
      trendName: trend.name,
      remainingTurns: this.trendDuration,
      recommendations
    };
  }
  
  /**
   * 重置市场系统（新游戏开始时调用）
   */
  reset(): void {
    this.currentTrend = null;
    this.trendDuration = 0;
    this.gameStep = 0;
  }
}

// 全局市场系统实例
export const marketSystem = new SmartMarketSystem();

// 类型定义
interface MarketReport {
  status: 'boom' | 'stable' | 'recession';
  description: string;
  trendName: string | null;
  remainingTurns: number;
  recommendations: string[];
}