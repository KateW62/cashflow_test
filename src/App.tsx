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
} from './logic/gameLogic';
import { GameState, Asset, ActionLogEntry } from './logic/gameTypes';
import { professions } from './config/professions';
import { dreams } from './config/dreams';
import { SmallDealCard, BigDealCard } from './config/cards';
import { MarketEvent } from './config/marketEvents';
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
} from 'lucide-react';
import { useGameRoom } from './hooks/useGameRoom';

function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showSetupDialog, setShowSetupDialog] = useState(true);
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [roomInput, setRoomInput] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [selectedProfession, setSelectedProfession] = useState<string>('');
  const [selectedDream, setSelectedDream] = useState<string>('');
  const [loanAmount, setLoanAmount] = useState<string>('');
  const [showLoanDialog, setShowLoanDialog] = useState(false);
  const [showLoansPanel, setShowLoansPanel] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showOpportunityLoanDialog, setShowOpportunityLoanDialog] = useState(false);
  const [opportunityLoanAmount, setOpportunityLoanAmount] = useState<string>('');
  const [showActionLog, setShowActionLog] = useState(false);
  const [showFullLog, setShowFullLog] = useState(false);
  const [showFinancialDrawer, setShowFinancialDrawer] = useState(false);

  // Stock trading state — only used inside modals
  const [stockBuyQty, setStockBuyQty] = useState<string>('');
  const [marketStockBuyAmounts, setMarketStockBuyAmounts] = useState<Record<string, string>>({});
  const [marketStockSellAmounts, setMarketStockSellAmounts] = useState<Record<string, string>>({});

  const logEndRef = useRef<HTMLDivElement>(null);

  const localPlayerId = useMemo(() => {
    const stored = localStorage.getItem('playerId');
    if (stored) return stored;
    const newId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('playerId', newId);
    return newId;
  }, []);

  const gameRoom = useGameRoom(localPlayerId);

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
      setShowSetupDialog(false);
      setShowRoomDialog(true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setInitError(`初始化失败: ${errorMsg}`);
    }
  };

  const handleJoinRoom = async () => {
    if (roomInput.trim() && playerName.trim()) {
      await gameRoom.joinRoom(roomInput.trim(), playerName.trim());
      setGameState(prev => prev ? { ...prev, isMultiplayer: true } : prev);
      setShowRoomDialog(false);
    }
  };

  const skipMultiplayer = () => {
    setShowRoomDialog(false);
  };

  const financials = gameState ? calculateFinancials(gameState) : null;
  const canRollDice = gameState ? (gameState.canRoll && (gameRoom.roomId ? gameRoom.isMyTurn : true)) : false;
  const canEscape = gameState ? canEscapeRatRace(gameState) : false;

  const onRollDice = (diceCount: number = 1) => {
    if (!gameState) return;
    let newState = rollDice(gameState, diceCount);
    newState = handleBankruptcy(newState);
    setGameState(newState);
    gameRoom.broadcastGameState(newState);

    if (!newState.currentEvent && !newState.currentSpecialEvent) {
      gameRoom.endTurn();
    }
  };

  const onEscapeRatRace = () => {
    if (!gameState) return;
    const newState = escapeToFastTrack(gameState);
    setGameState(newState);
    gameRoom.broadcastGameState(newState);
  };

  const onBuyOpportunity = () => {
    if (!gameState || !gameState.currentEvent) return;
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
      gameRoom.broadcastGameState(newState);
      gameRoom.endTurn();
      setStockBuyQty('');
    } else {
      const newState = buyOpportunity(gameState, card);
      setGameState(newState);
      gameRoom.broadcastGameState(newState);
      gameRoom.endTurn();
    }
  };

  const onDeclineOpportunity = () => {
    if (!gameState) return;
    const newState = declineOpportunity(gameState);
    setGameState(newState);
    gameRoom.broadcastGameState(newState);
    gameRoom.endTurn();
    setStockBuyQty('');
  };

  const onPayDoodad = () => {
    if (!gameState || !gameState.currentEvent) return;
    const newState = payDoodad(gameState, gameState.currentEvent);
    setGameState(newState);
    gameRoom.broadcastGameState(newState);
    gameRoom.endTurn();
  };

  const onHandleDownsized = () => {
    if (!gameState) return;
    const newState = handleDownsized(gameState);
    setGameState(newState);
    gameRoom.broadcastGameState(newState);
    gameRoom.endTurn();
  };

  const onHandleCharity = (donated: boolean) => {
    if (!gameState) return;
    const newState = handleCharity(gameState, donated);
    setGameState(newState);
    gameRoom.broadcastGameState(newState);
    gameRoom.endTurn();
  };

  const onHandleBaby = () => {
    if (!gameState) return;
    const newState = handleBaby(gameState);
    setGameState(newState);
    gameRoom.broadcastGameState(newState);
    gameRoom.endTurn();
  };

  const onHandleDream = (purchased: boolean) => {
    if (!gameState) return;
    const newState = handleDream(gameState, purchased);
    setGameState(newState);
    gameRoom.broadcastGameState(newState);
    if (purchased && newState.currentSpecialEvent === 'winner') {
      gameRoom.endTurn();
    }
  };

  const onTakeLoan = () => {
    if (!gameState) return;
    const amount = parseInt(loanAmount);
    if (!isNaN(amount) && amount > 0 && amount % 1000 === 0) {
      const newState = takeLoan(gameState, amount);
      setGameState(newState);
      gameRoom.broadcastGameState(newState);
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
      gameRoom.broadcastGameState(newState);
      setShowOpportunityLoanDialog(false);
      setOpportunityLoanAmount('');
    }
  };

  const onRepayLoan = (loanId: string) => {
    if (!gameState) return;
    const newState = repayLoan(gameState, loanId);
    setGameState(newState);
    gameRoom.broadcastGameState(newState);
  };

  const onHandleMarketEvent = () => {
    if (!gameState) return;
    const newState = handleMarketEvent(gameState);
    setGameState(newState);
    gameRoom.broadcastGameState(newState);
    gameRoom.endTurn();
    setMarketStockBuyAmounts({});
    setMarketStockSellAmounts({});
  };

  const onSellAsset = (assetId: string, salePrice: number) => {
    if (!gameState) return;
    const newState = sellAsset(gameState, assetId, salePrice);
    setGameState(newState);
    gameRoom.broadcastGameState(newState);
  };

  const onMarketBuyStock = (assetId: string) => {
    if (!gameState) return;
    const qty = parseInt(marketStockBuyAmounts[assetId] || '0');
    if (qty <= 0 || isNaN(qty)) return;
    const newState = buyStockShares(gameState, assetId, qty);
    setGameState(newState);
    gameRoom.broadcastGameState(newState);
    setMarketStockBuyAmounts(prev => ({ ...prev, [assetId]: '' }));
  };

  const onMarketSellStock = (assetId: string) => {
    if (!gameState) return;
    const qty = parseInt(marketStockSellAmounts[assetId] || '0');
    if (qty <= 0 || isNaN(qty)) return;
    const newState = sellStockShares(gameState, assetId, qty);
    setGameState(newState);
    gameRoom.broadcastGameState(newState);
    setMarketStockSellAmounts(prev => ({ ...prev, [assetId]: '' }));
  };

  const handleRestartGame = () => {
    gameRoom.clearRoom();
    setGameState(null);
    setShowSetupDialog(true);
    setShowRoomDialog(false);
    setRoomInput('');
    setPlayerName('');
    setSelectedProfession('');
    setSelectedDream('');
    setShowRestartDialog(false);
    setShowFullLog(false);
    setStockBuyQty('');
    setMarketStockBuyAmounts({});
    setMarketStockSellAmounts({});
  };

  useEffect(() => {
    gameRoom.onGameStateUpdate((updatedState, _playerId, triggerPlayerId) => {
      if (triggerPlayerId === localPlayerId) {
        setGameState({
          ...updatedState,
          assets: [...(updatedState.assets || [])],
          loans: [...(updatedState.loans || [])],
        });
      }
    });
  }, [gameRoom, localPlayerId]);

  useEffect(() => {
    if (gameState?.paydayMessage) {
      const timer = setTimeout(() => {
        setGameState((prev) => prev ? { ...prev, assets: [...(prev.assets || [])], loans: [...(prev.loans || [])], paydayMessage: undefined } : null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState?.paydayMessage]);

  useEffect(() => {
    if (showActionLog && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameState?.actionLog?.length, showActionLog]);

  // Reset stock buy qty when opportunity event changes
  useEffect(() => {
    setStockBuyQty('');
  }, [gameState?.currentEvent]);

  const diceToRoll = (gameState?.status.hasCharityBonus && gameState?.status.charityTurnsRemaining > 0) ? 2 : 1;
  const leverageBlocked = financials?.isOverLeveraged ?? false;

  // Compute stock assets for market modal usage
  const stockAssets = useMemo(() => {
    if (!gameState) return [];
    return (gameState.assets || []).filter(a =>
      (a.tags || []).some(t => ['Stock', 'stock', 'MYT4U', 'OK4U', 'MYJT'].includes(t))
    );
  }, [gameState?.assets]);

  if (!gameState || !financials) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
        {showSetupDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto">
              <h2 className="text-3xl font-bold text-slate-800 mb-6 text-center">现金流游戏</h2>

              {initError && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle size={20} />
                    <span className="font-semibold">错误: {initError}</span>
                  </div>
                  <button onClick={() => setInitError(null)} className="mt-2 text-sm text-red-600 hover:text-red-700 underline">关闭</button>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Briefcase size={20} />
                  选择职业
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(professions).map(([key, prof]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedProfession(key)}
                      className={`p-4 rounded-xl border-2 transition text-left ${selectedProfession === key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <p className="font-semibold text-slate-800">{prof.name}</p>
                      <p className="text-sm text-slate-600">工资: ${prof.salary.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">初始现金: ${prof.cash.toLocaleString()}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Star size={20} />
                  选择梦想
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {dreams.map((dream) => (
                    <button
                      key={dream.id}
                      onClick={() => setSelectedDream(dream.id)}
                      className={`p-4 rounded-xl border-2 transition text-left ${selectedDream === dream.id ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <p className="font-semibold text-slate-800">{dream.name}</p>
                      <p className="text-sm text-slate-600">${dream.cost.toLocaleString()}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={startGame}
                disabled={!selectedProfession || !selectedDream}
                className={`w-full px-6 py-4 font-bold rounded-xl shadow-lg transform transition text-lg ${selectedProfession && selectedDream ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                开始游戏
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Derived values for opportunity stock card
  const currentCard = gameState.currentEvent as SmallDealCard | null;
  const isStockOpportunity = currentCard?.type === 'SmallDeal' && (currentCard.tags || []).some(t => t.toLowerCase() === 'stock');
  const stockCardPrice = isStockOpportunity ? (currentCard!.stockData?.sharePrice ?? currentCard!.totalCost) : 0;
  const stockBuyQtyNum = Math.max(0, parseInt(stockBuyQty) || 0);
  const stockBuyTotal = stockBuyQtyNum * stockCardPrice;
  const stockMaxBuyable = stockCardPrice > 0 ? Math.floor(gameState.cash / stockCardPrice) : 0;
  const stockBuyInvalid = stockBuyQtyNum <= 0 || stockBuyTotal > gameState.cash;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-slate-800">现金流游戏</h1>
            <p className="text-slate-600 text-sm mt-1">
              赛道: <span className="font-semibold">{gameState.track === 'rat_race' ? '老鼠赛跑' : '快车道'}</span>
              {gameState.isMultiplayer && <span className="ml-2 text-blue-600 font-semibold">多人模式</span>}
            </p>
            {(gameState.status.unemploymentPaydayCount > 0 || gameState.status.unemploymentCount > 0) && (
              <div className="mt-1 inline-block px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                停薪剩余：{gameState.isMultiplayer ? gameState.status.unemploymentCount : gameState.status.unemploymentPaydayCount} 次
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowActionLog(!showActionLog)}
              className="p-2 md:px-4 md:py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition flex items-center gap-2 text-sm"
            >
              <ScrollText size={18} />
              <span className="hidden md:inline">操作日志</span>
              {gameState.actionLog.length > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {Math.min(gameState.actionLog.length, 99)}
                </span>
              )}
            </button>

            {gameRoom.roomId && (
              <div className="bg-white rounded-lg shadow p-3">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-600" />
                  <span className="text-sm font-semibold text-slate-700">{gameRoom.roomId}</span>
                </div>
                {gameRoom.currentTurnPlayerId && (
                  <div className="text-xs mt-1">
                    {gameRoom.isMyTurn ? (
                      <span className="text-green-600 font-semibold">轮到你了！</span>
                    ) : (
                      <span className="text-slate-500">等待其他玩家...</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-start mb-4 pb-4 border-b">
                <div>
                  <h2 className="text-xl font-semibold text-slate-700">财务报表</h2>
                  <p className="text-base font-medium text-slate-600 mt-1">
                    <span className="text-blue-600">{gameState.profession}</span>
                    {gameState.selectedDream && (
                      <span className="text-slate-400 text-sm ml-2">· 梦想: {gameState.selectedDream.name}</span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">孩子数量</div>
                  <div className="text-xl font-bold text-sky-600 flex items-center gap-1">
                    <BabyIcon size={20} />
                    {gameState.children}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="col-span-2 md:col-span-4 flex justify-between items-center p-3 bg-green-50 rounded-xl border border-green-200">
                  <span className="text-slate-600 font-medium">现金余额</span>
                  <span className={`text-2xl font-bold ${gameState.cash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${gameState.cash.toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-col p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs text-slate-500 mb-1">工资</span>
                  <span className="font-bold text-slate-700">${financials.salary.toLocaleString()}</span>
                </div>
                <div className={`flex flex-col p-3 rounded-xl ${financials.passiveIncome > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                  <span className="text-xs text-slate-500 mb-1">被动收入</span>
                  <span className={`font-bold ${financials.passiveIncome > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                    ${financials.passiveIncome.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs text-slate-500 mb-1">总收入</span>
                  <span className="font-bold text-slate-700">${financials.totalIncome.toLocaleString()}</span>
                </div>
                <div className="flex flex-col p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs text-slate-500 mb-1">总支出</span>
                  <span className="font-bold text-slate-700">${financials.totalExpenses.toLocaleString()}</span>
                </div>

                <div className={`col-span-2 md:col-span-4 flex justify-between items-center p-4 rounded-xl border-2 ${financials.monthlyCashFlow >= 0 ? 'bg-blue-50 border-blue-300' : 'bg-red-50 border-red-300'}`}>
                  <span className="text-slate-600 font-medium">月现金流</span>
                  <span className={`text-2xl font-bold ${financials.monthlyCashFlow >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    ${financials.monthlyCashFlow.toLocaleString()}
                  </span>
                </div>
              </div>

              {leverageBlocked && (
                <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-xl">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle size={18} />
                    <span className="font-semibold text-sm">杠杆超限！已锁定投资购买功能</span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">贷款总额 ${financials.totalLoans.toLocaleString()} 超过现金流 × {MAX_LOAN_MULTIPLIER} 上限 ${Math.floor(financials.maxLoanAllowed).toLocaleString()}</p>
                </div>
              )}

              {canEscape && gameState.track === 'rat_race' && (
                <div className="mb-4 p-4 bg-gradient-to-r from-green-100 to-cyan-100 rounded-xl border-2 border-green-400">
                  <p className="text-green-800 font-semibold mb-1">恭喜！被动收入已超过总支出，可以跳出老鼠赛跑！</p>
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-slate-600 mb-3">支出明细</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">税收:</span>
                    <span className="font-medium">${gameState.professionData.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">房贷:</span>
                    <span className="font-medium">${Math.floor(gameState.professionData.mortgage * (gameState.mortgageMultiplier ?? 1)).toLocaleString()}</span>
                  </div>
                  {gameState.professionData.studentLoan > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">学贷:</span>
                      <span className="font-medium">${gameState.professionData.studentLoan.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">其他:</span>
                    <span className="font-medium">${gameState.professionData.otherExpenses.toLocaleString()}</span>
                  </div>
                  {gameState.children > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">孩子支出:</span>
                      <span className="font-medium">${(gameState.children * gameState.professionData.childExpense).toLocaleString()}</span>
                    </div>
                  )}
                  {financials.loanInterest > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>贷款利息:</span>
                      <span className="font-medium">${financials.loanInterest.toLocaleString()}</span>
                    </div>
                  )}
                  {(gameState.mortgageMultiplier ?? 1.0) > 1.0 && (
                    <div className="col-span-2 flex justify-between text-orange-600 font-semibold border-t pt-2 mt-1">
                      <span>加息倍率:</span>
                      <span>×{(gameState.mortgageMultiplier ?? 1.0).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-700 mb-3">游戏地图</h3>
              <div className="grid grid-cols-6 gap-1.5">
                {gameState.gameBoard.map((space) => (
                  <div
                    key={space.id}
                    className={`h-10 rounded-lg flex items-center justify-center font-bold text-xs cursor-default transition ${space.id === gameState.currentPosition ? 'ring-4 ring-red-500 scale-110 bg-red-100' : getSpaceColor(space.type)}`}
                    title={getSpaceLabel(space.type)}
                  >
                    {space.id === gameState.currentPosition ? (
                      <span className="text-red-700 text-base">●</span>
                    ) : (
                      <span className="text-white text-xs">{getSpaceLabel(space.type)}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>位置: {gameState.currentPosition + 1}/{gameState.gameBoard.length} ({getSpaceLabel(gameState.gameBoard[gameState.currentPosition].type)})</span>
                {gameState.lastRoll > 0 && <span>上次掷骰: {gameState.lastRoll}</span>}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-slate-700 mb-4">操作</h2>

              {gameState.status.isDownsized && gameState.status.downsizedTurnsRemaining > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={18} className="text-red-600" />
                    <span className="font-bold text-red-800 text-sm">失业中 — 剩余 {gameState.status.downsizedTurnsRemaining} 轮</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => onRollDice(diceToRoll)}
                disabled={!canRollDice}
                className={`w-full px-6 py-4 font-bold rounded-xl shadow-lg transform transition flex items-center justify-center gap-2 text-lg mb-3 ${canRollDice ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95 cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                <Dice6 size={24} />
                掷骰子 {diceToRoll > 1 ? `(${diceToRoll}个)` : ''}
              </button>

              {canEscape && gameState.track === 'rat_race' && (
                <button
                  onClick={onEscapeRatRace}
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-bold rounded-xl shadow-lg transform transition hover:scale-105 active:scale-95 mb-3 flex items-center justify-center gap-2"
                >
                  <TrendingUp size={20} />
                  进入快车道
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowLoanDialog(true)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-1 text-sm"
                >
                  <DollarSign size={16} />
                  银行贷款
                </button>

                {gameState.loans.length > 0 && (
                  <button
                    onClick={() => setShowLoansPanel(!showLoansPanel)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition text-sm"
                  >
                    贷款管理 ({gameState.loans.length})
                  </button>
                )}
              </div>

              {financials.totalLoans > 0 && (
                <div className="mt-3 p-2 bg-slate-50 rounded-lg text-xs text-slate-600">
                  贷款总额: <span className="font-semibold">${financials.totalLoans.toLocaleString()}</span>
                  <span className="mx-1">·</span>
                  上限: <span className={`font-semibold ${leverageBlocked ? 'text-red-600' : 'text-green-600'}`}>${Math.floor(financials.maxLoanAllowed).toLocaleString()}</span>
                </div>
              )}

              <button
                onClick={() => setShowRestartDialog(true)}
                className="w-full mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition flex items-center justify-center gap-2 text-sm"
              >
                <AlertCircle size={16} />
                重新开始
              </button>
            </div>

            {showLoansPanel && gameState.loans.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-5">
                <h3 className="text-base font-semibold text-slate-700 mb-3">贷款列表</h3>
                {gameState.loans.map((loan) => (
                  <div key={loan.id} className="p-3 bg-orange-50 rounded-xl mb-2 border border-orange-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">本金: ${loan.amount.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">月利息: ${loan.monthlyInterest.toLocaleString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRepayLoan(loan.id)}
                      disabled={gameState.cash < loan.amount}
                      className={`w-full px-3 py-1.5 font-semibold rounded-lg transition text-sm ${gameState.cash >= loan.amount ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                      还清贷款
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Read-only asset list */}
            {gameState.assets.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-5">
                <h3 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Building2 size={18} className="text-amber-500" />
                  资产列表
                </h3>
                <div className="space-y-2">
                  {gameState.assets.map((asset: Asset) => {
                    const isStock = (asset.tags || []).some(t => ['Stock', 'stock', 'MYT4U', 'OK4U', 'MYJT'].includes(t));
                    const priceTag = isStock
                      ? ((asset.tags || []).find(t => ['MYT4U', 'OK4U', 'MYJT'].includes(t)) || 'Stock')
                      : null;
                    const currentPrice = priceTag ? getMarketPrice(gameState, priceTag) : null;

                    return (
                      <div key={asset.id} className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-1">
                            {isStock ? <BarChart2 size={14} className="text-blue-500 shrink-0" /> : <Building2 size={14} className="text-amber-600 shrink-0" />}
                            {asset.name}
                          </h4>
                          {asset.subtype && (
                            <span className={`shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full ${asset.subtype === 'Income' ? 'bg-green-100 text-green-700' : asset.subtype === 'Growth' ? 'bg-blue-100 text-blue-700' : asset.subtype === 'Speculative' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                              {asset.subtype === 'Income' ? '收入型' : asset.subtype === 'Growth' ? '成长型' : asset.subtype === 'Speculative' ? '投机型' : '稳健型'}
                            </span>
                          )}
                        </div>
                        {isStock && asset.shares != null ? (
                          <div className="mt-1.5 text-xs text-slate-600 space-y-0.5">
                            <div className="flex justify-between">
                              <span className="text-slate-500">持有:</span>
                              <span className="font-semibold">{asset.shares} 股</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">平均成本:</span>
                              <span className="font-semibold">${asset.shares > 0 ? Math.round(asset.cost / asset.shares) : 0}/股</span>
                            </div>
                            {currentPrice != null && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">当前价格:</span>
                                <span className="font-semibold text-blue-600">${currentPrice}/股</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>首付: ${asset.downPayment.toLocaleString()}</span>
                            <span className={`font-semibold ${asset.monthlyIncome >= 0 ? 'text-amber-600' : 'text-red-500'}`}>
                              月收支: {asset.monthlyIncome >= 0 ? '+' : ''}${asset.monthlyIncome.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action log panel */}
      {showActionLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-40 p-0 md:p-4">
          <div className="bg-white w-full md:max-w-lg md:rounded-2xl shadow-2xl flex flex-col max-h-[80vh] rounded-t-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ScrollText size={20} />
                操作日志 ({gameState.actionLog.length} 条)
              </h3>
              <button onClick={() => setShowActionLog(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {gameState.actionLog.length === 0 ? (
                <p className="text-slate-400 text-center py-8">暂无日志</p>
              ) : (
                gameState.actionLog.map((entry: ActionLogEntry) => (
                  <div key={entry.id} className={`p-3 rounded-xl border text-sm ${entry.type === 'positive' ? 'bg-green-50 border-green-200' : entry.type === 'negative' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-700">{entry.message}</span>
                      {entry.cashChange !== 0 && (
                        <span className={`shrink-0 font-bold ${entry.cashChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.cashChange > 0 ? '+' : ''}${entry.cashChange.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-slate-400">
                      <span>回合 {entry.step}</span>
                      <span>现金流: ${entry.cashFlow.toLocaleString()}</span>
                      <span>被动: ${entry.passiveIncome.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => { setShowActionLog(false); setShowFullLog(true); }}
                className="w-full px-4 py-2 bg-slate-800 text-white font-semibold rounded-xl transition hover:bg-slate-700 text-sm"
              >
                查看完整回溯报告
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payday notification */}
      {gameState?.paydayMessage && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-green-600 text-white px-8 py-4 rounded-xl shadow-2xl flex items-center gap-3">
            <DollarSign size={24} className="text-green-200" />
            <span className="text-base font-bold">{gameState.paydayMessage}</span>
          </div>
        </div>
      )}

      {/* Current event modal */}
      {gameState?.currentEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl shadow-2xl p-6 relative rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="absolute top-4 right-4">
              {(gameState.currentEvent.type === 'SmallDeal' || gameState.currentEvent.type === 'BigDeal') && (
                <button onClick={onDeclineOpportunity} className="text-slate-400 hover:text-slate-600 transition">
                  <X size={24} />
                </button>
              )}
            </div>

            {/* Market event */}
            {(gameState.currentEvent.type === 'stock_surge' || gameState.currentEvent.type === 'stock_crash' || gameState.currentEvent.type === 'real_estate_boom' || gameState.currentEvent.type === 'inflation' || gameState.currentEvent.type === 'opportunity' || gameState.currentEvent.type === 'price_jump' || gameState.currentEvent.type === 'government_buyout' || gameState.currentEvent.type === 'global_macro' || gameState.currentEvent.type === 'specific_buyer') ? (
              <>
                <div className="mb-4">
                  <div className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full mb-3 ${gameState.currentEvent.type === 'stock_surge' || gameState.currentEvent.type === 'price_jump' ? 'bg-green-100 text-green-800' : gameState.currentEvent.type === 'stock_crash' ? 'bg-red-100 text-red-800' : gameState.currentEvent.type === 'real_estate_boom' || gameState.currentEvent.type === 'government_buyout' ? 'bg-amber-100 text-amber-800' : gameState.currentEvent.type === 'inflation' || gameState.currentEvent.type === 'global_macro' ? 'bg-orange-100 text-orange-800' : gameState.currentEvent.type === 'specific_buyer' ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'}`}>
                    {gameState.currentEvent.type === 'stock_surge' || gameState.currentEvent.type === 'price_jump' ? <TrendingUp size={14} /> : gameState.currentEvent.type === 'stock_crash' ? <TrendingDown size={14} /> : <AlertCircle size={14} />}
                    {gameState.currentEvent.type === 'government_buyout' ? '政府收购' : gameState.currentEvent.type === 'global_macro' ? '宏观政策' : gameState.currentEvent.type === 'specific_buyer' ? '买家出现' : '市场风云'}
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">{(gameState.currentEvent as MarketEvent).name}</h3>
                  <p className="text-slate-600 text-sm mb-3">{(gameState.currentEvent as MarketEvent).description}</p>
                </div>

                {/* Stock trading window for stock-related market events */}
                {(gameState.currentEvent.type === 'stock_surge' || gameState.currentEvent.type === 'stock_crash' || gameState.currentEvent.type === 'price_jump') && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
                      <BarChart2 size={16} />
                      股票交易窗口
                    </h4>

                    {/* Market prices reference */}
                    {gameState.marketPrices.length > 0 && (
                      <div className="mb-3 p-2 bg-white rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">市场行情</p>
                        <div className="flex flex-wrap gap-2">
                          {gameState.marketPrices.map(mp => (
                            <span key={mp.tag} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                              {mp.tag}: ${mp.price}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {stockAssets.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-2">您当前没有持仓，可在机会格买入股票</p>
                    ) : (
                      <div className="space-y-3">
                        {stockAssets.map((asset: Asset) => {
                          const priceTag = (asset.tags || []).find(t => ['MYT4U', 'OK4U', 'MYJT'].includes(t)) || 'Stock';
                          const currentPrice = getMarketPrice(gameState, priceTag);
                          const sharesHeld = asset.shares ?? 0;
                          const maxBuyable = currentPrice > 0 ? Math.floor(gameState.cash / currentPrice) : 0;
                          const buyQty = Math.max(0, parseInt(marketStockBuyAmounts[asset.id] || '0') || 0);
                          const sellQty = Math.max(0, parseInt(marketStockSellAmounts[asset.id] || '0') || 0);
                          const buyTotal = buyQty * currentPrice;
                          const sellTotal = sellQty * currentPrice;
                          const buyInvalid = buyQty <= 0 || buyTotal > gameState.cash;
                          const sellInvalid = sellQty <= 0 || sellQty > sharesHeld;

                          return (
                            <div key={asset.id} className="bg-white p-3 rounded-xl border border-slate-200">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-sm text-slate-700">{asset.name}</span>
                                <span className="text-xs text-blue-600 font-medium">@${currentPrice}/股</span>
                              </div>
                              <div className="flex gap-3 text-xs text-slate-500 mb-3">
                                <span>持有: <strong className="text-slate-700">{sharesHeld} 股</strong></span>
                                <span>平均成本: <strong>${sharesHeld > 0 ? Math.round(asset.cost / sharesHeld) : 0}</strong></span>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                {/* Buy section */}
                                <div className="space-y-1">
                                  <p className="text-xs text-slate-500 font-medium">买入（最多 {maxBuyable} 股）</p>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min="0"
                                    max={maxBuyable}
                                    value={marketStockBuyAmounts[asset.id] || ''}
                                    onChange={e => {
                                      const v = e.target.value.replace(/[^0-9]/g, '');
                                      setMarketStockBuyAmounts(prev => ({ ...prev, [asset.id]: v }));
                                    }}
                                    placeholder="数量"
                                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400"
                                  />
                                  {buyQty > 0 && (
                                    <p className={`text-xs font-medium ${buyInvalid ? 'text-red-500' : 'text-green-600'}`}>
                                      合计: ${buyTotal.toLocaleString()}
                                      {buyInvalid && ' (资金不足)'}
                                    </p>
                                  )}
                                  <button
                                    onClick={() => onMarketBuyStock(asset.id)}
                                    disabled={buyInvalid}
                                    className={`w-full px-2 py-1.5 text-xs font-semibold rounded-lg transition ${!buyInvalid ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                  >
                                    买入
                                  </button>
                                </div>

                                {/* Sell section */}
                                <div className="space-y-1">
                                  <p className="text-xs text-slate-500 font-medium">卖出（持有 {sharesHeld} 股）</p>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min="0"
                                    max={sharesHeld}
                                    value={marketStockSellAmounts[asset.id] || ''}
                                    onChange={e => {
                                      const v = e.target.value.replace(/[^0-9]/g, '');
                                      setMarketStockSellAmounts(prev => ({ ...prev, [asset.id]: v }));
                                    }}
                                    placeholder="数量"
                                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400"
                                  />
                                  {sellQty > 0 && (
                                    <p className={`text-xs font-medium ${sellInvalid ? 'text-red-500' : 'text-amber-600'}`}>
                                      回款: ${sellTotal.toLocaleString()}
                                      {sellInvalid && ' (超出持仓)'}
                                    </p>
                                  )}
                                  <button
                                    onClick={() => onMarketSellStock(asset.id)}
                                    disabled={sellInvalid}
                                    className={`w-full px-2 py-1.5 text-xs font-semibold rounded-lg transition ${!sellInvalid ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                  >
                                    卖出
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Affected assets for non-stock market events */}
                {(() => {
                  const marketEvent = gameState.currentEvent as MarketEvent;
                  const affectedAssets = marketEvent.allowSelling ? getAffectedAssets(gameState, marketEvent) : [];

                  if (affectedAssets.length > 0 && gameState.currentEvent.type !== 'stock_surge' && gameState.currentEvent.type !== 'stock_crash' && gameState.currentEvent.type !== 'price_jump') {
                    return (
                      <div className="bg-slate-50 rounded-xl p-4 mb-4 max-h-60 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-3">
                          <ShoppingCart size={16} className="text-slate-600" />
                          <h4 className="font-semibold text-slate-700 text-sm">可出售资产</h4>
                        </div>
                        <div className="space-y-3">
                          {affectedAssets.map((asset: Asset) => {
                            const salePrice = calculateSalePrice(asset, marketEvent);
                            const profit = salePrice - asset.cost;
                            const profitPercent = asset.cost > 0 ? ((profit / asset.cost) * 100).toFixed(1) : '0.0';

                            return (
                              <div key={asset.id} className="bg-white rounded-xl p-3 border border-slate-200">
                                <div className="flex justify-between items-start mb-2">
                                  <h5 className="font-semibold text-slate-800 text-sm">{asset.name}</h5>
                                  <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${profit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {profit >= 0 ? '+' : ''}{profitPercent}%
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                                  <div><span className="text-slate-400">原价:</span> <span className="font-medium">${asset.cost.toLocaleString()}</span></div>
                                  <div><span className="text-slate-400">售价:</span> <span className="font-medium text-green-600">${salePrice.toLocaleString()}</span></div>
                                </div>
                                <button
                                  onClick={() => onSellAsset(asset.id, salePrice)}
                                  className={`w-full px-3 py-2 rounded-lg font-semibold transition text-sm ${profit >= 0 ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}
                                >
                                  卖出 (获得 ${salePrice.toLocaleString()})
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (gameState.currentEvent.type !== 'stock_surge' && gameState.currentEvent.type !== 'stock_crash' && gameState.currentEvent.type !== 'price_jump') {
                    return (
                      <div className={`rounded-xl p-4 mb-4 ${gameState.currentEvent.type === 'global_macro' ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'}`}>
                        <p className="text-sm text-slate-700">
                          {marketEvent.allowSelling && affectedAssets.length === 0 && '您没有持有相关资产。'}
                          {!marketEvent.allowSelling && gameState.currentEvent.type === 'inflation' && '生活成本上升，注意控制支出。'}
                          {!marketEvent.allowSelling && gameState.currentEvent.type === 'opportunity' && '经济形势向好，把握机会。'}
                          {!marketEvent.allowSelling && gameState.currentEvent.type === 'global_macro' && `宏观政策已生效，房贷月供倍率将升至 ×${((gameState.mortgageMultiplier ?? 1.0) * (((gameState.currentEvent as MarketEvent) as any).globalMacro?.changeRate ?? 1.0)).toFixed(2)}。`}
                        </p>
                      </div>
                    );
                  }

                  return null;
                })()}

                <button
                  onClick={onHandleMarketEvent}
                  className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-xl transition"
                >
                  {((gameState.currentEvent as MarketEvent).allowSelling && getAffectedAssets(gameState, gameState.currentEvent as MarketEvent).length > 0) ? '继续持有 / 关闭' : '确认'}
                </button>
              </>

            ) : (gameState.currentEvent.type === 'SmallDeal' || gameState.currentEvent.type === 'BigDeal') ? (
              <>
                <div className="mb-4">
                  <div className={`inline-block px-3 py-1 text-sm font-semibold rounded-full mb-3 ${gameState.currentEvent.type === 'BigDeal' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {gameState.currentEvent.type === 'BigDeal' ? '大买卖机会' : '投资机会'}
                  </div>
                  {gameState.currentEvent.subtype && (
                    <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${gameState.currentEvent.subtype === 'Income' ? 'bg-green-100 text-green-700' : gameState.currentEvent.subtype === 'Growth' ? 'bg-blue-100 text-blue-700' : gameState.currentEvent.subtype === 'Speculative' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                      {gameState.currentEvent.subtype === 'Income' ? '收入型' : gameState.currentEvent.subtype === 'Growth' ? '成长型' : gameState.currentEvent.subtype === 'Speculative' ? '投机型' : '稳健型'}
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-slate-800 mb-2 mt-2">{gameState.currentEvent.name}</h3>
                  <p className="text-slate-600 text-sm mb-4">{gameState.currentEvent.description}</p>
                </div>

                {/* Stock buy quantity input — only for stock opportunity cards */}
                {isStockOpportunity ? (
                  <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
                    <h4 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
                      <BarChart2 size={16} className="text-blue-500" />
                      买入股票
                    </h4>
                    <div className="flex justify-between text-xs text-slate-600 mb-3">
                      <span>单价: <strong className="text-blue-600">${stockCardPrice}/股</strong></span>
                      <span>可用现金: <strong className="text-green-600">${gameState.cash.toLocaleString()}</strong></span>
                      <span>最多可买: <strong>{stockMaxBuyable} 股</strong></span>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max={stockMaxBuyable}
                        value={stockBuyQty}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          setStockBuyQty(v);
                        }}
                        placeholder="输入买入股数"
                        className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                      />
                      {stockBuyQtyNum > 0 && (
                        <div className={`flex justify-between items-center p-2 rounded-lg text-sm ${stockBuyInvalid ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                          <span className="text-slate-600">合计金额:</span>
                          <span className={`font-bold ${stockBuyInvalid ? 'text-red-600' : 'text-green-600'}`}>
                            ${stockBuyTotal.toLocaleString()}
                            {stockBuyInvalid && ' (资金不足)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">总价值：</span>
                      <span className="font-semibold">${gameState.currentEvent.totalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">首付款：</span>
                      <span className="font-semibold text-amber-600">${gameState.currentEvent.downPayment.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-slate-500">每月收益：</span>
                      <span className={`font-bold ${gameState.currentEvent.monthlyIncome >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {gameState.currentEvent.monthlyIncome >= 0 ? '+' : ''}${gameState.currentEvent.monthlyIncome.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {leverageBlocked && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-700 text-sm font-semibold">杠杆超限，当前无法购买资产。请先还清部分贷款。</p>
                  </div>
                )}

                {!leverageBlocked && !isStockOpportunity && gameState.cash < gameState.currentEvent.downPayment && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowOpportunityLoanDialog(true)}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 text-sm"
                    >
                      <DollarSign size={18} />
                      申请银行贷款
                    </button>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={onDeclineOpportunity}
                    className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition text-sm"
                  >
                    放弃
                  </button>
                  <button
                    onClick={onBuyOpportunity}
                    disabled={
                      leverageBlocked ||
                      (isStockOpportunity ? stockBuyInvalid || stockBuyQtyNum <= 0 : gameState.cash < gameState.currentEvent.downPayment)
                    }
                    className={`flex-1 px-4 py-3 font-semibold rounded-xl transition text-sm ${
                      !leverageBlocked && (isStockOpportunity ? !stockBuyInvalid && stockBuyQtyNum > 0 : gameState.cash >= gameState.currentEvent.downPayment)
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {leverageBlocked ? '已超杠杆' : isStockOpportunity ? (stockBuyQtyNum > 0 ? `确认购买 ${stockBuyQtyNum} 股` : '输入买入数量') : gameState.cash >= gameState.currentEvent.downPayment ? '购买' : '资金不足'}
                  </button>
                </div>
              </>

            ) : (
              /* Doodad event */
              <>
                <div className="mb-4">
                  <div className="inline-block px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full mb-3">额外支出</div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">{gameState.currentEvent.name}</h3>
                  <p className="text-slate-600 text-sm mb-4">{gameState.currentEvent.description}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 mb-4 border border-red-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={18} className="text-red-600" />
                      <span className="text-slate-700 font-medium text-sm">支出金额：</span>
                    </div>
                    <span className="font-bold text-red-600 text-xl">-${'cost' in gameState.currentEvent ? (gameState.currentEvent.cost as number).toLocaleString() : 0}</span>
                  </div>
                </div>
                <button onClick={onPayDoodad} className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition">
                  确认支付
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Downsized event */}
      {gameState?.currentSpecialEvent === 'downsized' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl shadow-2xl p-6 rounded-t-2xl">
            <div className="inline-block px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full mb-3">失业危机</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">你失业了！</h3>
            <div className="bg-red-50 rounded-xl p-4 mb-4 border border-red-200 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-700">立即惩罚（10%现金）：</span>
                <span className="font-bold text-red-600">-${Math.floor(Math.max(0, gameState.cash) * 0.1).toLocaleString()}</span>
              </div>
              <div className="border-t border-red-200 pt-2">
                {gameState.isMultiplayer ? (
                  <p className="text-slate-700">多人模式：跳过 2 个回合</p>
                ) : (
                  <p className="text-slate-700">单机模式：经过发薪格 2 次不发工资</p>
                )}
              </div>
            </div>
            <button onClick={onHandleDownsized} className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition">
              接受现实
            </button>
          </div>
        </div>
      )}

      {/* Charity event */}
      {gameState?.currentSpecialEvent === 'charity' && financials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl shadow-2xl p-6 rounded-t-2xl">
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-pink-100 text-pink-800 text-sm font-semibold rounded-full mb-3">
              <Heart size={14} />
              慈善
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">慈善机会</h3>
            <p className="text-slate-600 text-sm mb-4">捐赠总收入的10%，获得接下来3个回合掷2个骰子的特权。</p>
            <div className="bg-pink-50 rounded-xl p-4 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-700">捐赠金额：</span>
                <span className="font-bold text-pink-600">${Math.floor(financials.totalIncome * 0.1).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => onHandleCharity(false)} className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition text-sm">拒绝</button>
              <button
                onClick={() => onHandleCharity(true)}
                disabled={gameState.cash < Math.floor(financials.totalIncome * 0.1)}
                className={`flex-1 px-4 py-3 font-semibold rounded-xl transition text-sm ${gameState.cash >= Math.floor(financials.totalIncome * 0.1) ? 'bg-pink-600 hover:bg-pink-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                捐赠
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Baby event — info only, no payment */}
      {gameState?.currentSpecialEvent === 'baby' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl shadow-2xl p-6 rounded-t-2xl">
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-sky-100 text-sky-800 text-sm font-semibold rounded-full mb-3">
              <BabyIcon size={14} />
              孩子
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">恭喜！你有了一个孩子</h3>
            {gameState.children >= 3 ? (
              <p className="text-slate-600 text-sm mb-4">你已经有3个孩子了，家庭圆满！</p>
            ) : (
              <>
                <p className="text-slate-600 text-sm mb-4">你的家庭增加了新成员！每月支出会增加。</p>
                <div className="bg-sky-50 rounded-xl p-4 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-700">新增月支出：</span>
                    <span className="font-bold text-sky-600">+${gameState.professionData.childExpense.toLocaleString()}</span>
                  </div>
                </div>
              </>
            )}
            <button onClick={onHandleBaby} className="w-full px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl transition">
              确认
            </button>
          </div>
        </div>
      )}

      {/* Dream event */}
      {gameState?.currentSpecialEvent === 'dream' && gameState?.selectedDream && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl shadow-2xl p-6 rounded-t-2xl">
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-100 text-cyan-800 text-sm font-semibold rounded-full mb-3">
              <Star size={14} />
              梦想格
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{gameState.selectedDream.name}</h3>
            <p className="text-slate-600 text-sm mb-4">{gameState.selectedDream.description}</p>
            <div className="bg-cyan-50 rounded-xl p-4 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-700">梦想价格：</span>
                <span className="font-bold text-cyan-600 text-lg">${gameState.selectedDream.cost.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => onHandleDream(false)} className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition text-sm">放弃</button>
              <button
                onClick={() => onHandleDream(true)}
                disabled={gameState.cash < gameState.selectedDream.cost}
                className={`flex-1 px-4 py-3 font-semibold rounded-xl transition text-sm ${gameState.cash >= gameState.selectedDream.cost ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                {gameState.cash >= gameState.selectedDream.cost ? '购买' : '资金不足'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Winner screen */}
      {gameState?.currentSpecialEvent === 'winner' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">恭喜获胜！</h2>
            <p className="text-slate-600 mb-6">你成功实现了财务自由，完成了梦想！</p>
            <div className="bg-gradient-to-r from-yellow-50 to-cyan-50 rounded-xl p-4 mb-6 border border-yellow-200">
              <p className="font-semibold text-slate-700">最终现金: ${gameState.cash.toLocaleString()}</p>
              <p className="font-semibold text-slate-700">月现金流: ${financials.monthlyCashFlow.toLocaleString()}</p>
              <p className="font-semibold text-slate-700">操作步数: {gameState.actionStep}</p>
            </div>
            <button
              onClick={() => { setShowActionLog(false); setShowFullLog(true); }}
              className="w-full mb-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
            >
              查看完整回溯报告
            </button>
          </div>
        </div>
      )}

      {/* Full retrospective log overlay */}
      {showFullLog && (
        <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
          <div className="flex justify-between items-center p-4 bg-slate-800 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ScrollText size={22} />
              完整回溯报告 — {gameState.actionLog.length} 条操作
            </h2>
            <button onClick={() => setShowFullLog(false)} className="text-slate-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-4 space-y-2">
            {gameState.actionLog.map((entry: ActionLogEntry, idx: number) => (
              <div key={entry.id} className={`p-3 rounded-xl text-sm border ${entry.type === 'positive' ? 'bg-green-900 border-green-700 text-green-100' : entry.type === 'negative' ? 'bg-red-900 border-red-700 text-red-100' : 'bg-slate-800 border-slate-600 text-slate-200'}`}>
                <div className="flex justify-between gap-2">
                  <span className="text-xs text-slate-400 shrink-0">#{idx + 1}</span>
                  <span className="flex-1">{entry.message}</span>
                  {entry.cashChange !== 0 && (
                    <span className={`shrink-0 font-bold ${entry.cashChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {entry.cashChange > 0 ? '+' : ''}${entry.cashChange.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex gap-3 mt-1 text-xs text-slate-500">
                  <span>步 {entry.step}</span>
                  <span>现金流 ${entry.cashFlow.toLocaleString()}</span>
                  <span>被动收入 ${entry.passiveIncome.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-slate-800 border-t border-slate-700">
            <button
              onClick={handleRestartGame}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
            >
              重新开始游戏
            </button>
          </div>
        </div>
      )}

      {/* Loan dialog */}
      {showLoanDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl shadow-2xl p-6 rounded-t-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">银行贷款</h3>
              <button onClick={() => setShowLoanDialog(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <p className="text-slate-500 text-sm mb-4">贷款金额必须是1000的倍数，月利息为贷款金额的10%。</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">贷款金额</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={loanAmount}
                onChange={e => setLoanAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="输入金额（如：5000）"
                step="1000"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            {loanAmount && parseInt(loanAmount) > 0 && (
              <div className="bg-orange-50 rounded-xl p-4 mb-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">贷款金额：</span>
                  <span className="font-semibold">${parseInt(loanAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>月利息：</span>
                  <span className="font-semibold">${(parseInt(loanAmount) * 0.1).toLocaleString()}</span>
                </div>
              </div>
            )}
            {(() => {
              if (!loanAmount || parseInt(loanAmount) <= 0) return null;
              const check = canTakeLoan(gameState, parseInt(loanAmount));
              if (!check.canTake) return (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">{check.reason}</div>
              );
              return null;
            })()}
            <button
              onClick={onTakeLoan}
              disabled={!loanAmount || parseInt(loanAmount) <= 0 || parseInt(loanAmount) % 1000 !== 0 || !canTakeLoan(gameState, parseInt(loanAmount) || 0).canTake}
              className={`w-full px-4 py-3 font-semibold rounded-xl transition ${loanAmount && parseInt(loanAmount) > 0 && parseInt(loanAmount) % 1000 === 0 && canTakeLoan(gameState, parseInt(loanAmount)).canTake ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              确认贷款
            </button>
          </div>
        </div>
      )}

      {/* Opportunity loan dialog */}
      {showOpportunityLoanDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl shadow-2xl p-6 rounded-t-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">申请银行贷款</h3>
              <button onClick={() => setShowOpportunityLoanDialog(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <p className="text-slate-500 text-sm mb-4">贷款金额必须是$1000的倍数，月利息为贷款金额的10%。</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">贷款金额</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={opportunityLoanAmount}
                onChange={e => setOpportunityLoanAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="输入金额（如：5000）"
                step="1000"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {opportunityLoanAmount && parseInt(opportunityLoanAmount) > 0 && (
              <>
                <div className="bg-blue-50 rounded-xl p-4 mb-4 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-slate-600">贷款金额：</span><span className="font-semibold">${parseInt(opportunityLoanAmount).toLocaleString()}</span></div>
                  <div className="flex justify-between text-red-600"><span>月利息：</span><span className="font-semibold">${(parseInt(opportunityLoanAmount) * 0.1).toLocaleString()}</span></div>
                </div>
                {!canTakeLoan(gameState, parseInt(opportunityLoanAmount)).canTake && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
                    {canTakeLoan(gameState, parseInt(opportunityLoanAmount)).reason}
                  </div>
                )}
              </>
            )}
            <button
              onClick={onTakeOpportunityLoan}
              disabled={!opportunityLoanAmount || parseInt(opportunityLoanAmount) <= 0 || parseInt(opportunityLoanAmount) % 1000 !== 0 || !canTakeLoan(gameState, parseInt(opportunityLoanAmount) || 0).canTake}
              className={`w-full px-4 py-3 font-semibold rounded-xl transition ${opportunityLoanAmount && parseInt(opportunityLoanAmount) > 0 && parseInt(opportunityLoanAmount) % 1000 === 0 && canTakeLoan(gameState, parseInt(opportunityLoanAmount)).canTake ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              确认贷款
            </button>
          </div>
        </div>
      )}

      {/* Restart confirm dialog */}
      {showRestartDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={22} className="text-red-600" />
              <h3 className="text-xl font-bold text-slate-800">确认重新开始？</h3>
            </div>
            <p className="text-slate-600 text-sm mb-4">所有进度（现金、资产、贷款、日志）将被清除，无法撤销。</p>
            <div className="flex gap-3">
              <button onClick={() => setShowRestartDialog(false)} className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition text-sm">取消</button>
              <button onClick={handleRestartGame} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition text-sm">确认重新开始</button>
            </div>
          </div>
        </div>
      )}

      {/* Room join dialog */}
      {showRoomDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl shadow-2xl p-6 rounded-t-2xl">
            <div className="flex items-center gap-3 mb-6">
              <LogIn size={28} className="text-blue-600" />
              <h2 className="text-xl font-bold text-slate-800">加入游戏房间</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">你的昵称</label>
                <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="输入昵称" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" onKeyDown={e => e.key === 'Enter' && handleJoinRoom()} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">房间号</label>
                <input type="text" value={roomInput} onChange={e => setRoomInput(e.target.value)} placeholder="输入房间号 (如: room123)" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" onKeyDown={e => e.key === 'Enter' && handleJoinRoom()} />
              </div>
              <button
                onClick={handleJoinRoom}
                disabled={!roomInput.trim() || !playerName.trim()}
                className={`w-full px-6 py-3 font-bold rounded-xl shadow transition ${roomInput.trim() && playerName.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                加入房间（多人模式）
              </button>
              <div className="pt-2 border-t">
                <button onClick={skipMultiplayer} className="w-full px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition">
                  单机模式（无需房间）
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile financial drawer */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-slate-200 z-30 shadow-lg">
        <button
          onClick={() => setShowFinancialDrawer(!showFinancialDrawer)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span className={`text-lg font-bold ${gameState.cash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${gameState.cash.toLocaleString()}
            </span>
            <span className={`text-sm ${financials.monthlyCashFlow >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
              现金流 ${financials.monthlyCashFlow.toLocaleString()}/月
            </span>
          </div>
          <div className="flex items-center gap-2">
            {leverageBlocked && <AlertCircle size={18} className="text-red-500" />}
            {showFinancialDrawer ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronUp size={20} className="text-slate-400" />}
          </div>
        </button>

        {showFinancialDrawer && (
          <div className="px-4 pb-4 space-y-2 bg-white border-t border-slate-100">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-50 rounded-lg p-2 text-center">
                <div className="text-slate-500">工资</div>
                <div className="font-bold">${financials.salary.toLocaleString()}</div>
              </div>
              <div className={`rounded-lg p-2 text-center ${financials.passiveIncome > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                <div className="text-slate-500">被动</div>
                <div className={`font-bold ${financials.passiveIncome > 0 ? 'text-amber-600' : ''}`}>${financials.passiveIncome.toLocaleString()}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-2 text-center">
                <div className="text-slate-500">支出</div>
                <div className="font-bold">${financials.totalExpenses.toLocaleString()}</div>
              </div>
            </div>
            {leverageBlocked && (
              <div className="p-2 bg-red-50 rounded-lg text-xs text-red-700 font-semibold">
                杠杆超限！已锁定投资购买功能
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
