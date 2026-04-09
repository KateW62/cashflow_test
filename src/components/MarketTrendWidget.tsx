import React, { useState, useEffect } from 'react';
import { SmartMarketSystem, MarketTrend } from '../logic/SmartMarketSystem';

interface MarketTrendWidgetProps {
  className?: string;
}

/**
 * 市场趋势小组件
 * 可以放在游戏界面的显著位置
 */
export const MarketTrendWidget: React.FC<MarketTrendWidgetProps> = ({ className }) => {
  const [currentTrend, setCurrentTrend] = useState<MarketTrend | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
    // 获取当前市场趋势
    const marketSystem = new SmartMarketSystem();
    setCurrentTrend(marketSystem.getCurrentTrend());
    
    // 监听市场变化（可以通过事件或定时器）
    const interval = setInterval(() => {
      const marketSystem = new SmartMarketSystem();
      const trend = marketSystem.getCurrentTrend();
      setCurrentTrend(trend);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (!currentTrend) {
    return (
      <div className={`bg-gray-100 rounded-lg p-3 ${className || ''}`}>
        <div className="flex items-center">
          <span className="text-xl mr-2">💹</span>
          <div>
            <div className="text-sm font-medium text-gray-700">市场稳定</div>
            <div className="text-xs text-gray-500">等待新趋势</div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className || ''}`}>
      {/* 主要显示区域 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <span className="text-2xl mr-3">{getTrendIcon(currentTrend.cycle)}</span>
          <div>
            <h4 className="text-sm font-semibold text-gray-800">{currentTrend.name}</h4>
            <p className="text-xs text-gray-600">{getTrendPhase(currentTrend.cycle)}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-800">+{Math.round((currentTrend.multiplier - 1) * 100)}%</div>
          <div className="text-xs text-gray-500">影响系数</div>
        </div>
      </div>
      
      {/* 进度条显示剩余时间 */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>趋势持续时间</span>
          <span>{currentTrend.duration} 轮</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(currentTrend.cycle)}`}
            style={{ width: `${100}%` }} // 可以计算实际剩余百分比
          />
        </div>
      </div>
      
      {/* 影响类别 */}
      <div className="mb-3">
        <div className="text-xs text-gray-600 mb-1">影响类别：</div>
        <div className="flex flex-wrap gap-1">
          {currentTrend.affectedCategories.map((category, index) => (
            <span 
              key={index}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
            >
              {getCategoryName(category)}
            </span>
          ))}
        </div>
      </div>
      
      {/* 展开/收起详情 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-xs text-blue-600 hover:text-blue-800 transition-colors"
      >
        {isExpanded ? '收起详情 ↑' : '查看详情 ↓'}
      </button>
      
      {/* 展开的详细信息 */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-700 mb-2">{currentTrend.description}</p>
          
          <div className="bg-blue-50 rounded-lg p-3">
            <h5 className="text-xs font-semibold text-blue-800 mb-2">💡 投资建议</h5>
            <ul className="text-xs text-blue-700 space-y-1">
              {getInvestmentAdvice(currentTrend.cycle).map((advice, index) => (
                <li key={index}>• {advice}</li>
              ))}
            </ul>
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            <p>📊 波动性: {currentTrend.volatility}</p>
            <p>📈 增长率: +{(currentTrend.growthRate * 100).toFixed(1)}%</p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 简化的市场趋势指示器（用于紧凑显示）
 */
export const CompactMarketIndicator: React.FC = () => {
  const [trend, setTrend] = useState<any>(null);
  
  useEffect(() => {
    const marketSystem = new SmartMarketSystem();
    const report = marketSystem.getMarketReport();
    setTrend(report);
    
    const interval = setInterval(() => {
      const marketSystem = new SmartMarketSystem();
      const newReport = marketSystem.getMarketReport();
      setTrend(newReport);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (!trend || !trend.trendName) {
    return (
      <div className="flex items-center px-3 py-2 bg-gray-100 rounded-lg">
        <span className="mr-2">💹</span>
        <span className="text-sm text-gray-600">市场稳定</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center px-3 py-2 bg-white rounded-lg shadow-sm border">
      <span className="mr-2 text-lg">{getTrendIcon(trend.status)}</span>
      <div>
        <div className="text-sm font-medium text-gray-800">{trend.trendName}</div>
        <div className="text-xs text-gray-500">{trend.remainingTurns}轮剩余</div>
      </div>
      <div className="ml-auto text-right">
        <div className="text-sm font-bold" style={{color: getTrendColorValue(trend.status)}}>
          {trend.status === 'boom' ? '+' : trend.status === 'recession' ? '-' : '±'}
          {Math.round(Math.abs((trend.multiplier - 1) * 100))}%
        </div>
      </div>
    </div>
  );
};

// 辅助函数

function getTrendIcon(cycle: string): string {
  switch (cycle) {
    case 'boom': return '🚀';
    case 'recession': return '📉';
    case 'stable': return '⚖️';
    default: return '📊';
  }
}

function getTrendPhase(cycle: string): string {
  switch (cycle) {
    case 'boom': return '上升期';
    case 'recession': return '下降期';
    case 'stable': return '平稳期';
    default: return '调整期';
  }
}

function getProgressColor(cycle: string): string {
  switch (cycle) {
    case 'boom': return 'bg-green-500';
    case 'recession': return 'bg-red-500';
    case 'stable': return 'bg-blue-500';
    default: return 'bg-gray-500';
  }
}

function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    'Stock': '股票',
    'RealEstate': '房地产',
    'Business': '企业',
    'Technology': '科技',
    'Commodity': '商品'
  };
  return names[category] || category;
}

function getInvestmentAdvice(cycle: string): string[] {
  switch (cycle) {
    case 'boom':
      return [
        '考虑获利了结部分投资',
        '避免追高，保持理性',
        '关注泡沫风险',
        '多元化配置资产'
      ];
    case 'recession':
      return [
        '保持现金储备',
        '寻找被低估的优质资产',
        '避免恐慌性抛售',
        '考虑长期投资价值'
      ];
    case 'stable':
      return [
        '按计划进行投资',
        '关注长期价值',
        '保持投资组合平衡',
        '定期评估投资效果'
      ];
    default:
      return ['密切关注市场变化', '保持灵活的投资策略'];
  }
}

function getTrendColorValue(status: string): string {
  switch (status) {
    case 'boom': return '#10b981'; // green-500
    case 'recession': return '#ef4444'; // red-500
    case 'stable': return '#3b82f6'; // blue-500
    default: return '#6b7280'; // gray-500
  }
}