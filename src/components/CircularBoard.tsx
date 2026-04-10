import { useEffect, useMemo, useState } from 'react';
import { GameBoardSpace } from '../logic/gameLogic';
import '../styles/electric-velocity.css';

interface CircularBoardProps {
  gameBoard: GameBoardSpace[];
  playerPosition: number;
  currentSpace: GameBoardSpace;
  isAnimating?: boolean;
}

interface SpacePosition {
  x: number;
  y: number;
  angle: number;
}

export default function CircularBoard({ 
  gameBoard, 
  playerPosition, 
  currentSpace,
  isAnimating = false 
}: CircularBoardProps) {
  const [dimensions, setDimensions] = useState({ width: 320, height: 320 });
  const [center, setCenter] = useState({ x: 160, y: 160 });
  const [radius, setRadius] = useState(120);

  // Update dimensions based on container size
  useEffect(() => {
    const updateDimensions = () => {
      const isMobile = window.innerWidth < 768;
      const size = isMobile ? 320 : 400;
      setDimensions({ width: size, height: size });
      setCenter({ x: size / 2, y: size / 2 });
      setRadius(isMobile ? 120 : 150);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calculate positions for all spaces on the circle
  const spacePositions = useMemo(() => {
    const positions: SpacePosition[] = [];
    const angleStep = 360 / gameBoard.length;
    
    gameBoard.forEach((_, index) => {
      const angle = (index * angleStep - 90) * (Math.PI / 180); // Start from top
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;
      
      positions.push({
        x: x - 28, // Center the space (56px width / 2)
        y: y - 28, // Center the space (56px height / 2)
        angle: angle * (180 / Math.PI) + 90
      });
    });
    
    return positions;
  }, [gameBoard, center, radius]);

  // Get space type class for styling
  const getSpaceColorClass = (type: string) => {
    const colorMap: Record<string, string> = {
      'Opportunity': 'space-opportunity',
      'Payday': 'space-payday',
      'Doodad': 'space-doodad',
      'Market': 'space-market',
      'Downsized': 'space-downsized',
      'Charity': 'space-charity',
      'Baby': 'space-baby',
      'Dream': 'space-dream',
    };
    return colorMap[type] || 'space-opportunity';
  };

  // Get short label for space
  const getShortLabel = (type: string) => {
    const labelMap: Record<string, string> = {
      'Opportunity': '机会',
      'Payday': '发薪',
      'Doodad': '破财',
      'Market': '市场',
      'Downsized': '失业',
      'Charity': '慈善',
      'Baby': '生子',
      'Dream': '梦想',
    };
    return labelMap[type] || type;
  };

  // Calculate player token position (slightly inset from the space)
  const playerTokenPosition = useMemo(() => {
    if (playerPosition >= spacePositions.length) return center;
    
    const pos = spacePositions[playerPosition];
    const angle = pos.angle * (Math.PI / 180);
    const tokenRadius = radius * 0.8; // Pull token slightly toward center
    const x = center.x + Math.cos(angle) * tokenRadius - 14; // Center token (28px width / 2)
    const y = center.y + Math.sin(angle) * tokenRadius - 14; // Center token (28px height / 2)
    
    return { x, y };
  }, [playerPosition, spacePositions, center, radius]);

  // Add trail effect during animation
  const trailPositions = useMemo(() => {
    if (!isAnimating) return [];
    
    const trail: { x: number; y: number; opacity: number }[] = [];
    const trailLength = 3;
    
    for (let i = 1; i <= trailLength; i++) {
      const trailPos = Math.max(0, playerPosition - i * 2);
      if (trailPos < spacePositions.length) {
        const pos = spacePositions[trailPos];
        const angle = pos.angle * (Math.PI / 180);
        const tokenRadius = radius * 0.8;
        const x = center.x + Math.cos(angle) * tokenRadius - 12;
        const y = center.y + Math.sin(angle) * tokenRadius - 12;
        trail.push({ x, y, opacity: 1 - (i * 0.3) });
      }
    }
    
    return trail;
  }, [isAnimating, playerPosition, spacePositions, center, radius]);

  return (
    <div className="circular-board-container">
      <div 
        className="circular-board"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        {/* Trail effect during animation */}
        {isAnimating && trailPositions.map((pos, index) => (
          <div
            key={`trail-${index}`}
            className="player-token"
            style={{
              left: pos.x,
              top: pos.y,
              opacity: pos.opacity,
              width: '24px',
              height: '24px',
              background: 'rgba(52, 211, 153, 0.3)',
              transform: 'scale(0.8)',
            }}
          />
        ))}

        {/* Game board spaces */}
        {gameBoard.map((space, index) => {
          const position = spacePositions[index];
          if (!position) return null;

          const isCurrent = index === playerPosition;
          const colorClass = getSpaceColorClass(space.type);

          return (
            <div
              key={space.id}
              className={`circular-space ${colorClass} ${isCurrent ? 'current' : ''}`}
              style={{
                left: position.x,
                top: position.y,
                transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
              }}
              title={`${index + 1}. ${space.type}`}
            >
              <span className="text-xs font-bold">
                {getShortLabel(space.type)}
              </span>
              <div className="text-xs opacity-75 mt-1">
                {index + 1}
              </div>
            </div>
          );
        })}

        {/* Player token */}
        <div
          className={`player-token animate-pulse-glow ${isAnimating ? 'animate-shake' : ''}`}
          style={{
            left: playerTokenPosition.x,
            top: playerTokenPosition.y,
            transition: isAnimating 
              ? 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)' 
              : 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <span className="text-xs">P</span>
        </div>

        {/* Center info */}
        <div className="board-center">
          <div className="board-center-title">
            {currentSpace.type}
          </div>
          <div className="board-center-position">
            {playerPosition + 1}
          </div>
          <div className="text-xs text-purple-300 mt-2">
            当前位置
          </div>
        </div>
      </div>

      {/* Board legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span className="ev-text-secondary">机会</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="ev-text-secondary">发薪</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-rose-500" />
          <span className="ev-text-secondary">破财</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span className="ev-text-secondary">市场</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-slate-500" />
          <span className="ev-text-secondary">失业</span>
        </div>
      </div>
    </div>
  );
}