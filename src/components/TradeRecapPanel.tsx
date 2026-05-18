import { ArrowDownRight, ArrowUpRight, Briefcase, LineChart, ReceiptText, TrendingDown, TrendingUp } from 'lucide-react';

export type TradeRecapKind = 'buy' | 'sell' | 'dividend' | 'liquidation' | 'operation' | 'market';

export interface TradeRecapItem {
  id: string;
  kind: TradeRecapKind;
  assetName: string;
  symbol?: string;
  quantity?: number;
  pricePerUnit?: number;
  totalAmount: number;
  costBasis?: number;
  realizedGain?: number;
  cashAfter?: number;
  note?: string;
  step?: number;
}

interface TradeRecapPanelProps {
  trades: TradeRecapItem[];
  title?: string;
  emptyText?: string;
  maxItems?: number;
}

const kindLabels: Record<TradeRecapKind, string> = {
  buy: '买入',
  sell: '卖出',
  dividend: '现金流',
  liquidation: '清算',
  operation: '经营',
  market: '市场',
};

function formatMoney(value: number, signed = false) {
  const prefix = signed && value > 0 ? '+' : '';
  return `${prefix}$${Math.round(value).toLocaleString()}`;
}

function getKindStyle(kind: TradeRecapKind) {
  if (kind === 'buy') return 'bg-blue-50 text-blue-700 border-blue-100';
  if (kind === 'sell') return 'bg-green-50 text-green-700 border-green-100';
  if (kind === 'liquidation') return 'bg-red-50 text-red-700 border-red-100';
  if (kind === 'operation') return 'bg-indigo-50 text-indigo-700 border-indigo-100';
  if (kind === 'market') return 'bg-teal-50 text-teal-700 border-teal-100';
  return 'bg-amber-50 text-amber-700 border-amber-100';
}

function getGainStyle(value?: number) {
  if (value == null || value === 0) return 'text-slate-500';
  return value > 0 ? 'text-green-600' : 'text-red-500';
}

export function TradeRecapPanel({
  trades,
  title = '交易复盘',
  emptyText = '暂无交易记录',
  maxItems = 5,
}: TradeRecapPanelProps) {
  const visibleTrades = trades.slice(0, maxItems);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-700">
          <ReceiptText size={18} className="text-emerald-500" />
          {title}
        </h3>
        {trades.length > 0 && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
            {trades.length} 笔
          </span>
        )}
      </div>

      {visibleTrades.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleTrades.map(trade => {
            const isPositive = trade.realizedGain != null && trade.realizedGain > 0;
            const GainIcon = isPositive ? TrendingUp : TrendingDown;
            const CashIcon = trade.kind === 'operation'
              ? Briefcase
              : trade.kind === 'market'
                ? LineChart
                : trade.kind === 'buy'
                  ? ArrowDownRight
                  : ArrowUpRight;

            return (
              <article key={trade.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getKindStyle(trade.kind)}`}>
                        {kindLabels[trade.kind]}
                      </span>
                      {trade.step != null && <span className="text-xs text-slate-400">第 {trade.step} 步</span>}
                    </div>
                    <h4 className="mt-2 truncate text-sm font-semibold text-slate-800">
                      {trade.assetName}
                      {trade.symbol && <span className="ml-1 text-slate-400">({trade.symbol})</span>}
                    </h4>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      {trade.quantity != null && <span>数量 {trade.quantity.toLocaleString()}</span>}
                      {trade.pricePerUnit != null && <span>单价 {formatMoney(trade.pricePerUnit)}</span>}
                      {trade.costBasis != null && <span>成本 {formatMoney(trade.costBasis)}</span>}
                    </div>
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    <div className="flex items-center gap-1 text-sm font-bold text-slate-800 sm:justify-end">
                      <CashIcon size={15} className={trade.kind === 'buy' ? 'text-blue-500' : trade.kind === 'operation' ? 'text-indigo-500' : trade.kind === 'market' ? 'text-teal-500' : 'text-green-500'} />
                      {formatMoney(trade.totalAmount)}
                    </div>
                    {trade.realizedGain != null && (
                      <div className={`mt-1 flex items-center gap-1 text-xs font-semibold sm:justify-end ${getGainStyle(trade.realizedGain)}`}>
                        <GainIcon size={13} />
                        {formatMoney(trade.realizedGain, true)}
                      </div>
                    )}
                  </div>
                </div>

                {(trade.note || trade.cashAfter != null) && (
                  <div className="mt-3 flex flex-col gap-1 border-t border-slate-200 pt-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    {trade.note && <span className="min-w-0 truncate">{trade.note}</span>}
                    {trade.cashAfter != null && <span className="shrink-0 font-medium">交易后现金 {formatMoney(trade.cashAfter)}</span>}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
