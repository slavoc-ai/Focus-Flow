import React from 'react';
import { cn } from '../../lib/utils';

interface TaskBreakdownLevelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const TaskBreakdownLevelSelector: React.FC<TaskBreakdownLevelSelectorProps> = ({
  value,
  onChange,
  className
}) => {
  const levels = [
    {
      value: 'focused',
      label: 'Focused Chunks',
      description: 'Larger tasks (20-30 min each)',
      icon: '🎯'
    },
    {
      value: 'small',
      label: 'Small Steps',
      description: 'Manageable tasks (10-15 min each)',
      icon: '📝'
    },
    {
      value: 'micro',
      label: 'Micro Steps',
      description: 'Tiny actions (1-3 min each)',
      icon: '🔬'
    }
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <label className="block text-sm font-medium text-card-foreground">
        Task Breakdown Level
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {levels.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => onChange(level.value)}
            className={cn(
              "p-4 rounded-lg border-2 transition-all duration-200 text-left hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              value === level.value
                ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                : 'border-border bg-card hover:border-primary/50'
            )}
          >
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-xl">{level.icon}</span>
              <span className={cn(
                "font-medium",
                value === level.value ? 'text-primary' : 'text-card-foreground'
              )}>
                {level.label}
              </span>
            </div>
            <p className={cn(
              "text-sm",
              value === level.value ? 'text-primary/80' : 'text-muted-foreground'
            )}>
              {level.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};