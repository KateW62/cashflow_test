import { useEffect, useState } from 'react';
import { GameState, Financials, Asset, SmallDealCard, BigDealCard, DoodadCard, MarketEvent } from '../logic/gameLogic';
import { X, DollarSign, TrendingUp, AlertCircle, ShoppingCart, TrendingDown } from 'lucide-react';
import NeonButton from './NeonButton';
import '../styles/electric-velocity.css';

interface InvestmentModalProps {
  gameState: GameState;
  financials: Financials;
  onBuy: () => void;
  onDecline: () => void;
  onPay: () => void;
  onDownsized: () => void;
  onCharity: (donated: boolean) => void;
  onBaby: () => void;
  onDream: (purchased: boolean) => void;
  onMarket: () => void;
  onSellAsset: (assetId: string, salePrice: number) => void;
  onMarketBuyStock: (assetId: string) => void;
  onMarketSellStock: (assetId: string) => void;
  
  stockBuyQty: string;
  setStockBuyQty: (qty: string) => void;
  stockBuyTotal: number;
  stockBuyInvalid: boolean;
  stockMaxBuyable: number;
  marketStockBuyAmounts: Record<string, string>;
  setMarketStockBuyAmounts: (amounts: Record<string, string>) => void;
  marketStockSellAmounts: Record<string, string>;
  setMarketStockSellAmounts: (amounts: Record<string, string>) => void;
  stockAssets: Asset[];
  onTakeOpportunityLoan: () => void;
  showOpportunityLoanDialog: boolean;
  setShowOpportunityLoanDialog: (show: boolean) => void;
  opportunityLoanAmount: string;
  setOpportunityLoanAmount: (amount: string) => void;
}

