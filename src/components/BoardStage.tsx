import type { GameState } from '../logic/gameTypes';

interface BoardStageProps {
  gameState: GameState;
  getSpaceColor: (spaceType: string) => string;
  getSpaceLabel: (spaceType: string) => string;
}

export function BoardStage({ gameState, getSpaceColor, getSpaceLabel }: BoardStageProps) {
  const currentSpace = gameState.gameBoard[gameState.currentPosition];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 pb-40 pt-4 md:px-6 md:pb-36">
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-lg md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-800 md:text-xl">游戏棋盘</h2>
            <p className="text-xs text-slate-500 md:text-sm">
              当前位置 {gameState.currentPosition + 1}/{gameState.gameBoard.length} · {getSpaceLabel(currentSpace.type)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-100 px-3 py-2 text-right">
            <div className="text-[11px] text-slate-500">上次掷骰</div>
            <div className="text-lg font-bold text-slate-800">{gameState.lastRoll || '-'}</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:gap-3">
          {gameState.gameBoard.map((space) => {
            const isCurrent = space.id === gameState.currentPosition;
            return (
              <div
                key={space.id}
                className={`aspect-square min-h-[54px] rounded-2xl border text-xs font-bold transition md:min-h-[72px] ${
                  isCurrent
                    ? 'scale-[1.03] border-red-400 bg-red-50 text-red-700 shadow-md ring-4 ring-red-100'
                    : `${getSpaceColor(space.type)} border-transparent text-white shadow-sm`
                }`}
                title={getSpaceLabel(space.type)}
              >
                <div className="flex h-full flex-col items-center justify-center gap-1 px-1 text-center">
                  {isCurrent ? (
                    <>
                      <span className="h-3 w-3 rounded-full bg-red-500" />
                      <span>{getSpaceLabel(space.type)}</span>
                    </>
                  ) : (
                    <span>{getSpaceLabel(space.type)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {(gameState.operationEffects || []).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {gameState.operationEffects.map(effect => (
              <span key={effect.id} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {effect.source || effect.type} · {effect.remainingTurns} 回合
              </span>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
