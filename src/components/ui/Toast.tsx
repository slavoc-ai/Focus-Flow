import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

const toastVariants = cva(
  'pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 shadow-lg transition-all',
  {
    variants: {
      variant: {
        default: 'bg-card border-border',
        success: 'bg-palette-success-50 border-palette-success-200 dark:bg-palette-success-900/20 dark:border-palette-success-800',
        error: 'bg-palette-error-50 border-palette-error-200 dark:bg-palette-error-900/20 dark:border-palette-error-800',
        warning: 'bg-palette-warning-50 border-palette-warning-200 dark:bg-palette-warning-900/20 dark:border-palette-warning-800',
        info: 'bg-primary/10 border-primary/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof toastVariants> {
  title?: string;
  description?: string;
  onClose?: () => void;
  duration?: number;
  icon?: React.ReactNode;
}

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, title, description, onClose, duration = 5000, icon, ...props }, ref) => {
    useEffect(() => {
      if (duration && onClose) {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
      }
    }, [duration, onClose]);

    const IconComponent = variant === 'success' ? CheckCircle2 :
                         variant === 'error' ? XCircle :
                         variant === 'warning' ? AlertCircle :
                         variant === 'info' ? Info :
                         null;

    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      >
        <div className="flex items-start gap-4 w-full">
          {(icon || IconComponent) && (
            <div className={cn(
              "flex-shrink-0 h-5 w-5",
              variant === 'success' && "text-palette-success-500 dark:text-palette-success-400",
              variant === 'error' && "text-palette-error-500 dark:text-palette-error-400",
              variant === 'warning' && "text-palette-warning-500 dark:text-palette-warning-400",
              variant === 'info' && "text-primary",
              variant === 'default' && "text-muted-foreground"
            )}>
              {icon || (IconComponent && <IconComponent className="h-5 w-5" />)}
            </div>
          )}
          
          <div className="flex-1">
            {title && (
              <div className={cn(
                "text-sm font-medium",
                variant === 'success' && "text-palette-success-900 dark:text-palette-success-100",
                variant === 'error' && "text-palette-error-900 dark:text-palette-error-100",
                variant === 'warning' && "text-palette-warning-900 dark:text-palette-warning-100",
                variant === 'info' && "text-primary",
                variant === 'default' && "text-card-foreground"
              )}>
                {title}
              </div>
            )}
            {description && (
              <div className={cn(
                "mt-1 text-sm",
                variant === 'success' && "text-palette-success-700 dark:text-palette-success-300",
                variant === 'error' && "text-palette-error-700 dark:text-palette-error-300",
                variant === 'warning' && "text-palette-warning-700 dark:text-palette-warning-300",
                variant === 'info' && "text-primary/80",
                variant === 'default' && "text-muted-foreground"
              )}>
                {description}
              </div>
            )}
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className={cn(
              "flex-shrink-0 rounded-lg p-1 transition-colors",
              variant === 'success' && "hover:bg-palette-success-100 dark:hover:bg-palette-success-800",
              variant === 'error' && "hover:bg-palette-error-100 dark:hover:bg-palette-error-800",
              variant === 'warning' && "hover:bg-palette-warning-100 dark:hover:bg-palette-warning-800",
              variant === 'info' && "hover:bg-primary/10",
              variant === 'default' && "hover:bg-muted"
            )}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    );
  }
);

Toast.displayName = 'Toast';

export const ToastContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return createPortal(
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {children}
    </div>,
    document.body
  );
};