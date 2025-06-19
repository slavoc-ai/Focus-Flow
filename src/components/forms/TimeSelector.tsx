import React from 'react';
import { cn } from '../../lib/utils';

interface TimeSelectorProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  unit?: 'minutes' | 'hours';
}

export const TimeSelector = React.forwardRef<HTMLInputElement, TimeSelectorProps>(
  ({ className, label, error, unit = 'minutes', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-card-foreground mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type="number"
            min="1"
            className={cn(
              "w-full px-3 py-2 bg-card border border-input rounded-md shadow-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
              "placeholder:text-muted-foreground text-card-foreground",
              "transition-colors duration-200",
              error && "border-destructive focus:ring-destructive focus:border-destructive",
              className
            )}
            ref={ref}
            {...props}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            {unit}
          </span>
        </div>
        {error && (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

TimeSelector.displayName = 'TimeSelector';