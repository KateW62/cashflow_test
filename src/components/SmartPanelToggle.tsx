import React, { useState } from 'react';
import { Brain, X } from 'lucide-react';
import { SmartDashboard } from './SmartDashboard';
import { CompactMarketIndicator } from './MarketTrendWidget';
import { GameState } from '../logic/gameTypes';
import { SmartUnemploymentSystem } from '../logic/SmartUnemploymentSystem';
import { SmartMarketSystem } from '../logic/SmartMarketSystem';


interface SmartPanelToggleProps {
  gameState: GameState;
}

/**
 * 智能面板切换按钮
 * 浮动在右下角的按钮，点击展开/收起智能仪表盘
 */
export const SmartPanelToggle: React.FC<SmartPanelToggleProps> = ({ gameState }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      {/* 展开的智能面板 */}
      {isOpen && (
        <div className="fixed top-4 right-4 w-96 max-h-[calc(100vh-2rem)] bg-white rounded-lg shadow-2xl z-50 overflow-hidden">
          {/* 面板头部 */}
          <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <div className="flex items-center gap-2">
              <Brain size={20} />
              <h3 className="font-semibold">智能助手</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          {/* 面板内容 */}
          <div className="p-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
            <SmartDashboard gameState={gameState} />
            <div className="mt-4">
              <CompactMarketIndicator />
            </div>
          </div>
        </div>
      )}
      
      {/* 浮动切换按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg transition-all duration-300 z-40 ${
          isOpen 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
        }`}
        style={{
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
        }}
      >
        {isOpen ? <X size={24} /> : <Brain size={24} />}
      </button>
      
      {/* 按钮动画效果 */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          }
          50% {
            box-shadow: 0 4px 30px rgba(59, 130, 246, 0.4);
          }
        }
        
        button:not([aria-pressed="true"]):hover {
          animation: pulse 2s infinite;
        }
      `}</style>
    </>
  );
};

/**
 * 简化版的智能指示器（始终显示）
 */
export const SimpleSmartIndicator: React.FC<SmartPanelToggleProps> = ({ gameState }) => {
  const unemploymentSystem = new SmartUnemploymentSystem();
  const riskReport = unemploymentSystem.getRiskReport(gameState);
  const riskPercentage = Math.round(riskReport.currentRisk * 100);
  
  const marketSystem = new SmartMarketSystem();
  const marketReport = marketSystem.getMarketReport();
  
  return (
    <div className="fixed top-4 right-4 flex flex-col gap-2">
      {/* 风险指示器 */}
      <div className={`px-3 py-2 rounded-lg shadow-md text-xs font-medium ${
        riskPercentage < 3 ? 'bg-green-500 text-white' :
        riskPercentage < 6 ? 'bg-yellow-500 text-white' :
        'bg-red-500 text-white'
      }`}>
        🎯 {riskPercentage}%
      </div>
      
      {/* 市场指示器 */}
      {marketReport.trendName && (
        <div className="px-3 py-2 bg-white rounded-lg shadow-md text-xs">
          <div className="flex items-center gap-1">
            <span>{marketReport.status === 'boom' ? '📈' : marketReport.status === 'recession' ? '📉' : '🔄'}</span>
            <span className="text-gray-700">{marketReport.remainingTurns}</span>
          </div>
        </div>
      )}
    </div>
  );
};