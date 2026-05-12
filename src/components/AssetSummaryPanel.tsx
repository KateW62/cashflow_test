import { BarChart2, Building2 } from 'lucide-react';
import type { Asset, GameState, StockPrice } from '../logic/gameTypes';

interface AssetSummaryPanelProps {
  gameState: GameState;
}

interface StockGroup {
  kind: 'stock';
  key: string;
  symbol: string;
  name: string;
  count: number;
  totalShares: number;
  totalCost: number;
  averageCost: number;
  currentPrice: number | null;
  unrealizedGain: number | null;
}

interface CategoryGroup {
  kind: 'category';
  key: string;
  category: string;
  count: number;
  names: string[];
  totalCost: number;
  totalDownPayment: number;
  weeklyIncome: number;
}

type AssetGroup = StockGroup | CategoryGroup;

const STOCK_TAGS = ['MYT4U', 'OK4U', 'MYJT', 'Stock'];

function isStock(asset: Asset) {
  return asset.category === 'stock' || (asset.tags || []).some(tag => STOCK_TAGS.includes(tag) || tag.toLowerCase() === 'stock');
}

function getStockSymbol(asset: Asset) {
  return asset.symbol || (asset.tags || []).find(tag => STOCK_TAGS.includes(tag) && tag !== 'Stock') || asset.name;
}

function findMarketPrice(marketPrices: StockPrice[], symbol: string) {
  const normalized = symbol.toLowerCase();
  const market = marketPrices.find(price => {
    const aliases = [price.tag, price.symbol, ...(price.tags || [])].filter(Boolean).map(alias => String(alias).toLowerCase());
    return aliases.includes(normalized);
  });

  return market?.currentPrice ?? market?.price ?? null;
}

function getAssetGroups(gameState: GameState): AssetGroup[] {
  const stockMap = new Map<string, Asset[]>();
  const categoryMap = new Map<string, Asset[]>();

  (gameState.assets || []).forEach(asset => {
    if (isStock(asset)) {
      const symbol = getStockSymbol(asset);
      stockMap.set(symbol, [...(stockMap.get(symbol) || []), asset]);
      return;
    }

    const category = asset.category || 'other';
    categoryMap.set(category, [...(categoryMap.get(category) || []), asset]);
  });

  const stockGroups: StockGroup[] = Array.from(stockMap.entries()).map(([symbol, assets]) => {
    const totalShares = assets.reduce((sum, asset) => sum + (asset.shares || 0), 0);
    const totalCost = assets.reduce((sum, asset) => sum + asset.cost, 0);
    const fallbackPrice = totalShares > 0
      ? Math.round(assets.reduce((sum, asset) => sum + (asset.sharePrice || 0) * (asset.shares || 0), 0) / totalShares)
      : null;
    const currentPrice = findMarketPrice(gameState.marketPrices || [], symbol) ?? fallbackPrice;
    const unrealizedGain = currentPrice != null ? currentPrice * totalShares - totalCost : null;

    return {
      kind: 'stock',
      key: `stock-${symbol}`,
      symbol,
      name: assets[0]?.name || symbol,
      count: assets.length,
      totalShares,
      totalCost,
      averageCost: totalShares > 0 ? Math.round(totalCost / totalShares) : 0,
      currentPrice,
      unrealizedGain,
    };
  });

  const categoryGroups: CategoryGroup[] = Array.from(categoryMap.entries()).map(([category, assets]) => ({
    kind: 'category',
    key: `category-${category}`,
    category,
    count: assets.length,
    names: assets.map(asset => asset.name),
    totalCost: assets.reduce((sum, asset) => sum + asset.cost, 0),
    totalDownPayment: assets.reduce((sum, asset) => sum + asset.downPayment, 0),
    weeklyIncome: assets.reduce((sum, asset) => sum + asset.weeklyIncome, 0),
  }));

  return [...stockGroups, ...categoryGroups];
}

function formatCategory(category: string) {
  const labels: Record<string, string> = {
    stock: '股票',
    realestate: '房地产',
    real_estate: '房地产',
    cd: '存款证',
    business: '生意',
    land: '土地',
    collectibles: '收藏品',
    other: '其它资产',
  };

  return labels[category] || category;
}

export function AssetSummaryPanel({ gameState }: AssetSummaryPanelProps) {
  const groups = getAssetGroups(gameState);

  if (groups.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-5">
      <h3 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <Building2 size={18} className="text-amber-500" />
        资产列表
        <span className="ml-auto text-xs font-medium text-slate-400">{gameState.assets.length} 项合并为 {groups.length} 组</span>
      </h3>
      <div className="space-y-2">
        {groups.map(group => {
          if (group.kind === 'stock') {
            const gainClass = group.unrealizedGain == null
              ? 'text-slate-600'
              : group.unrealizedGain >= 0 ? 'text-green-600' : 'text-red-500';

            return (
              <div key={group.key} className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-1">
                    <BarChart2 size={14} className="text-blue-500 shrink-0" />
                    {group.symbol}
                  </h4>
                  <span className="shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {group.count} 笔持仓
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 truncate">{group.name}</p>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
                  <span>持仓: <strong className="text-slate-700">{group.totalShares.toLocaleString()} 股</strong></span>
                  <span>平均成本: <strong>${group.averageCost}/股</strong></span>
                  <span>当前价: <strong className="text-blue-600">${group.currentPrice ?? '-'}/股</strong></span>
                  <span>浮盈亏: <strong className={gainClass}>{group.unrealizedGain == null ? '-' : `${group.unrealizedGain >= 0 ? '+' : ''}$${group.unrealizedGain.toLocaleString()}`}</strong></span>
                </div>
              </div>
            );
          }

          return (
            <div key={group.key} className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-1">
                  <Building2 size={14} className="text-amber-600 shrink-0" />
                  {formatCategory(group.category)}
                </h4>
                <span className="shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {group.count} 项
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 truncate">{group.names.join('、')}</p>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
                <span>总成本: <strong className="text-slate-700">${group.totalCost.toLocaleString()}</strong></span>
                <span>总首付: <strong>${group.totalDownPayment.toLocaleString()}</strong></span>
                <span className="col-span-2">月收支: <strong className={group.weeklyIncome >= 0 ? 'text-amber-600' : 'text-red-500'}>{group.weeklyIncome >= 0 ? '+' : ''}${(group.weeklyIncome * 4).toLocaleString()}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
