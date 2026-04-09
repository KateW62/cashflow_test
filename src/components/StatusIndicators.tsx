import React from 'react';
import { GameState } from '../logic/gameTypes';
import { SmartUnemploymentSystem } from '../logic/SmartUnemploymentSystem';

/**
 * 简单的状态指示器组件
 * 可以快速显示关键游戏状态
 */

interface StatusBadgeProps {
  gameState: GameState;
}

export const StatusBadges: React.FC<StatusBadgeProps> = ({ gameState }) => {
  const unemploymentSystem = new SmartUnemploymentSystem();
  const riskReport = unemploymentSystem.getRiskReport(gameState);
  const riskPercentage = Math.round(riskReport.currentRisk * 100);
  
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {/* 失业风险徽章 */}
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
        riskPercentage < 3 ? 'bg-green-100 text-green-800' :
        riskPercentage < 6 ? 'bg-yellow-100 text-yellow-800' :
        'bg-red-100 text-red-800'
      }`}>
        🎯 失业风险 {riskPercentage}%
      </div>
      
      {/* 现金状态徽章 */}
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
        gameState.cash > 5000 ? 'bg-green-100 text-green-800' :
        gameState.cash > 1000 ? 'bg-yellow-100 text-yellow-800' :
        'bg-red-100 text-red-800'
      }`}>
        💰 现金 ${gameState.cash.toLocaleString()}
      </div>
      
      {/* 被动收入徽章 */}
      {gameState.assets.length > 0 && (
        <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          📈 资产 {gameState.assets.length}项
        </div>
      )}
      
      {/* 债务徽章 */}
      {gameState.loans.length > 0 && (
        <div className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          🏦 贷款 {gameState.loans.length}笔
        </div>
      )}
      
      {/* 特殊状态徽章 */}
      {gameState.status.isDownsized && (
        <div className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
          ⚠️ 失业中
        </div>
      )}
      
      {gameState.status.hasCharityBonus && (
        <div className="px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
          💝 慈善加成
        </div>
      )}
    </div>
  );
};

/**
 * 游戏进度指示器
 */
interface GameProgressIndicatorProps {
  gameState: GameState;
}

export const GameProgressIndicator: React.FC<GameProgressIndicatorProps> = ({ gameState }) => {
  const totalSteps = gameState.actionStep || 0;
  const position = gameState.currentPosition;
  const boardSize = gameState.gameBoard.length;
  const progress = (position / boardSize) * 100;
  
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">游戏进度</span>
        <span className="text-sm text-gray-500">{totalSteps} 步</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>起点</span>
        <span>位置: {position + 1}/{boardSize}</span>
        <span>终点</span>
      </div>
    </div>
  );
};

/**
 * 财务健康快速指标
 */
interface FinancialHealthQuickViewProps {
  gameState: GameState;
}

export const FinancialHealthQuickView: React.FC<FinancialHealthQuickViewProps> = ({ gameState }) => {
  // 计算关键指标
  const monthlyExpenses = gameState.professionData.tax + 
                         gameState.professionData.mortgage + 
                         gameState.professionData.studentLoan + 
                         gameState.professionData.otherExpenses +
                         (gameState.children * gameState.professionData.childExpense);
  
  const cashRatio = gameState.cash / monthlyExpenses;
  const totalDebt = gameState.loans.reduce((sum, loan) => sum + loan.amount, 0);
  const annualIncome = gameState.professionData.salary * 52;
  const debtRatio = totalDebt / annualIncome;
  const passiveIncome = gameState.assets.reduce((sum, asset) => sum + asset.weeklyIncome, 0) * 4;
  
  // 健康评分 (0-100)
  let healthScore = 50;
  if (cashRatio >= 6) healthScore += 20;
  else if (cashRatio >= 3) healthScore += 10;
  else if (cashRatio < 1) healthScore -= 15;
  
  if (debtRatio < 0.5) healthScore += 15;
  else if (debtRatio > 2) healthScore -= 20;
  
  if (passiveIncome > monthlyExpenses * 0.3) healthScore += 15;
  
  healthScore = Math.max(0, Math.min(100, healthScore));
  
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold text-gray-700">财务健康</h4>
        <span className={`text-lg font-bold ${getHealthColor(healthScore)}`}>
          {healthScore}/100
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-white rounded p-2">
          <div className="text-gray-500">现金储备</div>
          <div className={`font-bold ${cashRatio >= 3 ? 'text-green-600' : 'text-red-600'}`}>
            {cashRatio.toFixed(1)}个月
          </div>
        </div>
        
        <div className="bg-white rounded p-2">
          <div className="text-gray-500">负债率</div>
          <div className={`font-bold ${debtRatio < 1 ? 'text-green-600' : 'text-red-600'}`}>
            {(debtRatio * 100).toFixed(1)}%
          </div>
        </div>
        
        <div className="bg-white rounded p-2">
          <div className="text-gray-500">被动收入</div>
          <div className={`font-bold ${passiveIncome > 0 ? 'text-green-600' : 'text-gray-400'}`}>
            ${passiveIncome.toLocaleString()}/月
          </div>
        </div>
        
        <div className="bg-white rounded p-2">
          <div className="text-gray-500">净资产</div>
          <div className="font-bold text-blue-600">
            ${(gameState.cash + gameState.assets.reduce((sum, a) => sum + a.cost, 0) - totalDebt).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};