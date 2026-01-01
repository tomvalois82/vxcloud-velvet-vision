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

  // Calculate the angle for the gauge (270 degrees arc, from -135 to 135)
  const range = maxValue - minValue;
  const normalizedValue = Math.max(minValue, Math.min(maxValue, animatedValue));
  const percentage = range === 0 ? 0 : (normalizedValue - minValue) / range;
  const needleAngle = -135 + (percentage * 270); // -135 to 135 degrees
  
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth * 2) / 2 - 10;
  const centerX = size / 2;
  const centerY = size / 2;

  // Arc path for the background (270 degrees)
  const describeArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
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

  // Needle endpoint
  const needleLength = radius - 15;
  const needleEnd = polarToCartesian(centerX, centerY, needleLength, needleAngle + 90);

  // Calculate percentage for display
  const displayPercentage = Math.round(percentage * 100);

  return (
    <div 
      className={`flex flex-col items-center transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ width: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc - dark */}
        <path
          d={describeArc(-135, 135)}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Value arc - colored portion */}
        {percentage > 0 && (
          <path
            d={describeArc(-135, -135 + Math.max(0.1, percentage * 270))}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-300"
            style={{
              filter: value >= 1 ? 'drop-shadow(0 0 6px hsl(var(--primary) / 0.5))' : undefined,
            }}
          />
        )}
        
        {/* Center circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius * 0.15}
          fill="hsl(var(--muted))"
        />
        
        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={getColor()}
          strokeWidth={3}
          strokeLinecap="round"
          className="transition-all duration-500"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
        />
        
        {/* Needle center dot */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius * 0.08}
          fill={getColor()}
        />
        
        {/* Min label */}
        <text
          x={polarToCartesian(centerX, centerY, radius + 15, -45).x}
          y={polarToCartesian(centerX, centerY, radius + 15, -45).y}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: size * 0.07 }}
        >
          0%
        </text>
        
        {/* Max label */}
        <text
          x={polarToCartesian(centerX, centerY, radius + 15, 45).x}
          y={polarToCartesian(centerX, centerY, radius + 15, 45).y}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: size * 0.07 }}
        >
          100%
        </text>
        
        {/* Center value text - percentage */}
        <text
          x={centerX}
          y={centerY + radius * 0.45}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground font-bold"
          style={{ fontSize: size * 0.15 }}
        >
          {displayPercentage}%
        </text>
      </svg>
      
      {label && (
        <span className="text-sm text-muted-foreground mt-1 text-center">
          {label}
        </span>
      )}
    </div>
  );
}
