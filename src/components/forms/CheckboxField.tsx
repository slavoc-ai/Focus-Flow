import React from 'react';
import { cn } from '../../lib/utils';

interface CheckboxFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const CheckboxField = React.forwardRef<HTMLInputElement, CheckboxFieldProps>(
  ({ className, label, description, ...props }, ref) => {
    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            className={cn(
              "h-4 w-4 rounded border-input bg-card",
              "text-primary focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:ring-offset-background",
              "checked:bg-primary checked:border-primary",
              "transition-colors duration-200",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="ml-3">
            {label && (
              <label className="text-sm font-medium text-card-foreground">
                {label}
              </label>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

CheckboxField.displayName = 'CheckboxField';