export default function InvestmentModal({
  gameState,
  financials,
  onBuy,
  onDecline,
  onPay,
  onDownsized,
  onCharity,
  onBaby,
  onDream,
  onMarket,
  onSellAsset,
  onMarketBuyStock,
  onMarketSellStock,
  
  stockBuyQty,
  setStockBuyQty,
  stockBuyTotal,
  stockBuyInvalid,
  stockMaxBuyable,
  marketStockBuyAmounts,
  setMarketStockBuyAmounts,
  marketStockSellAmounts,
  setMarketStockSellAmounts,
  stockAssets,
  onTakeOpportunityLoan,
  showOpportunityLoanDialog,
  setShowOpportunityLoanDialog,
  opportunityLoanAmount,
  setOpportunityLoanAmount,
}: InvestmentModalProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleAction = async (action: () => void) => {
    setProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    action();
    setProcessing(false);
  };

  const renderOpportunityCard = () => {
    const card = gameState.currentEvent as SmallDealCard | BigDealCard;
    const isStockCard = card.type === 'SmallDeal' && (card.tags || []).some(t => t.toLowerCase() === 'stock');
    
    return (
      <div className="ev-modal-container max-w-2xl w-full mx-4">
        <div className="ev-modal-content p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="ev-section-title text-xl md:text-2xl flex items-center gap-2">
                <TrendingUp size={24} className="text-emerald-400" />
                投资机会
              </h2>
              <span className="ev-badge mt-2">{card.type === 'SmallDeal' ? '小生意' : '大生意'}</span>
            </div>
            <button 
              onClick={onDecline}
              className="ev-text-secondary hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="ev-card p-4 md:p-6 mb-4">
            <h3 className="text-lg font-semibold mb-2">{card.name}</h3>
            <p className="ev-text-secondary mb-4">{card.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="ev-card p-3">
                <span className="ev-text-secondary text-sm block mb-1">总成本</span>
                <span className="text-xl font-bold text-rose-400">
                  ${card.totalCost.toLocaleString()}
                </span>
              </div>
              <div className="ev-card p-3">
                <span className="ev-text-secondary text-sm block mb-1">需支付首付</span>
                <span className="text-xl font-bold text-emerald-400">
                  ${card.downPayment.toLocaleString()}
                </span>
              </div>
            </div>

            {card.type === 'SmallDeal' && card.stockData && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-400/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-emerald-400 font-semibold">📈 股票信息</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="ev-text-secondary">股价</span>
                    <span className="text-emerald-400 ml-2 font-semibold">
                      ${card.stockData.sharePrice}
                    </span>
                  </div>
                  <div>
                    <span className="ev-text-secondary">价格区间</span>
                    <span className="text-purple-300 ml-2">
                      ${card.stockData.priceRange.min}-${card.stockData.priceRange.max}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="ev-card p-3">
              <span className="ev-text-secondary text-sm block mb-1">被动收入/月</span>
              <span className="text-lg font-bold text-emerald-400">
                +${card.cashFlow.toLocaleString()}
              </span>
            </div>
          </div>

          {isStockCard && (
            <div className="mb-4 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg">
              <label className="ev-text-secondary block mb-2">购买股数 (最多 {stockMaxBuyable.toLocaleString()} 股)</label>
              <input
                type="number"
                min="1"
                max={stockMaxBuyable}
                value={stockBuyQty}
                onChange={(e) => setStockBuyQty(e.target.value)}
                placeholder="输入股数"
                className="w-full p-3 bg-slate-800/50 border border-purple-400/30 rounded-lg text-white focus:border-emerald-400 focus:outline-none mb-2"
              />
              {stockBuyQty && (
                <div className="text-sm">
                  <span className="ev-text-secondary">总计: </span>
                  <span className={stockBuyInvalid ? 'text-rose-400' : 'text-emerald-400'}>
                    ${stockBuyTotal.toLocaleString()}
                  </span>
                  {stockBuyInvalid && (
                    <div className="text-rose-400 text-xs mt-1">现金不足</div>
                  )}
                </div>
              )}
            </div>
          )}

          {gameState.cash < card.downPayment && !showOpportunityLoanDialog && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-400/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-rose-400" />
                <span className="text-rose-400 font-semibold text-sm">现金不足</span>
              </div>
              <NeonButton
                onClick={() => setShowOpportunityLoanDialog(true)}
                variant="danger"
                size="small"
                className="w-full"
              >
                申请贷款购买
              </NeonButton>
            </div>
          )}

          {showOpportunityLoanDialog && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-400/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-amber-400" />
                <span className="text-amber-400 font-semibold text-sm">贷款购买</span>
              </div>
              <input
                type="number"
                value={opportunityLoanAmount}
                onChange={(e) => setOpportunityLoanAmount(e.target.value)}
                placeholder="贷款金额 (1000的倍数)"
                className="w-full p-2 bg-slate-800/50 border border-amber-400/30 rounded-lg text-white focus:border-amber-400 focus:outline-none mb-2"
              />
              <div className="flex gap-2">
                <NeonButton
                  onClick={onTakeOpportunityLoan}
                  disabled={!opportunityLoanAmount || parseInt(opportunityLoanAmount) % 1000 !== 0}
                  size="small"
                  className="flex-1"
                >
                  确认贷款
                </NeonButton>
                <button
                  onClick={() => setShowOpportunityLoanDialog(false)}
                  className="ev-button-secondary px-3 py-2 rounded-lg text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-3">
            <NeonButton
              onClick={() => handleAction(onBuy)}
              disabled={stockBuyInvalid || processing}
              className="flex-1"
              variant="success"
            >
              {processing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-emerald-400 rounded-full animate-spin" />
                  处理中...
                </div>
              ) : (
                <>
                  <ShoppingCart size={18} />
                  确认购买
                </>
              )}
            </NeonButton>
            <NeonButton
              onClick={onDecline}
              disabled={processing}
              className="flex-1"
              variant="secondary"
            >
              放弃机会
            </NeonButton>
          </div>
        </div>
      </div>
    );
  };

  const renderDoodadCard = () => {
    const card = gameState.currentEvent as DoodadCard;
    
    return (
      <div className="ev-modal-container max-w-md w-full mx-4">
        <div className="ev-modal-content p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="ev-section-title text-xl flex items-center gap-2">
              <TrendingDown size={24} className="text-rose-400" />
              额外支出
            </h2>
            <button 
              onClick={onPay}
              className="ev-text-secondary hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="ev-card p-4 mb-4">
            <h3 className="text-lg font-semibold mb-2">{card.name}</h3>
            <p className="ev-text-secondary mb-4">{card.description}</p>
            
            <div className="flex justify-between items-center p-3 bg-rose-500/10 border border-rose-400/30 rounded-lg">
              <span className="ev-text-secondary">需支付金额</span>
              <span className="text-2xl font-bold text-rose-400">
                ${card.cost.toLocaleString()}
              </span>
            </div>
          </div>

          <NeonButton
            onClick={() => handleAction(onPay)}
            disabled={processing}
            className="w-full"
          >
            {processing ? (
              <div className="flex items-center gap-2 justify-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-rose-400 rounded-full animate-spin" />
                处理中...
              </div>
            ) : (
              <>
                <DollarSign size={18} />
                确认支付
              </>
            )}
          </NeonButton>
        </div>
      </div>
    );
  };

  const renderMarketEvent = () => {
    const event = gameState.currentEvent as MarketEvent;
    const affectedAssets = gameState.assets.filter(asset => 
      event.affectedAssetTypes.includes(asset.type)
    );

    return (
      <div className="ev-modal-container max-w-3xl w-full mx-4">
        <div className="ev-modal-content p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="ev-section-title text-xl flex items-center gap-2">
              <TrendingUp size={24} className="text-amber-400" />
              市场风云
            </h2>
            <button 
              onClick={onMarket}
              className="ev-text-secondary hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="ev-card p-4 mb-4">
            <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
            <p className="ev-text-secondary mb-4">{event.description}</p>
            
            {event.affectedAssetTypes.length > 0 && (
              <div className="mb-4">
                <span className="ev-text-secondary text-sm block mb-2">影响资产类型</span>
                <div className="flex flex-wrap gap-2">
                  {event.affectedAssetTypes.map(type => (
                    <span key={type} className="ev-badge">
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {affectedAssets.length > 0 && (
              <div className="mb-4">
                <span className="ev-text-secondary text-sm block mb-2">你的受影响资产</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {affectedAssets.map(asset => (
                    <div key={asset.id} className="ev-card p-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold">{asset.name}</span>
                        {event.priceMultiplier !== 1 && (
                          <span className={`ev-badge ${event.priceMultiplier > 1 ? 'ev-badge-success' : 'ev-badge-danger'}`}>
                            ×{event.priceMultiplier.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {asset.stockData && (
                        <div className="mt-1">
                          <span className="ev-text-secondary text-xs">股价: ${asset.stockData.sharePrice}</span>
                          <span className="ev-text-secondary text-xs ml-2">股数: {asset.stockData.shares}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stock Trading for affected stocks */}
          {stockAssets.filter(asset => 
            event.affectedAssetTypes.includes('Stock') || 
            event.affectedAssetTypes.includes(asset.type)
          ).length > 0 && (
            <div className="mb-4 ev-card p-4">
              <h4 className="ev-section-title mb-3 text-sm">股票交易</h4>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {stockAssets.filter(asset => 
                  event.affectedAssetTypes.includes('Stock') || 
                  event.affectedAssetTypes.includes(asset.type)
                ).map(asset => (
                  <div key={asset.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center ev-card p-2">
                    <div>
                      <span className="text-sm font-semibold">{asset.name}</span>
                      <div className="ev-text-secondary text-xs">
                        股价: ${asset.stockData?.sharePrice} | 持有: {asset.stockData?.shares}股
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="买入"
                        value={marketStockBuyAmounts[asset.id] || ''}
                        onChange={(e) => setMarketStockBuyAmounts({
                          ...marketStockBuyAmounts,
                          [asset.id]: e.target.value
                        })}
                        className="w-20 p-1 bg-slate-800/50 border border-emerald-400/30 rounded text-white text-xs focus:border-emerald-400 focus:outline-none"
                      />
                      <NeonButton
                        onClick={() => onMarketBuyStock(asset.id)}
                        size="small"
                        variant="success"
                      >
                        买入
                      </NeonButton>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="卖出"
                        value={marketStockSellAmounts[asset.id] || ''}
                        onChange={(e) => setMarketStockSellAmounts({
                          ...marketStockSellAmounts,
                          [asset.id]: e.target.value
                        })}
                        className="w-20 p-1 bg-slate-800/50 border border-rose-400/30 rounded text-white text-xs focus:border-rose-400 focus:outline-none"
                      />
                      <NeonButton
                        onClick={() => onMarketSellStock(asset.id)}
                        size="small"
                        variant="danger"
                      >
                        卖出
                      </NeonButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <NeonButton
            onClick={() => handleAction(onMarket)}
            disabled={processing}
            className="w-full"
          >
            {processing ? (
              <div className="flex items-center gap-2 justify-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-amber-400 rounded-full animate-spin" />
                处理中...
              </div>
            ) : (
              <>确认市场变化</>
            )}
          </NeonButton>
        </div>
      </div>
    );
  };

  const renderSpecialEvent = () => {
    const specialEvent = gameState.currentSpecialEvent;

    if (specialEvent === 'downsized') {
      return (
        <div className="ev-modal-container max-w-md w-full mx-4">
          <div className="ev-modal-content p-6">
            <h2 className="ev-section-title text-xl text-center mb-4">裁员！</h2>
            <div className="ev-card p-4 mb-4">
              <p className="text-center mb-4">你被裁员了！停薪2个发薪日，但可以选择支付总金额10%用于慈善，获得连续3次2个骰子的机会。</p>
              <div className="flex justify-between items-center p-3 bg-slate-500/10 border border-slate-400/30 rounded-lg">
                <span>支付慈善款</span>
                <span className="text-amber-400 font-bold">${Math.floor(financials.salary * 0.1).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <NeonButton
                onClick={() => handleAction(() => onCharity(true))}
                className="flex-1"
                variant="success"
              >
                💰 支付慈善款
              </NeonButton>
              <NeonButton
                onClick={() => handleAction(() => onCharity(false))}
                className="flex-1"
                variant="secondary"
              >
                😢 不支付
              </NeonButton>
            </div>
          </div>
        </div>
      );
    }

    if (specialEvent === 'baby') {
      return (
        <div className="ev-modal-container max-w-md w-full mx-4">
          <div className="ev-modal-content p-6">
            <h2 className="ev-section-title text-xl text-center mb-4">👶 喜得贵子</h2>
            <div className="ev-card p-4 mb-4 text-center">
              <p className="mb-4">恭喜！你有宝宝了！</p>
              <p className="text-rose-400">每个孩子的费用: ${gameState.professionData.childExpense.toLocaleString()}/月</p>
            </div>
            <NeonButton
              onClick={() => handleAction(onBaby)}
              className="w-full"
            >
              确认
            </NeonButton>
          </div>
        </div>
      );
    }

    if (specialEvent === 'dream') {
      const dream = gameState.selectedDream;
      return (
        <div className="ev-modal-container max-w-md w-full mx-4">
          <div className="ev-modal-content p-6">
            <h2 className="ev-section-title text-xl text-center mb-4">
              ✨ 实现梦想
            </h2>
            <div className="ev-card p-4 mb-4 text-center">
              <h3 className="text-lg font-semibold mb-2">{dream.name}</h3>
              <p className="text-2xl font-bold text-emerald-400 mb-4">
                💰 ${dream.cost.toLocaleString()}
              </p>
              <p className="ev-text-secondary mb-2">你有足够的现金购买这个梦想吗？</p>
              <div className="flex justify-center gap-4">
                <div className="text-center">
                  <p className="ev-text-secondary text-sm">你的现金</p>
                  <p className={`font-bold ${gameState.cash >= dream.cost ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${gameState.cash.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="ev-text-secondary text-sm">梦想价格</p>
                  <p className="text-emerald-400 font-bold">
                    ${dream.cost.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <NeonButton
                onClick={() => handleAction(() => onDream(true))}
                disabled={gameState.cash < dream.cost}
                className="flex-1"
                variant="success"
              >
                ✨ 购买梦想
              </NeonButton>
              <NeonButton
                onClick={() => handleAction(() => onDream(false))}
                className="flex-1"
                variant="secondary"
              >
                稍后购买
              </NeonButton>
            </div>
            {gameState.cash < dream.cost && (
              <p className="text-rose-400 text-sm text-center mt-2">
                现金不足，无法购买
              </p>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // Render the appropriate modal based on event type
  if (gameState.currentEvent) {
    const card = gameState.currentEvent;
    
    switch (card.type) {
      case 'SmallDeal':
      case 'BigDeal':
        return renderOpportunityCard();
      case 'Doodad':
        return renderDoodadCard();
      case 'MarketEvent':
        return renderMarketEvent();
      default:
        return null;
    }
  }

  if (gameState.currentSpecialEvent) {
    return renderSpecialEvent();
  }

  return null;
}