import { AlertCircle, Briefcase, Star } from 'lucide-react';
import { dreams } from '../config/dreams';
import { professions } from '../config/professions';

interface SetupDialogProps {
  initError: string | null;
  selectedProfession: string;
  selectedDream: string;
  onClearError: () => void;
  onSelectProfession: (professionId: string) => void;
  onSelectDream: (dreamId: string) => void;
  onStartGame: () => void;
}

export function SetupDialog({
  initError,
  selectedProfession,
  selectedDream,
  onClearError,
  onSelectProfession,
  onSelectDream,
  onStartGame,
}: SetupDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <h2 className="text-3xl font-bold text-slate-800 mb-6 text-center">现金流游戏</h2>

        {initError && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle size={20} />
              <span className="font-semibold">错误: {initError}</span>
            </div>
            <button onClick={onClearError} className="mt-2 text-sm text-red-600 hover:text-red-700 underline">关闭</button>
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
                onClick={() => onSelectProfession(key)}
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
                onClick={() => onSelectDream(dream.id)}
                className={`p-4 rounded-xl border-2 transition text-left ${selectedDream === dream.id ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <p className="font-semibold text-slate-800">{dream.name}</p>
                <p className="text-sm text-slate-600">${dream.cost.toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onStartGame}
          disabled={!selectedProfession || !selectedDream}
          className={`w-full px-6 py-4 font-bold rounded-xl shadow-lg transform transition text-lg ${selectedProfession && selectedDream ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
        >
          开始游戏
        </button>
      </div>
    </div>
  );
}
