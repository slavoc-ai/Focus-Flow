import React from 'react';
import { Battery, BatteryMedium, BatteryFull } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ENERGY_LEVELS } from '../../constants';

interface EnergyLevelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const EnergyLevelSelector: React.FC<EnergyLevelSelectorProps> = ({
  value,
  onChange,
  className
}) => {
  return (
    <div className={cn("flex flex-col space-y-4", className)}>
      <label className="block text-sm font-medium text-card-foreground">
        Energy Level
      </label>
      <div className="flex space-x-4">
        {ENERGY_LEVELS.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => onChange(level.value)}
            className={cn(
              "flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200",
              "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              value === level.value
                ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            <div className={cn(
              "mb-2 transition-colors duration-200",
              value === level.value
                ? "text-primary"
                : "text-muted-foreground"
            )}>
              {level.value === 'low' && <Battery className="w-6 h-6" />}
              {level.value === 'medium' && <BatteryMedium className="w-6 h-6" />}
              {level.value === 'high' && <BatteryFull className="w-6 h-6" />}
            </div>
            <span className={cn(
              "text-sm font-medium transition-colors duration-200",
              value === level.value
                ? "text-primary"
                : "text-card-foreground"
            )}>
              {level.label}
            </span>
            <span className={cn(
              "mt-1 text-xs text-center transition-colors duration-200",
              value === level.value
                ? "text-primary/80"
                : "text-muted-foreground"
            )}>
              {level.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};