import React from 'react';
import { SmartUnemploymentSystem } from '../logic/SmartUnemploymentSystem';
import { SmartMarketSystem } from '../logic/SmartMarketSystem';
import { GameState } from '../logic/gameTypes';
import { StatusBadges, GameProgressIndicator, FinancialHealthQuickView } from './StatusIndicators';

interface SmartDashboardProps {
  gameState: GameState;
}

/**
 * 智能仪表盘组件
 * 显示失业风险、市场趋势和财务健康状态
 */
export const SmartDashboard: React.FC<SmartDashboardProps> = ({ gameState }) => {
  // 获取智能系统数据
  const unemploymentSystem = new SmartUnemploymentSystem();
  const marketSystem = new SmartMarketSystem();
  
  const riskReport = unemploymentSystem.getRiskReport(gameState);
  const marketReport = marketSystem.getMarketReport();
  
  // 计算财务健康分数
  const financialHealthScore = calculateFinancialHealth(gameState);
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">🤖</span>
        智能助手
      </h3>
      
      {/* 状态徽章 - 快速概览 */}
      <div className="mb-4">
        <StatusBadges gameState={gameState} />
      </div>
      
      {/* 游戏进度 */}
      <div className="mb-4">
        <GameProgressIndicator gameState={gameState} />
      </div>
      
      {/* 失业风险仪表盘 */}
      <div className="mb-4">
        <UnemploymentRiskGauge risk={riskReport.currentRisk} />
      </div>
      
      {/* 市场趋势 */}
      <div className="mb-4">
        <MarketTrendIndicator report={marketReport} />
      </div>
      
      {/* 财务健康快速视图 */}
      <div className="mb-4">
        <FinancialHealthQuickView gameState={gameState} />
      </div>
      
      {/* 智能建议 */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">💡 智能建议</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          {riskReport.recommendations.map((rec, index) => (
            <li key={index}>• {rec}</li>
          ))}
          {marketReport.recommendations.slice(0, 2).map((rec, index) => (
            <li key={`market-${index}`}>• {rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

/**
 * 失业风险仪表盘
 */
const UnemploymentRiskGauge: React.FC<{ risk: number }> = ({ risk }) => {
  const percentage = Math.round(risk * 100);
  const riskLevel = getRiskLevel(risk);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="text-center">
      <div className="relative inline-block">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          {/* 背景圆环 */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          {/* 进度圆环 */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={getRiskColor(risk)}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">{percentage}%</span>
          <span className="text-xs text-gray-600">{riskLevel}</span>
        </div>
      </div>
      <div className="mt-2">
        <span className="text-sm font-medium text-gray-700">失业风险</span>
      </div>
    </div>
  );
};

/**
 * 市场趋势指示器
 */
const MarketTrendIndicator: React.FC<{ report: any }> = ({ report }) => {
  const { status, trendName, remainingTurns, recommendations } = report;
  const trendIcon = getTrendIcon(status);
  const trendColor = getTrendColor(status);
  
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <span className="text-2xl mr-2">{trendIcon}</span>
          <div>
            <h4 className="text-sm font-semibold text-gray-800">
              {trendName || '市场稳定'}
            </h4>
            <p className="text-xs text-gray-600">
              {status === 'boom' ? '繁荣期' : 
               status === 'recession' ? '衰退期' : '稳定期'}
            </p>
          </div>
        </div>
        {trendName && (
          <div className="text-right">
            <span className="text-xs text-gray-500">剩余</span>
            <div className="text-sm font-bold text-gray-700">{remainingTurns}轮</div>
          </div>
        )}
      </div>
      
      {recommendations.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-600">
            💡 {recommendations[0]}
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * 财务健康卡片
 */
const FinancialHealthCard: React.FC<{ score: number; gameState: GameState }> = ({ 
  score, 
  gameState 
}) => {
  const healthLevel = getHealthLevel(score);
  const monthlyCashFlow = calculateMonthlyCashFlow(gameState);
  const debtRatio = calculateDebtRatio(gameState);
  
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <span className="text-2xl mr-2">{getHealthIcon(score)}</span>
          <div>
            <h4 className="text-sm font-semibold text-gray-800">财务健康</h4>
            <p className="text-xs text-gray-600">{healthLevel}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-800">{score}/100</div>
          <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className="h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${score}%`,
                backgroundColor: getHealthColor(score)
              }}
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white rounded p-2">
          <div className="text-gray-500">月现金流</div>
          <div className={`font-bold ${monthlyCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${monthlyCashFlow.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded p-2">
          <div className="text-gray-500">负债率</div>
          <div className={`font-bold ${debtRatio < 0.5 ? 'text-green-600' : debtRatio < 1 ? 'text-yellow-600' : 'text-red-600'}`}>
            {(debtRatio * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
};

// 辅助函数

function getRiskLevel(risk: number): string {
  if (risk < 0.02) return '很安全';
  if (risk < 0.05) return '安全';
  if (risk < 0.08) return '注意';
  if (risk < 0.12) return '警告';
  return '危险';
}

function getRiskColor(risk: number): string {
  if (risk < 0.02) return '#10b981'; // green-500
  if (risk < 0.05) return '#22c55e'; // green-400
  if (risk < 0.08) return '#f59e0b'; // amber-500
  if (risk < 0.12) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

function getTrendIcon(status: string): string {
  switch (status) {
    case 'boom': return '📈';
    case 'recession': return '📉';
    case 'stable': return '🔄';
    default: return '💹';
  }
}

function getTrendColor(status: string): string {
  switch (status) {
    case 'boom': return 'text-green-600';
    case 'recession': return 'text-red-600';
    case 'stable': return 'text-blue-600';
    default: return 'text-gray-600';
  }
}

function getHealthIcon(score: number): string {
  if (score >= 80) return '💚';
  if (score >= 60) return '💛';
  if (score >= 40) return '🧡';
  return '❤️';
}

function getHealthColor(score: number): string {
  if (score >= 80) return '#10b981'; // green-500
  if (score >= 60) return '#22c55e'; // green-400
  if (score >= 40) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

function getHealthLevel(score: number): string {
  if (score >= 80) return '优秀';
  if (score >= 60) return '良好';
  if (score >= 40) return '一般';
  return '需改善';
}

function calculateFinancialHealth(gameState: GameState): number {
  let score = 50; // 基础分
  
  // 现金储备评分 (0-30分)
  const monthlyExpenses = gameState.professionData.tax + 
                         gameState.professionData.mortgage + 
                         gameState.professionData.studentLoan + 
                         gameState.professionData.otherExpenses +
                         (gameState.children * gameState.professionData.childExpense);
  const cashRatio = gameState.cash / monthlyExpenses;
  score += Math.min(cashRatio * 5, 30); // 最多6个月满分
  
  // 债务比率评分 (0-20分)
  const totalDebt = gameState.loans.reduce((sum, loan) => sum + loan.amount, 0);
  const annualIncome = gameState.professionData.salary * 52;
  const debtRatio = totalDebt / annualIncome;
  score += Math.max(0, 20 - (debtRatio * 20)); // 债务越低分越高
  
  // 资产多样性评分 (0-20分)
  const assetCategories = new Set(gameState.assets.map(a => a.category)).size;
  score += Math.min(assetCategories * 5, 20);
  
  // 现金流评分 (0-20分)
  const monthlyCashFlow = calculateMonthlyCashFlow(gameState);
  if (monthlyCashFlow > 0) {
    score += Math.min(monthlyCashFlow / 1000, 20);
  }
  
  return Math.min(Math.round(score), 100);
}

function calculateMonthlyCashFlow(gameState: GameState): number {
  // 计算月度现金流（简化版，4周为一个月）
  const passiveIncome = gameState.assets.reduce((sum, asset) => sum + asset.weeklyIncome, 0) * 4;
  const loanInterest = gameState.loans.reduce((sum, loan) => sum + loan.weeklyInterest, 0) * 4;
  const baseCashFlow = gameState.professionData.salary - 
                      (gameState.professionData.tax + gameState.professionData.mortgage + 
                       gameState.professionData.studentLoan + gameState.professionData.otherExpenses);
  
  return baseCashFlow + passiveIncome - loanInterest;
}

function calculateDebtRatio(gameState: GameState): number {
  const totalDebt = gameState.loans.reduce((sum, loan) => sum + loan.amount, 0);
  const annualIncome = gameState.professionData.salary * 52;
  return totalDebt / annualIncome;
}