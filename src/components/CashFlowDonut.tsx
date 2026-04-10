import { useEffect, useRef } from 'react';
import { Financials } from '../logic/gameLogic';

interface CashFlowDonutProps {
  financials: Financials;
}

export default function CashFlowDonut({ financials }: CashFlowDonutProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const size = 200;
    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 70;
    const innerRadius = 45;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Define segments
    const segments = [
      { 
        label: '被动收入', 
        value: financials.passiveIncome, 
        color: '#10b981',
        glow: '#34d399'
      },
      { 
        label: '其他支出', 
        value: Math.max(0, financials.totalExpenses - financials.passiveIncome), 
        color: '#f43f5e',
        glow: '#fb7185'
      },
      { 
        label: '现金流结余', 
        value: Math.max(0, financials.monthlyCashFlow), 
        color: '#7e51ff',
        glow: '#b6a0ff'
      }
    ].filter(s => s.value > 0); // Only show positive values

    const total = segments.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) {
      // Draw empty state
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(126, 81, 255, 0.2)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText('暂无现金流数据', centerX, centerY);
      return;
    }

    let angle = -Math.PI / 2; // Start from top
    const angleStep = (2 * Math.PI) / total;

    // Draw donut segments
    segments.forEach((segment) => {
      const segmentAngle = (segment.value / total) * 2 * Math.PI;

      // Draw segment
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, angle, angle + segmentAngle);
      ctx.arc(centerX, centerY, innerRadius, angle + segmentAngle, angle, true);
      ctx.closePath();

      // Add glow effect
      const gradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, radius);
      gradient.addColorStop(0, segment.color + '40');
      gradient.addColorStop(1, segment.color);
      
      ctx.fillStyle = gradient;
      ctx.fill();

      // Add outer glow
      ctx.shadowColor = segment.glow;
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow

      // Draw border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Move to next segment
      angle += segmentAngle;
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(182, 160, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw center text
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('现金流', centerX, centerY - 10);
    
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText(`$${financials.monthlyCashFlow.toLocaleString()}`, centerX, centerY + 10);

    // Draw legend
    let legendY = size - 40;
    segments.slice(0, 3).forEach((segment) => {
      const percentage = ((segment.value / total) * 100).toFixed(1);
      
      // Color box
      ctx.fillStyle = segment.color;
      ctx.fillRect(10, legendY - 6, 12, 12);
      
      // Label
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.fillText(`${segment.label}: $${segment.value.toLocaleString()} (${percentage}%)`, 28, legendY + 2);
      
      legendY -= 16;
    });
  }, [financials]);

  return (
    <div className="cashflow-donut">
      <canvas 
        ref={canvasRef} 
        className="donut-chart"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="ev-card p-2 rounded-lg text-center">
          <div className="text-emerald-400 font-semibold">${financials.passiveIncome.toLocaleString()}</div>
          <div className="ev-text-secondary">被动/月</div>
        </div>
        <div className="ev-card p-2 rounded-lg text-center">
          <div className={`font-semibold ${financials.monthlyCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ${financials.monthlyCashFlow.toLocaleString()}
          </div>
          <div className="ev-text-secondary">现金流/月</div>
        </div>
      </div>
    </div>
  );
}