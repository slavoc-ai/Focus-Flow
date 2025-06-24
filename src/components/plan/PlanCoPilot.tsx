import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Sparkles, Send, Loader2, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PlanCoPilotProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (command: string) => Promise<void>;
  isLoading: boolean;
  className?: string;
}

const EXAMPLE_COMMANDS = [
  "Make all tasks 10 minutes long",
  "Add a final review step",
  "Move research to the beginning",
  "Split the writing task into smaller parts",
  "Remove anything about graphics",
  "Make the task titles more motivating"
];

export const PlanCoPilot: React.FC<PlanCoPilotProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  className
}) => {
  const [command, setCommand] = useState('');
  const [showExamples, setShowExamples] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isLoading) return;

    try {
      await onSubmit(command.trim());
      setCommand('');
    } catch (error) {
      console.error('Error submitting Co-pilot command:', error);
    }
  };

  const handleExampleClick = (example: string) => {
    setCommand(example);
    setShowExamples(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed inset-x-0 top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-lg",
      className
    )}>
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-card-foreground">
                  FocusFlow Co-pilot
                </h3>
                <p className="text-sm text-muted-foreground">
                  Tell me how to improve your plan
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-card-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Command Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., 'Make all tasks 10 minutes long' or 'Add a final review step'"
                disabled={isLoading}
                className={cn(
                  "w-full px-4 py-3 pr-12 bg-card border border-border rounded-lg shadow-sm",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                  "placeholder:text-muted-foreground text-card-foreground",
                  "transition-all duration-200",
                  isLoading && "opacity-50 cursor-not-allowed"
                )}
              />
              
              <Button
                type="submit"
                size="sm"
                disabled={!command.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Examples */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowExamples(!showExamples)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {showExamples ? 'Hide examples' : 'Show example commands'}
              </button>
              
              <div className="text-xs text-muted-foreground">
                Press Enter to submit • Escape to close
              </div>
            </div>

            {/* Example Commands */}
            {showExamples && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {EXAMPLE_COMMANDS.map((example, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleExampleClick(example)}
                    disabled={isLoading}
                    className={cn(
                      "text-left p-3 bg-muted/50 hover:bg-muted rounded-lg",
                      "text-sm text-muted-foreground hover:text-card-foreground",
                      "transition-colors duration-200 border border-transparent hover:border-border",
                      isLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Loading State */}
          {isLoading && (
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium text-primary">
                    Co-pilot is thinking...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Analyzing your command and refining the plan
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};