import React, { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EditableProjectTitleProps {
  value: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
}

export const EditableProjectTitle: React.FC<EditableProjectTitleProps> = ({
  value,
  onSave,
  placeholder = "Enter project title...",
  className,
  disabled = false,
  maxLength = 100
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(value);
    setError(null);
  };

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    
    if (!trimmedValue) {
      setError('Title cannot be empty');
      return;
    }

    if (trimmedValue.length > maxLength) {
      setError(`Title must be ${maxLength} characters or less`);
      return;
    }

    onSave(trimmedValue);
    setIsEditing(false);
    setError(null);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex-1 px-3 py-2 text-lg font-semibold bg-card border border-input rounded-md shadow-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
              "placeholder:text-muted-foreground text-card-foreground",
              "transition-colors duration-200",
              error && "border-destructive focus:ring-destructive focus:border-destructive",
              className
            )}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
          />
          
          <button
            onClick={handleSave}
            disabled={disabled}
            className="p-2 text-palette-success-600 hover:text-palette-success-700 hover:bg-palette-success-50 rounded-md transition-colors"
            title="Save (Enter)"
          >
            <Check className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleCancel}
            disabled={disabled}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            title="Cancel (Escape)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex justify-between items-center text-xs">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : (
            <span className="text-muted-foreground">
              Press Enter to save, Escape to cancel
            </span>
          )}
          <span className={cn(
            "text-muted-foreground",
            editValue.length > maxLength * 0.9 && "text-palette-warning-600",
            editValue.length >= maxLength && "text-destructive"
          )}>
            {editValue.length}/{maxLength}
          </span>
        </div>
      </div>
    );
  }

  return (
    <h3
      onClick={handleStartEdit}
      className={cn(
        "text-lg font-semibold text-primary cursor-pointer",
        "hover:bg-primary/5 rounded px-2 py-1 -mx-2 -my-1 transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        disabled && "cursor-not-allowed opacity-50",
        !value && "text-muted-foreground italic",
        className
      )}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartEdit();
        }
      }}
      title={disabled ? undefined : "Click to edit project title"}
    >
      {value || placeholder}
    </h3>
  );
};