import { useState, useEffect } from 'react';
import '../styles/electric-velocity.css';

interface ThreeDDiceProps {
  values: number[];
  isRolling: boolean;
  className?: string;
}

export function ThreeDDice({ values, isRolling, className = '' }: ThreeDDiceProps) {
  const [displayValues, setDisplayValues] = useState<number[]>([]);
  
  // Update display when values change
  useEffect(() => {
    if (values.length > 0) {
      setDisplayValues(values);
    }
  }, [values]);

  const renderDiceDots = (value: number) => {
    const dots: JSX.Element[] = [];
    const positions: { [key: number]: number[] } = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8]
    };

    for (let i = 0; i < 9; i++) {
      const hasDot = positions[value].includes(i);
      dots.push(
        <div
          key={i}
          className={`dot ${hasDot ? '' : 'opacity-0'}`}
          style={{ gridArea: `${Math.floor(i / 3) + 1} / ${(i % 3) + 1}` }}
        />
      );
    }

    return dots;
  };

  return (
    <div className={`flex gap-4 justify-center ${className}`}>
      {(displayValues.length > 0 ? displayValues : [1, 1]).map((value, index) => (
        <div
          key={index}
          className={`dice-3d ${isRolling ? 'rolling' : ''}`}
          style={{
            transform: isRolling 
              ? `rotateX(${Math.random() * 360}deg) rotateY(${Math.random() * 360}deg)` 
              : undefined,
          }}
        >
          <div className="dice-face">
            <div className="dots-container">
              {renderDiceDots(value)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ThreeDDice;