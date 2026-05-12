import { RefObject } from 'react';
import { ScrollText, X } from 'lucide-react';
import { ActionLogEntry } from '../logic/gameTypes';

interface ActionLogPanelProps {
  entries: ActionLogEntry[];
  logEndRef: RefObject<HTMLDivElement>;
  onClose: () => void;
  onOpenFullLog: () => void;
}

export function ActionLogPanel({ entries, logEndRef, onClose, onOpenFullLog }: ActionLogPanelProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-40 p-0 md:p-4">
      <div className="bg-white w-full md:max-w-lg md:rounded-2xl shadow-2xl flex flex-col max-h-[80vh] rounded-t-2xl">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ScrollText size={20} />
            操作日志 ({entries.length} 条)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {entries.length === 0 ? (
            <p className="text-slate-400 text-center py-8">暂无日志</p>
          ) : (
            entries.map((entry) => (
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
                  <span>周现金流: ${entry.weeklyCashFlow.toLocaleString()}</span>
                  <span>被动: ${entry.passiveIncome.toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
        <div className="p-4 border-t">
          <button
            onClick={onOpenFullLog}
            className="w-full px-4 py-2 bg-slate-800 text-white font-semibold rounded-xl transition hover:bg-slate-700 text-sm"
          >
            查看完整回溯报告
          </button>
        </div>
      </div>
    </div>
  );
}
