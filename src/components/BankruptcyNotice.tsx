import { AlertCircle, X } from 'lucide-react';

export interface BankruptcyNoticeData {
  entries?: Array<{
    name?: string;
    assetName?: string;
    amount?: number;
    salePrice?: number;
    debtPaid?: number;
    description?: string;
    sharesSold?: number;
    remainingShares?: number;
    reason?: string;
  }>;
  remainingCash?: number;
}

interface BankruptcyNoticeProps {
  notice?: BankruptcyNoticeData | null;
  onDismiss?: () => void;
}

export function BankruptcyNotice({ notice, onDismiss }: BankruptcyNoticeProps) {
  const entries = notice?.entries || [];

  if (!notice || entries.length === 0) return null;

  return (
    <div className="fixed top-24 left-1/2 z-40 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2">
      <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-red-100 p-2 text-red-600">
            <AlertCircle size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-red-800">破产清算明细</h3>
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="关闭破产清算提示"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
              {entries.map((entry, index) => {
                const label = entry.name || entry.assetName || entry.description || `清算项目 ${index + 1}`;
                const amount = entry.amount ?? entry.salePrice ?? entry.debtPaid;
                const detail = entry.reason || (entry.sharesSold ? `卖出 ${entry.sharesSold} 股` : '');

                return (
                  <div key={`${label}-${index}`} className="text-xs text-slate-600">
                    <div className="flex justify-between gap-3">
                      <span className="truncate">{label}</span>
                      {amount != null && <span className="shrink-0 font-semibold text-red-600">${amount.toLocaleString()}</span>}
                    </div>
                    {detail && <div className="mt-0.5 truncate text-[11px] text-slate-400">{detail}</div>}
                  </div>
                );
              })}
            </div>
            {notice.remainingCash != null && (
              <div className="mt-3 flex justify-between border-t border-red-100 pt-2 text-xs font-semibold text-slate-700">
                <span>清算后现金</span>
                <span>${notice.remainingCash.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
