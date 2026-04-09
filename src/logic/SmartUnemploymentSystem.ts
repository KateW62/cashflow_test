import { GameState } from './gameTypes';

/**
 * 智能失业风险系统 v1.0
 * 逐步替换原有的固定概率失业系统
 */
export class SmartUnemploymentSystem {
  // 存储玩家行为历史（最近20次决策）
  private playerBehaviorHistory: PlayerBehavior[] = [];
  
  // 当前市场条件
  private marketConditions: MarketConditions = {
    cycle: 'stable',
    unemploymentRate: 0.05,
    economicStability: 0.8,
  };
  
  // 保护期（新手保护）
  private protectionTurns: number = 0;
  
  /**
   * 主要方法：计算动态失业风险
   * 返回 0.01 到 0.15 之间的概率（1% 到 15%）
   */
  calculateUnemploymentRisk(gameState: GameState): number {
    // 基础风险（远低于原来的4.2%）
    let risk = 0.015; // 1.5%基础风险
    
    // 1. 市场条件影响（±50%）
    risk *= this.getMarketMultiplier();
    
    // 2. 个人财务状况影响（-1% 到 +6%）
    risk += this.getFinancialRiskComponent(gameState);
    
    // 3. 行为模式影响（0% 到 +3%）
    risk += this.getBehaviorRiskComponent(gameState);
    
    // 4. 保护期机制
    if (this.protectionTurns > 0) {
      risk *= 0.5; // 保护期内风险减半
      this.protectionTurns--;
    }
    
    // 确保在合理范围内
    return Math.max(0.01, Math.min(risk, 0.15));
  }
  
  /**
   * 市场条件影响系数
   */
  private getMarketMultiplier(): number {
    const { cycle, unemploymentRate, economicStability } = this.marketConditions;
    
    let multiplier = 1.0;
    
    // 市场周期影响
    switch (cycle) {
      case 'recession':
        multiplier *= 1.8; // 衰退期增加80%风险
        break;
      case 'boom':
        multiplier *= 0.6; // 繁荣期减少40%风险
        break;
      default:
        multiplier *= 1.0;
    }
    
    // 失业率影响
    if (unemploymentRate > 0.08) {
      multiplier *= 1.4;
    } else if (unemploymentRate < 0.03) {
      multiplier *= 0.7;
    }
    
    // 经济稳定性影响
    multiplier *= (2 - economicStability);
    
    return multiplier;
  }
  
  /**
   * 财务状况风险组件
   */
  private getFinancialRiskComponent(gameState: GameState): number {
    let risk = 0;
    const { cash, professionData, loans, children } = gameState;
    
    // 计算月度支出
    const monthlyExpenses = professionData.tax + 
                           professionData.mortgage + 
                           professionData.studentLoan + 
                           professionData.otherExpenses +
                           (children * professionData.childExpense) +
                           loans.reduce((sum, loan) => sum + loan.weeklyInterest * 4, 0);
    
    // 现金储备风险（关键！）
    const cashRatio = cash / monthlyExpenses;
    if (cashRatio < 1) { // 现金不足1个月
      risk += 0.04; // +4%风险
    } else if (cashRatio < 3) { // 现金不足3个月
      risk += 0.02; // +2%风险
    } else if (cashRatio > 12) { // 现金充足
      risk -= 0.01; // -1%风险
    }
    
    // 债务风险
    const totalDebt = loans.reduce((sum, loan) => sum + loan.amount, 0);
    const annualIncome = professionData.salary * 52; // 周薪转年薪
    const debtRatio = totalDebt / annualIncome;
    
    if (debtRatio > 1.5) { // 债务超过1.5年收入
      risk += 0.03;
    } else if (debtRatio > 3) { // 债务过高
      risk += 0.05;
    }
    
    return risk;
  }
  
  /**
   * 行为模式风险组件
   */
  private getBehaviorRiskComponent(gameState: GameState): number {
    if (this.playerBehaviorHistory.length < 5) return 0;
    
    let risk = 0;
    const recentBehaviors = this.playerBehaviorHistory.slice(-10);
    
    // 高风险决策频率
    const highRiskCount = recentBehaviors.filter(b => b.riskLevel === 'high').length;
    risk += (highRiskCount / 10) * 0.02;
    
    // 连续失败惩罚
    const failures = this.getConsecutivePoorDecisions();
    if (failures > 2) {
      risk += 0.01 * (failures - 2);
    }
    
    return risk;
  }
  
  /**
   * 记录玩家行为
   */
  recordPlayerBehavior(behavior: PlayerBehavior): void {
    this.playerBehaviorHistory.push(behavior);
    
    // 保持历史记录在合理长度
    if (this.playerBehaviorHistory.length > 20) {
      this.playerBehaviorHistory.shift();
    }
  }
  
