import { useEffect, useRef } from 'react';

interface MarketTrendChartProps {
  width?: number;
  height?: number;
}

interface StockData {
  name: string;
  color: string;
  glow: string;
  values: number[];
}

export default function MarketTrendChart({ 
  width = 300, 
  height = 120 
}: MarketTrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stocks: StockData[] = [
    {
      name: 'OK4U',
      color: '#10b981',
      glow: '#34d399',
      values: [10, 15, 20, 18, 25, 30, 28, 35, 40, 45, 42, 48, 45, 40]
    },
    {
      name: 'MYT4U',
      color: '#7e51ff',
      glow: '#b6a0ff',
      values: [5, 8, 12, 15, 18, 16, 20, 22, 25, 28, 26, 24, 22, 20]
    }
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(182, 160, 255, 0.1)';
    ctx.lineWidth = 1;
    
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = (i / gridLines) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw area chart for each stock
    stocks.forEach((stock, stockIndex) => {
      const stepX = width / (stock.values.length - 1);
      const maxValue = Math.max(...stock.values) * 1.2 || 1;
      const minValue = Math.min(...stock.values);
      const range = maxValue - minValue || 1;

      // Draw area
      ctx.beginPath();
      
      // Start at bottom left
      ctx.moveTo(0, height);
      
      // Move to first point
      ctx.lineTo(0, height - ((stock.values[0] - minValue) / range) * height);
      
      // Draw line through all points
      stock.values.forEach((value, index) => {
        const x = index * stepX;
        const y = height - ((value - minValue) / range) * height;
        ctx.lineTo(x, y);
      });
      
      // Close at bottom right
      ctx.lineTo(width, height);
      ctx.closePath();

      // Fill gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, stock.color + '40');
      gradient.addColorStop(1, stock.color + '00');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw line
      ctx.beginPath();
      stock.values.forEach((value, index) => {
        const x = index * stepX;
        const y = height - ((value - minValue) / range) * height;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      // Add glow
      ctx.shadowColor = stock.glow;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = stock.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      // Draw data points
      stock.values.forEach((value, index) => {
        const x = index * stepX;
        const y = height - ((value - minValue) / range) * height;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = stock.color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    });

    // Draw labels
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#94a3b8';
    
    // Stock legends
    stocks.forEach((stock, index) => {
      const y = 15 + index * 20;
      
      // Color box
      ctx.fillStyle = stock.color;
      ctx.fillRect(5, y - 6, 10, 10);
      
      // Label
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.fillText(stock.name, 20, y + 2);
      
      // Current price
      const currentPrice = stock.values[stock.values.length - 1];
      ctx.fillStyle = currentPrice > stock.values[stock.values.length - 2] ? '#10b981' : '#f43f5e';
      ctx.textAlign = 'right';
      ctx.fillText(`$${currentPrice}`, width - 10, y + 2);
    });

    // Update percentage
    ctx.fillStyle = '#10b981';
    ctx.textAlign = 'left';
    ctx.fillText('+12.5%', 5, height - 5);
    
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('7D', 5, 15);

  }, [width, height]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Add subtle glow animation
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
      gradient.addColorStop(0, 'rgba(126, 81, 255, 0.1)');
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      // Trigger re-render
      canvas.style.filter = `brightness(${1 + Math.random() * 0.05})`;
      setTimeout(() => {
        canvas.style.filter = 'brightness(1)';
      }, 100);
    }, 3000);

    return () => clearInterval(interval);
  }, [width, height]);

  return (
    <div className="market-trend-chart">
      <canvas 
        ref={canvasRef}
        className="trend-chart"
        style={{ 
          width: '100%', 
          height: 'auto',
          borderRadius: '8px'
        }}
      />
    </div>
  );
}