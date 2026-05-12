import { X } from 'lucide-react';
import { GameState } from '../logic/gameTypes';
import { canTakeLoan } from '../logic/gameLogic';

interface LoanDialogProps {
  gameState: GameState;
  title: string;
  amount: string;
  accent: 'orange' | 'blue';
  onAmountChange: (amount: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function LoanDialog({
  gameState,
  title,
  amount,
  accent,
  onAmountChange,
  onClose,
  onConfirm,
}: LoanDialogProps) {
  const numericAmount = parseInt(amount) || 0;
  const hasAmount = numericAmount > 0;
  const loanCheck = hasAmount ? canTakeLoan(gameState, numericAmount) : null;
  const canConfirm = hasAmount && numericAmount % 1000 === 0 && loanCheck?.canTake;
  const buttonClass = accent === 'orange'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';
  const focusClass = accent === 'orange' ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
  const summaryClass = accent === 'orange' ? 'bg-orange-50' : 'bg-blue-50';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
      <div className="bg-white w-full md:max-w-md md:rounded-2xl shadow-2xl p-6 rounded-t-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>
        <p className="text-slate-500 text-sm mb-4">贷款金额必须是1000的倍数，月利息为贷款金额的10%。</p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">贷款金额</label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={amount}
            onChange={e => onAmountChange(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="输入金额（如：5000）"
            step="1000"
            className={`w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 ${focusClass}`}
          />
        </div>
        {hasAmount && (
          <div className={`${summaryClass} rounded-xl p-4 mb-4 text-sm space-y-1`}>
            <div className="flex justify-between">
              <span className="text-slate-600">贷款金额：</span>
              <span className="font-semibold">${numericAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>月利息：</span>
              <span className="font-semibold">${(numericAmount * 0.1).toLocaleString()}</span>
            </div>
          </div>
        )}
        {loanCheck && !loanCheck.canTake && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">{loanCheck.reason}</div>
        )}
        <button
          onClick={onConfirm}
          disabled={!canConfirm}
          className={`w-full px-4 py-3 font-semibold rounded-xl transition ${canConfirm ? buttonClass : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
        >
          确认贷款
        </button>
      </div>
    </div>
  );
}