  /**
   * 更新市场条件
   */
  updateMarketConditions(conditions: Partial<MarketConditions>): void {
    this.marketConditions = {
      ...this.marketConditions,
      ...conditions
    };
  }
  
  /**
   * 设置保护期
   */
  setProtectionTurns(turns: number): void {
    this.protectionTurns = turns;
  }
  
  /**
   * 获取连续失败决策次数
   */
  private getConsecutivePoorDecisions(): number {
    let count = 0;
    for (let i = this.playerBehaviorHistory.length - 1; i >= 0; i--) {
      if (this.playerBehaviorHistory[i].type === 'poor_decision') {
        count++;
      } else {
        break;
      }
    }
    return count;
  }
  
  /**
   * 获取风险报告
   */
  getRiskReport(gameState: GameState): RiskReport {
    const risk = this.calculateUnemploymentRisk(gameState);
    
    return {
      currentRisk: risk,
      marketCondition: this.marketConditions.cycle,
      financialHealth: this.getFinancialHealthScore(gameState),
      behaviorScore: this.getBehaviorScore(),
      protectionTurns: this.protectionTurns,
      recommendations: this.generateRecommendations(gameState, risk)
    };
  }
  
  private getFinancialHealthScore(gameState: GameState): 'poor' | 'fair' | 'good' | 'excellent' {
    const { cash, loans, professionData } = gameState;
    const monthlyExpenses = this.calculateMonthlyExpenses(gameState);
    const cashRatio = cash / monthlyExpenses;
    const debtRatio = loans.reduce((sum, loan) => sum + loan.amount, 0) / (professionData.salary * 52);
    
    if (cashRatio < 1 || debtRatio > 2) return 'poor';
    if (cashRatio < 3 || debtRatio > 1) return 'fair';
    if (cashRatio < 6 || debtRatio > 0.5) return 'good';
    return 'excellent';
  }
  
  private getBehaviorScore(): 'poor' | 'fair' | 'good' | 'excellent' {
    if (this.playerBehaviorHistory.length < 5) return 'fair';
    
    const recent = this.playerBehaviorHistory.slice(-10);
    const highRiskRatio = recent.filter(b => b.riskLevel === 'high').length / 10;
    const poorDecisionRatio = recent.filter(b => b.type === 'poor_decision').length / 10;
    
    if (highRiskRatio > 0.6 || poorDecisionRatio > 0.3) return 'poor';
    if (highRiskRatio > 0.3 || poorDecisionRatio > 0.1) return 'fair';
    if (highRiskRatio > 0.1) return 'good';
    return 'excellent';
  }
  
  private generateRecommendations(gameState: GameState, risk: number): string[] {
    const recommendations: string[] = [];
    
    if (risk > 0.1) {
      recommendations.push('💡 失业风险较高，建议增加现金储备');
    }
    
    const { cash, professionData, loans } = gameState;
    const monthlyExpenses = this.calculateMonthlyExpenses(gameState);
    
    if (cash < monthlyExpenses * 3) {
      recommendations.push('💰 建议储备至少3个月的生活费');
    }
    
    const debtRatio = loans.reduce((sum, loan) => sum + loan.amount, 0) / (professionData.salary * 52);
    if (debtRatio > 1) {
      recommendations.push('🏦 考虑减少高利息债务');
    }
    
    if (this.marketConditions.cycle === 'recession') {
      recommendations.push('📉 经济衰退期，保守投资策略更安全');
    }
    
    return recommendations;
  }
  
  private calculateMonthlyExpenses(gameState: GameState): number {
    const { professionData, loans, children } = gameState;
    return professionData.tax + 
           professionData.mortgage + 
           professionData.studentLoan + 
           professionData.otherExpenses +
           (children * professionData.childExpense) +
           loans.reduce((sum, loan) => sum + loan.weeklyInterest * 4, 0);
  }
}

// 类型定义
interface PlayerBehavior {
  type: 'high_risk_investment' | 'poor_decision' | 'market_adaptation' | 'conservative_move';
  riskLevel: 'low' | 'medium' | 'high';
  timestamp: number;
  description?: string;
}

interface MarketConditions {
  cycle: 'boom' | 'stable' | 'recession';
  unemploymentRate: number;
  economicStability: number;
}

interface RiskReport {
  currentRisk: number;
  marketCondition: string;
  financialHealth: 'poor' | 'fair' | 'good' | 'excellent';
  behaviorScore: 'poor' | 'fair' | 'good' | 'excellent';
  protectionTurns: number;
  recommendations: string[];
}