import { useEffect, useState } from 'react';

interface GaugeChartProps {
  value: number;
  minValue: number;
  maxValue: number;
  label?: string;
  formatValue?: (value: number) => string;
  size?: number;
}

export function GaugeChart({
  value,
  minValue,
  maxValue,
  label,
  formatValue = (v) => v.toLocaleString('pt-BR'),
  size = 200,
}: GaugeChartProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const duration = 1000;
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = value / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      setAnimatedValue(Math.min(increment * currentStep, value));
      if (currentStep >= steps) {
        clearInterval(interval);
        setAnimatedValue(value);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [value]);

  // Calculate the angle for the gauge (180 degrees = half circle)
  const range = maxValue - minValue;
  const normalizedValue = Math.max(minValue, Math.min(maxValue, animatedValue));
  const percentage = range === 0 ? 0 : (normalizedValue - minValue) / range;
  const angle = percentage * 180;

  const strokeWidth = size * 0.12;
  const radius = (size - strokeWidth) / 2;
  const centerX = size / 2;
  const centerY = size / 2;

  // Arc path for the background
  const describeArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  // Determine color based on value
  const getColor = () => {
    if (value < 0) return 'hsl(var(--destructive))';
    if (value < 1) return 'hsl(var(--chart-5))';
    return 'hsl(var(--primary))';
  };

  return (
    <div 
      className={`flex flex-col items-center transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ width: size }}
    >
      <svg width={size} height={size / 2 + strokeWidth} viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}>
        {/* Background arc */}
        <path
          d={describeArc(0, 180)}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          transform={`translate(0, ${strokeWidth / 2})`}
        />
        
        {/* Value arc */}
        <path
          d={describeArc(0, Math.max(0.1, angle))}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          transform={`translate(0, ${strokeWidth / 2})`}
          className="transition-all duration-300"
          style={{
            filter: value >= 1 ? 'drop-shadow(0 0 8px hsl(var(--primary) / 0.5))' : undefined,
          }}
        />
        
        {/* Center value text */}
        <text
          x={centerX}
          y={centerY - strokeWidth / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground font-semibold"
          style={{ fontSize: size * 0.12 }}
        >
          {formatValue(animatedValue)}
        </text>
        
        {/* Min label */}
        <text
          x={strokeWidth}
          y={size / 2 + strokeWidth / 2}
          textAnchor="start"
          className="fill-muted-foreground"
          style={{ fontSize: size * 0.06 }}
        >
          {formatValue(minValue)}
        </text>
        
        {/* Max label */}
        <text
          x={size - strokeWidth}
          y={size / 2 + strokeWidth / 2}
          textAnchor="end"
          className="fill-muted-foreground"
          style={{ fontSize: size * 0.06 }}
        >
          {formatValue(maxValue)}
        </text>
      </svg>
      
      {label && (
        <span className="text-sm text-muted-foreground mt-2 text-center">
          {label}
        </span>
      )}
    </div>
  );
}
