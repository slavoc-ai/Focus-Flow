import React from 'react';
import { cn } from '../../lib/utils';

interface TextInputFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextInputField = React.forwardRef<HTMLTextAreaElement, TextInputFieldProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-card-foreground mb-1">
            {label}
          </label>
        )}
        <textarea
          className={cn(
            "w-full min-h-[100px] px-3 py-2 bg-card border border-input rounded-md shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
            "placeholder:text-muted-foreground text-card-foreground",
            "transition-colors duration-200",
            error && "border-destructive focus:ring-destructive focus:border-destructive",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

TextInputField.displayName = 'TextInputField';