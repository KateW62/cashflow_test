import { Profession } from '../config/professions';
import { SmallDealCard, BigDealCard, DoodadCard } from '../config/cards';
import { Dream } from '../config/dreams';
import { MarketEvent } from '../config/marketEvents';

export type GameTrack = 'rat_race' | 'fast_track';

export type SpaceType = 'Payday' | 'Opportunity' | 'Doodad' | 'Market' | 'Downsized' | 'Charity' | 'Baby' | 'BigDeal' | 'Dream';

export interface GameSpace {
  id: number;
  type: SpaceType;
}

export interface Asset {
  id: string;
  name: string;
  category: string;
  subtype?: 'Income' | 'Growth' | 'Speculative' | 'Stable';
  tags: string[];
  symbol?: string; // 新增：用于匹配股票代码或资产标识
  cost: number;
  downPayment: number;
  weeklyIncome: number; // 语义化修改：从 monthly 改为 weekly
  purchaseDate: string;
  shares?: number;
  sharePrice?: number;
}

export interface Loan {
  id: string;
  amount: number;
  weeklyInterest: number; // 语义化修改：从 monthly 改为 weekly
  takenDate: string;
}

export interface PlayerStatus {
  isDownsized: boolean;
  downsizedTurnsRemaining: number;
  unemploymentPaydayCount: number;
  unemploymentCount: number;
  hasCharityBonus: boolean;
  charityTurnsRemaining: number;
}

export interface ActionLogEntry {
  id: string;
  step: number;
  message: string;
  cashChange: number;
  weeklyCashFlow: number; // 语义化修改
  passiveIncome: number;
  // 增强：更细致的分类以便回溯时着色
  type: 'income' | 'expense' | 'asset_buy' | 'asset_sell' | 'loan' | 'system' | 'positive' | 'negative' | 'neutral';
  timestamp: string;
}

export interface StockPrice {
  tag: string;
  price: number;
}

export interface GameState {
  track: GameTrack;
  profession: string;
  professionData: Profession;
  cash: number;
  children: number;
  selectedDream: Dream | null;
  assets: Asset[];
  loans: Loan[];
  currentPosition: number;
  gameBoard: GameSpace[];
  lastRoll: number;
  currentEvent: SmallDealCard | BigDealCard | DoodadCard | MarketEvent | null;
  currentSpecialEvent: 'downsized' | 'charity' | 'baby' | 'dream' | 'winner' | 'unemployed' | null; // 精确化
  canRoll: boolean;
  status: PlayerStatus;
  paydayMessage?: string;
  inflationMultiplier: number;
  mortgageMultiplier: number; // 去掉可选，强制初始化
  marketPrices: StockPrice[];
  actionLog: ActionLogEntry[];
  actionStep: number;
  isMultiplayer: boolean;
}