import { useState, useEffect, useMemo, useRef } from 'react';
import {
  initialState,
  calculateFinancials,
  rollDice,
  getSpaceColor,
  getSpaceLabel,
  buyOpportunity,
  declineOpportunity,
  payDoodad,
  handleDownsized,
  handleCharity,
  handleBaby,
  handleDream,
  takeLoan,
  canTakeLoan,
  repayLoan,
  canEscapeRatRace,
  escapeToFastTrack,
  handleBankruptcy,
  handleMarketEvent,
  sellAsset,
  getAffectedAssets,
  calculateSalePrice,
  getMarketPrice,
  buyStockShares,
  sellStockShares,
  canBuyOpportunity,
  MAX_LOAN_MULTIPLIER,
  GameBoardSpace,
} from './logic/gameLogic';
import { GameState, Asset, SmallDealCard, BigDealCard, DoodadCard, MarketEvent } from './logic/gameTypes';
import { professions } from './config/professions';
import { dreams } from './config/dreams';
import {
  Building2,
  Dice6,
  X,
  AlertCircle,
  Users,
  LogIn,
  Heart,
  Baby as BabyIcon,
  Briefcase,
  DollarSign,
  TrendingUp,
  Star,
  TrendingDown,
  ShoppingCart,
  BarChart2,
  ScrollText,
  ChevronDown,
  ChevronUp,
  Home,
  User,
  BookOpen,
  Trophy,
} from 'lucide-react';
import CircularBoard from './components/CircularBoard';
import CashFlowDonut from './components/CashFlowDonut';
import MarketTrendChart from './components/MarketTrendChart';
import InvestmentModal from './components/InvestmentModal';
import NeonButton from './components/NeonButton';
import { ThreeDDice } from './components/ThreeDDice';
import './styles/electric-velocity.css';

function AppDesktop() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showSetupDialog, setShowSetupDialog] = useState(true);
  const [selectedProfession, setSelectedProfession] = useState<string>('');
  const [selectedDream, setSelectedDream] = useState<string>('');
  const [loanAmount, setLoanAmount] = useState<string>('');
  const [showLoanDialog, setShowLoanDialog] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showOpportunityLoanDialog, setShowOpportunityLoanDialog] = useState(false);
  const [opportunityLoanAmount, setOpportunityLoanAmount] = useState<string>('');
  
  // Dice animation states
  const [isRolling, setIsRolling] = useState(false);
  const [diceValues, setDiceValues] = useState<number[]>([]);
  const [rollResult, setRollResult] = useState<number>(0);
  const [showDiceModal, setShowDiceModal] = useState(false);
  
  // Financial drawer
  const [showFinancialDrawer, setShowFinancialDrawer] = useState(false);
  const [showAssetsPanel, setShowAssetsPanel] = useState(false);
  const [showLoansPanel, setShowLoansPanel] = useState(false);
  
  // Stock trading state
  const [stockBuyQty, setStockBuyQty] = useState<string>('');
  const [marketStockBuyAmounts, setMarketStockBuyAmounts] = useState<Record<string, string>>({});
  const [marketStockSellAmounts, setMarketStockSellAmounts] = useState<Record<string, string>>({});

  // Complex animation state
  const [playerPosition, setPlayerPosition] = useState(0);
  const [isAnimatingMove, setIsAnimatingMove] = useState(false);

  const startGame = () => {
    if (!selectedProfession || !selectedDream) return;

    try {
      const profession = professions[selectedProfession];
      const dream = dreams.find(d => d.id === selectedDream);

      if (!profession) {
        setInitError(`职业 "${selectedProfession}" 未找到`);
        return;
      }

      if (!dream) {
        setInitError(`梦想 "${selectedDream}" 未找到`);
        return;
      }

      const newState = initialState(profession, dream);
      setGameState(newState);
      setPlayerPosition(newState.currentPosition);
      setShowSetupDialog(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setInitError(`初始化失败: ${errorMsg}`);
    }
  };

  const financials = gameState ? calculateFinancials(gameState) : null;
  const canRollDice = gameState ? 
    gameState.canRoll && 
    !isRolling && 
    !isAnimatingMove && 
    (gameState.currentEvent === null || gameState.currentEvent === undefined) : false;
  const canEscape = gameState ? canEscapeRatRace(gameState) : false;

  // Animate dice rolling
  const onRollDice = async (diceCount: number = 1) => {
    if (!gameState || !canRollDice) return;
    
    setIsRolling(true);
    setShowDiceModal(true);
    setDiceValues([]);
    setRollResult(0);
    
    // Animation phase 1: Rolling animation
    const rollAnimation = setInterval(() => {
      const values = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1);
      setDiceValues(values);
    }, 100);
    
    // After 1.2s, stop animation and calculate result
    setTimeout(() => {
      clearInterval(rollAnimation);
      const finalValues = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1);
      const total = finalValues.reduce((sum, val) => sum + val, 0);
      
      setDiceValues(finalValues);
      setRollResult(total);
      
      // Hide dice modal after showing result
      setTimeout(() => {
        setShowDiceModal(false);
        setIsRolling(false);
        
        // Process game move
        let newState = rollDice(gameState, diceCount, total);
        newState = handleBankruptcy(newState);
        
        // Animate player movement
        animatePlayerMovement(newState.currentPosition, newState);
        
      }, 1500);
    }, 1200);
  };

  const animatePlayerMovement = (targetPosition: number, newState: GameState) => {
    setIsAnimatingMove(true);
    const startPos = playerPosition;
    const totalSpaces = newState.gameBoard.length;
    const distance = (targetPosition - startPos + totalSpaces) % totalSpaces;
    
    let currentStep = 0;
    const animateStep = () => {
      if (currentStep <= distance) {
        const newPos = (startPos + currentStep) % totalSpaces;
        setPlayerPosition(newPos);
        currentStep++;
        setTimeout(animateStep, 150); // 150ms per step
      } else {
        setIsAnimatingMove(false);
        setGameState(newState);
        // Reset dice values for next roll
        setTimeout(() => {
          setDiceValues([]);
          setRollResult(0);
        }, 1000);
      }
    };
    
    animateStep();
  };

  const onEscapeRatRace = () => {
    if (!gameState) return;
    const newState = escapeToFastTrack(gameState);
    setGameState(newState);
    setPlayerPosition(newState.currentPosition);
  };

  const onBuyOpportunity = () => {
    if (!gameState || !gameState.currentEvent) return;
    
    try {
      if (!canBuyOpportunity(gameState)) return;
      const card = gameState.currentEvent as SmallDealCard | BigDealCard;
      const isStockCard = (card.tags || []).some(t => t.toLowerCase() === 'stock');

      if (isStockCard) {
        const qty = parseInt(stockBuyQty) || 0;
        if (qty <= 0) return;
        const stockData = (card as SmallDealCard).stockData;
        const pricePerShare = stockData?.sharePrice ?? card.totalCost;
        const totalCost = qty * pricePerShare;
        if (gameState.cash < totalCost) return;

        const newState = buyOpportunity(gameState, { ...card, totalCost, downPayment: totalCost, stockData: { ...(stockData ?? { sharePrice: pricePerShare, priceRange: { min: 1, max: 100 } }), shares: qty } } as SmallDealCard);
        setGameState(newState);
      } else {
        const newState = buyOpportunity(gameState, card);
        setGameState(newState);
      }
    } catch (error) {
      console.error('Error in onBuyOpportunity:', error);
      alert('购买失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const onDeclineOpportunity = () => {
    if (!gameState) return;
    const newState = declineOpportunity(gameState);
    setGameState(newState);
    setStockBuyQty('');
  };

  const onPayDoodad = () => {
    if (!gameState || !gameState.currentEvent) return;
    const newState = payDoodad(gameState, gameState.currentEvent);
    setGameState(newState);
  };

  const onHandleDownsized = () => {
    if (!gameState) return;
    const newState = handleDownsized(gameState);
    setGameState(newState);
  };

  const onHandleCharity = (donated: boolean) => {
    if (!gameState) return;
    const newState = handleCharity(gameState, donated);
    setGameState(newState);
  };

  const onHandleBaby = () => {
    if (!gameState) return;
    const newState = handleBaby(gameState);
    setGameState(newState);
  };

  const onHandleDream = (purchased: boolean) => {
    if (!gameState) return;
    const newState = handleDream(gameState, purchased);
    setGameState(newState);
    if (purchased && newState.currentSpecialEvent === 'winner') {
      setShowRestartDialog(true);
    }
  };

  const onTakeLoan = () => {
    if (!gameState) return;
    const amount = parseInt(loanAmount);
    if (!isNaN(amount) && amount > 0 && amount % 1000 === 0) {
      const newState = takeLoan(gameState, amount);
      setGameState(newState);
      setShowLoanDialog(false);
      setLoanAmount('');
    }
  };

  const onTakeOpportunityLoan = () => {
    if (!gameState) return;
    const amount = parseInt(opportunityLoanAmount);
    if (!isNaN(amount) && amount > 0 && amount % 1000 === 0) {
      const newState = takeLoan(gameState, amount);
      setGameState(newState);
      setShowOpportunityLoanDialog(false);
      setOpportunityLoanAmount('');
    }
  };

  const onRepayLoan = (loanId: string) => {
    if (!gameState) return;
    const newState = repayLoan(gameState, loanId);
    setGameState(newState);
  };

  const onHandleMarketEvent = () => {
    if (!gameState) return;
    const newState = handleMarketEvent(gameState);
    setGameState(newState);
    setMarketStockBuyAmounts({});
    setMarketStockSellAmounts({});
  };

  const onSellAsset = (assetId: string, salePrice: number) => {
    if (!gameState) return;
    const newState = sellAsset(gameState, assetId, salePrice);
    setGameState(newState);
  };

  const onMarketBuyStock = (assetId: string) => {
    if (!gameState) return;
    const qty = parseInt(marketStockBuyAmounts[assetId] || '0');
    if (qty <= 0 || isNaN(qty)) return;
    const newState = buyStockShares(gameState, assetId, qty);
    setGameState(newState);
    setMarketStockBuyAmounts(prev => ({ ...prev, [assetId]: '' }));
  };

  const onMarketSellStock = (assetId: string) => {
    if (!gameState) return;
    const qty = parseInt(marketStockSellAmounts[assetId] || '0');
    if (qty <= 0 || isNaN(qty)) return;
    const newState = sellStockShares(gameState, assetId, qty);
    setGameState(newState);
    setMarketStockSellAmounts(prev => ({ ...prev, [assetId]: '' }));
  };

  const handleRestartGame = () => {
    setGameState(null);
    setShowSetupDialog(true);
    setSelectedProfession('');
    setSelectedDream('');
    setShowRestartDialog(false);
    setStockBuyQty('');
    setMarketStockBuyAmounts({});
    setMarketStockSellAmounts({});
    setPlayerPosition(0);
    setDiceValues([]);
    setRollResult(0);
  };

  // Compute stock assets for market modal usage
  const stockAssets = useMemo(() => {
    if (!gameState) return [];
    return (gameState.assets || []).filter(a =>
      (a.tags || []).some(t => ['Stock', 'stock', 'MYT4U', 'OK4U', 'MYJT'].includes(t))
    );
  }, [gameState?.assets]);

  if (!gameState || !financials) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        {showSetupDialog && (
          <div className="ev-modal-container max-w-2xl w-full">
            <div className="ev-modal-content p-8">
              <h2 className="ev-title text-3xl font-bold text-center mb-6">现金流游戏</h2>

              {initError && (
                <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-400/30 rounded-xl">
                  <div className="flex items-center gap-2 text-red-300">
                    <AlertCircle size={20} />
                    <span className="font-semibold">错误: {initError}</span>
                  </div>
                  <button onClick={() => setInitError(null)} className="mt-2 text-sm text-red-300 hover:text-red-200 underline">关闭</button>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-purple-200 mb-3 flex items-center gap-2">
                  <Briefcase size={20} />
                  选择职业
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(professions).map(([key, prof]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedProfession(key)}
                      className={`p-4 rounded-xl border-2 transition text-left ev-card ${selectedProfession === key ? 'ev-card-selected' : 'ev-card-hover'}`}
                    >
                      <p className="font-semibold text-purple-100">{prof.name}</p>
                      <p className="ev-text-secondary">工资: ${prof.salary.toLocaleString()}</p>
                      <p className="ev-text-secondary text-xs mt-1">初始现金: ${prof.cash.toLocaleString()}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-purple-200 mb-3 flex items-center gap-2">
                  <Star size={20} />
                  选择梦想
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {dreams.map((dream) => (
                    <button
                      key={dream.id}
                      onClick={() => setSelectedDream(dream.id)}
                      className={`p-4 rounded-xl border-2 transition text-left ev-card ${selectedDream === dream.id ? 'ev-card-selected' : 'ev-card-hover'}`}
                    >
                      <p className="font-semibold text-purple-100">{dream.name}</p>
                      <p className="ev-text-secondary">${dream.cost.toLocaleString()}</p>
                    </button>
                  ))}
                </div>
              </div>

              <NeonButton
                onClick={startGame}
                disabled={!selectedProfession || !selectedDream}
                className="w-full"
              >
                开始游戏
              </NeonButton>
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentCard = gameState.currentEvent as SmallDealCard | null;
  const isStockOpportunity = currentCard?.type === 'SmallDeal' && (currentCard.tags || []).some(t => t.toLowerCase() === 'stock');
  const stockCardPrice = isStockOpportunity ? (currentCard!.stockData?.sharePrice ?? currentCard!.totalCost) : 0;
  const stockBuyQtyNum = Math.max(0, parseInt(stockBuyQty) || 0);
  const stockBuyTotal = stockBuyQtyNum * stockCardPrice;
  const stockMaxBuyable = stockCardPrice > 0 ? Math.floor(gameState.cash / stockCardPrice) : 0;
  const stockBuyInvalid = stockBuyQtyNum <= 0 || stockBuyTotal > gameState.cash;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* 3D Dice Modal */}
      {showDiceModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="ev-modal-container">
            <div className="ev-modal-content p-12 flex flex-col items-center">
              <h3 className="text-2xl font-bold text-emerald-400 mb-8">掷骰子中...</h3>
              <ThreeDDice 
                values={diceValues} 
                isRolling={isRolling}
                className="mb-8"
              />
              {rollResult > 0 && (
                <div className="text-center">
                  <p className="text-emerald-400 text-xl font-semibold mb-2">结果: {rollResult}</p>
                  <p className="text-purple-300">移动 {rollResult} 格</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 智能面板切换按钮 */}
      <button
        onClick={() => setShowFinancialDrawer(!showFinancialDrawer)}
        className="fixed top-4 right-4 z-40 ev-button-secondary p-3 rounded-full shadow-lg"
      >
        <BarChart2 size={20} />
      </button>

      <div className="max-w-screen-2xl mx-auto p-4 lg:p-6">
        {/* Header */}
        <header className="ev-header mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="ev-title text-2xl lg:text-4xl font-bold flex items-center gap-2">
                <Trophy className="text-emerald-400" />
                Electric Velocity
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <span className="ev-badge">
                  {gameState.track === 'rat_race' ? '老鼠赛跑' : '快车道'}
                </span>
                {gameState.status.hasCharityBonus && (
                  <span className="ev-badge ev-badge-success">
                    慈善加持: {gameState.status.charityTurnsRemaining} 回合
                  </span>
                )}
                {(gameState.status.unemploymentPaydayCount > 0 || gameState.status.unemploymentCount > 0) && (
                  <span className="ev-badge ev-badge-danger">
                    停薪: {gameState.status.unemploymentPaydayCount} 次
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRestartDialog(true)}
                className="ev-button-secondary px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Home size={18} />
                <span className="hidden lg:inline">重新开始</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Left Sidebar - Navigation & Profile */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Player Profile */}
            <div className="ev-card p-6">
              <h2 className="ev-section-title flex items-center gap-2 mb-4">
                <User size={18} />
                玩家档案
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="ev-text-secondary">职业</span>
                  <span className="ev-text-primary font-semibold">{gameState.profession}</span>
                </div>
                <div className="flex justify-between">
                  <span className="ev-text-secondary">梦想</span>
                  <span className="ev-text-primary">{gameState.selectedDream.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="ev-text-secondary">总步数</span>
                  <span className="ev-text-primary">{gameState.totalMoves}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-purple-800/30">
                  <span className="ev-text-secondary flex items-center gap-1">
                    <BabyIcon size={14} />
                    孩子
                  </span>
                  <span className="text-rose-400 font-bold">{gameState.children}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="ev-card p-6">
              <h2 className="ev-section-title flex items-center gap-2 mb-4">
                <Briefcase size={18} />
                快速操作
              </h2>
              <div className="space-y-3">
                <NeonButton
                  onClick={() => setShowLoanDialog(true)}
                  disabled={!canTakeLoan(gameState)}
                  className="w-full"
                  variant="secondary"
                >
                  申请贷款
                </NeonButton>
                
                <button
                  onClick={() => setShowAssetsPanel(!showAssetsPanel)}
                  className="w-full ev-button-secondary p-3 rounded-lg text-left flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <TrendingUp size={16} />
                    我的资产
                  </span>
                  <span className="ev-badge">
                    {gameState.assets.length}
                  </span>
                </button>
                
                <button
                  onClick={() => setShowLoansPanel(!showLoansPanel)}
                  className="w-full ev-button-secondary p-3 rounded-lg text-left flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <DollarSign size={16} />
                    我的贷款
                  </span>
                  <span className="ev-badge ev-badge-warning">
                    {gameState.loans.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Assets Panel */}
            {showAssetsPanel && (
              <div className="ev-card p-4 animate-slide-in">
                <h3 className="ev-section-title mb-3 text-sm">资产详情</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {gameState.assets.length === 0 ? (
                    <p className="ev-text-secondary text-sm">暂无资产</p>
                  ) : (
                    gameState.assets.map((asset) => (
                      <div key={asset.id} className="ev-card-hover p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="ev-text-primary text-sm font-semibold">{asset.name}</p>
                            <p className="ev-text-secondary text-xs">
                              收入: ${asset.cashFlow.toLocaleString()} / 月
                            </p>
                          </div>
                          <span className="ev-badge ev-badge-success">
                            ${asset.totalCost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Loans Panel */}
            {showLoansPanel && (
              <div className="ev-card p-4 animate-slide-in">
                <h3 className="ev-section-title mb-3 text-sm">贷款详情</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {gameState.loans.length === 0 ? (
                    <p className="ev-text-secondary text-sm">无贷款</p>
                  ) : (
                    gameState.loans.map((loan) => (
                      <div key={loan.id} className="ev-card-hover p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="ev-text-primary text-sm font-semibold">银行贷款</p>
                            <p className="ev-text-secondary text-xs">
                              月供: ${Math.round(loan.balance * 0.1).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="ev-text-primary font-semibold">${loan.balance.toLocaleString()}</p>
                            <button
                              onClick={() => onRepayLoan(loan.id)}
                              disabled={gameState.cash < loan.balance}
                              className={`mt-1 text-xs px-2 py-1 rounded ${gameState.cash >= loan.balance ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-600 cursor-not-allowed'} transition`}
                            >
                              还清
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </aside>

          {/* Center - Game Board */}
          <main className="lg:col-span-2 xl:col-span-2">
            <div className="ev-card p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="ev-section-title">游戏赛道</h2>
                <div className="flex items-center gap-4">
                  <span className="ev-text-secondary text-sm">
                    位置: {playerPosition + 1} / {gameState.gameBoard.length}
                  </span>
                  {gameState.lastRoll > 0 && (
                    <span className="ev-badge">
                      上次移动: {gameState.lastRoll} 格
                    </span>
                  )}
                </div>
              </div>
              
              <CircularBoard
                gameBoard={gameState.gameBoard}
                playerPosition={playerPosition}
                currentSpace={gameState.gameBoard[playerPosition]}
                isAnimating={isAnimatingMove}
              />

              {/* Game Controls */}
              <div className="mt-6 flex flex-wrap gap-4 justify-center">
                <NeonButton
                  onClick={() => onRollDice(gameState.status.hasCharityBonus && gameState.status.charityTurnsRemaining > 0 ? 2 : 1)}
                  disabled={!canRollDice}
                  size="large"
                >
                  <Dice6 size={20} />
                  掷骰子
                  {gameState.status.hasCharityBonus && gameState.status.charityTurnsRemaining > 0 && (
                    <span className="ml-2 text-xs">×{gameState.status.charityTurnsRemaining}</span>
                  )}
                </NeonButton>

                {canEscape && gameState.track === 'rat_race' && (
                  <NeonButton 
                    onClick={onEscapeRatRace}
                    variant="success"
                    size="large"
                  >
                    <TrendingUp size={20} />
                    跳出老鼠赛跑！
                  </NeonButton>
                )}
              </div>
            </div>
          </main>

          {/* Right Sidebar - HUD & Data */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Cash & Financials */}
            <div className="ev-card p-6">
              <h3 className="ev-section-title flex items-center gap-2 mb-4">
                <DollarSign size={18} />
                财务状况
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-emerald-500/10 border border-emerald-400/30 rounded-xl">
                  <span className="ev-text-secondary">现金余额</span>
                  <span className={`text-2xl font-bold ${gameState.cash >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${gameState.cash.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="ev-text-secondary block mb-1">总收入</span>
                    <span className="text-emerald-400 font-bold">
                      ${financials.totalIncome.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="ev-text-secondary block mb-1">总支出</span>
                    <span className="text-rose-400 font-bold">
                      ${financials.totalExpenses.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 rounded-xl border-2 border-emerald-400/50 bg-emerald-500/10">
                  <span className="ev-text-secondary">月现金流</span>
                  <span className={`text-xl font-bold ${financials.monthlyCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${financials.monthlyCashFlow.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Cash Flow Donut Chart */}
            <div className="ev-card p-6">
              <h3 className="ev-section-title mb-4">现金流分析</h3>
              <CashFlowDonut financials={financials} />
              {leverageBlocked && (
                <div className="mt-4 p-3 bg-rose-500/10 border border-rose-400/30 rounded-xl">
                  <div className="flex items-center gap-2 text-rose-300 text-sm">
                    <AlertCircle size={14} />
                    <span className="font-semibold">杠杆超限！投资已锁定</span>
                  </div>
                </div>
              )}
            </div>

            {/* Market Trends */}
            <div className="ev-card p-6">
              <h3 className="ev-section-title mb-4">市场动态</h3>
              <MarketTrendChart />
              <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="ev-text-secondary text-sm">实时更新</span>
              </div>
            </div>

            {/* Financial Drawer Toggle */}
            <button
              onClick={() => setShowFinancialDrawer(!showFinancialDrawer)}
              className="w-full ev-button-secondary p-4 rounded-xl flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <BarChart2 size={18} />
                详细财务报表
              </span>
              <ChevronDown className={`transition-transform ${showFinancialDrawer ? 'rotate-180' : ''}`} size={18} />
            </button>
          </aside>
        </div>
      </div>

      {/* Investment Modal */}
      {gameState.currentEvent && (
        <InvestmentModal
          gameState={gameState}
          financials={financials}
          onBuy={onBuyOpportunity}
          onDecline={onDeclineOpportunity}
          onPay={onPayDoodad}
          onDownsized={onHandleDownsized}
          onCharity={onHandleCharity}
          onBaby={onHandleBaby}
          onDream={onHandleDream}
          onMarket={onHandleMarketEvent}
          onSellAsset={onSellAsset}
          onMarketBuyStock={onMarketBuyStock}
          onMarketSellStock={onMarketSellStock}

          stockBuyQty={stockBuyQty}
          setStockBuyQty={setStockBuyQty}
          stockBuyTotal={stockBuyTotal}
          stockBuyInvalid={stockBuyInvalid}
          stockMaxBuyable={stockMaxBuyable}
          marketStockBuyAmounts={marketStockBuyAmounts}
          setMarketStockBuyAmounts={setMarketStockBuyAmounts}
          marketStockSellAmounts={marketStockSellAmounts}
          setMarketStockSellAmounts={setMarketStockSellAmounts}
          stockAssets={stockAssets}
          onTakeOpportunityLoan={onTakeOpportunityLoan}
          showOpportunityLoanDialog={showOpportunityLoanDialog}
          setShowOpportunityLoanDialog={setShowOpportunityLoanDialog}
          opportunityLoanAmount={opportunityLoanAmount}
          setOpportunityLoanAmount={setOpportunityLoanAmount}
        />
      )}

      {/* Loan Dialog */}
      {showLoanDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="ev-modal-container max-w-md w-full">
            <div className="ev-modal-content p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="ev-section-title">申请银行贷款</h3>
                <button 
                  onClick={() => setShowLoanDialog(false)} 
                  className="ev-text-secondary hover:text-white transition"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="ev-text-secondary block mb-2">贷款金额 (必须是1000的倍数)</label>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  placeholder="输入金额 (如: 50000)"
                  className="w-full p-3 bg-slate-800/50 border border-purple-400/30 rounded-lg text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>
              
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-400/30 rounded-lg">
                <p className="text-rose-300 text-sm">
                  💡 提示：贷款利息为每月贷款余额的10%
                </p>
              </div>
              
              <div className="flex gap-3">
                <NeonButton
                  onClick={onTakeLoan}
                  disabled={!loanAmount || parseInt(loanAmount) % 1000 !== 0}
                  className="flex-1"
                >
                  确认贷款
                </NeonButton>
                <button
                  onClick={() => setShowLoanDialog(false)}
                  className="ev-button-secondary px-6 py-3 rounded-lg"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Win Dialog */}
      {showRestartDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="ev-modal-container max-w-lg w-full">
            <div className="ev-modal-content p-8 text-center">
              <Trophy size={48} className="text-emerald-400 mx-auto mb-4" />
              <h2 className="ev-title text-3xl mb-4">🎉 恭喜获胜！</h2>
              <p className="ev-text-secondary mb-6">
                你成功实现了自己的梦想：{gameState.selectedDream.name}
              </p>
              <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-400/30 rounded-xl">
                <p className="text-emerald-300">
                  总步数: {gameState.totalMoves} | 被动收入: ${financials.passiveIncome.toLocaleString()}/月
                </p>
              </div>
              <NeonButton
                onClick={handleRestartGame}
                className="w-full"
                variant="success"
                size="large"
              >
                开始新游戏
              </NeonButton>
            </div>
          </div>
        </div>
      )}

      {/* Financial Drawer */}
      <div className={`fixed inset-y-0 right-0 w-96 bg-slate-900/95 backdrop-blur-xl border-l border-purple-400/20 transform transition-transform z-40 ${showFinancialDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="ev-section-title">详细财务报表</h2>
            <button 
              onClick={() => setShowFinancialDrawer(false)}
              className="ev-text-secondary hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="ev-card p-4">
              <h3 className="ev-section-title text-sm mb-3">收入明细</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="ev-text-secondary">工资</span>
                  <span className="ev-text-primary">${financials.salary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="ev-text-secondary">被动收入</span>
                  <span className="text-emerald-400">${financials.passiveIncome.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-purple-800/30 flex justify-between font-bold">
                  <span className="ev-text-primary">总收入</span>
                  <span className="text-emerald-400">${financials.totalIncome.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="ev-card p-4">
              <h3 className="ev-section-title text-sm mb-3">支出明细</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="ev-text-secondary">税收</span>
                  <span className="text-rose-400">${gameState.professionData.tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="ev-text-secondary">房贷</span>
                  <span className="text-rose-400">${Math.floor(gameState.professionData.mortgage * (gameState.mortgageMultiplier ?? 1)).toLocaleString()}</span>
                </div>
                {gameState.professionData.studentLoan > 0 && (
                  <div className="flex justify-between">
                    <span className="ev-text-secondary">学贷</span>
                    <span className="text-rose-400">${gameState.professionData.studentLoan.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="ev-text-secondary">其他</span>
                  <span className="text-rose-400">${gameState.professionData.otherExpenses.toLocaleString()}</span>
                </div>
                {gameState.children > 0 && (
                  <div className="flex justify-between">
                    <span className="ev-text-secondary">孩子支出</span>
                    <span className="text-rose-400">${(gameState.children * gameState.professionData.childExpense).toLocaleString()}</span>
                  </div>
                )}
                {financials.loanInterest > 0 && (
                  <div className="flex justify-between">
                    <span className="ev-text-secondary">贷款利息</span>
                    <span className="text-rose-400">${financials.loanInterest.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-purple-800/30 flex justify-between font-bold">
                  <span className="ev-text-primary">总支出</span>
                  <span className="text-rose-400">${financials.totalExpenses.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <button className="w-full ev-button-secondary p-3 rounded-xl flex items-center justify-center gap-2">
              <BookOpen size={16} />
              查看游戏日志
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppDesktop;