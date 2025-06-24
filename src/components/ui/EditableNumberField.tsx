import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Clock } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface EditableNumberFieldProps {
  value?: number | null;
  onSave: (newValue: number | null) => void;
  placeholder?: string;
  className?: string;
  displayClassName?: string;
  inputClassName?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  unit?: string;
  allowNull?: boolean;
}

export const EditableNumberField: React.FC<EditableNumberFieldProps> = ({
  value,
  onSave,
  placeholder = 'Enter time...',
  className = '',
  displayClassName = '',
  inputClassName = '',
  min = 1,
  max = 480,
  disabled = false,
  unit = 'min',
  allowNull = true
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || '');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update edit value when prop value changes
  useEffect(() => {
    setEditValue(value?.toString() || '');
  }, [value]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(value?.toString() || '');
    setError(null);
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();
    
    // Handle empty value
    if (!trimmedValue) {
      if (allowNull) {
        try {
          await onSave(null);
          setIsEditing(false);
          setError(null);
          return;
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to save');
          return;
        }
      } else {
        setError('This field is required');
        return;
      }
    }

    // Parse and validate number
    const numValue = parseInt(trimmedValue, 10);
    
    if (isNaN(numValue)) {
      setError('Please enter a valid number');
      return;
    }

    if (numValue < min) {
      setError(`Minimum value is ${min}`);
      return;
    }

    if (numValue > max) {
      setError(`Maximum value is ${max}`);
      return;
    }

    try {
      await onSave(numValue);
      setIsEditing(false);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  const handleCancel = () => {
    setEditValue(value?.toString() || '');
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
      <div className={cn('space-y-2', className)}>
        <div className="relative">
          <input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            min={min}
            max={max}
            className={cn(
              'w-full px-3 py-2 bg-card border border-input rounded-md shadow-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
              'placeholder:text-muted-foreground text-card-foreground',
              'transition-colors duration-200',
              error && 'border-destructive focus:ring-destructive focus:border-destructive',
              inputClassName
            )}
          />
          
          {unit && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              {unit}
            </div>
          )}
        </div>
        
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={handleSave}
            className="h-8"
          >
            <Check className="w-3 h-3 mr-1" />
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="h-8"
          >
            <X className="w-3 h-3 mr-1" />
            Cancel
          </Button>
          {allowNull && (
            <span className="text-xs text-muted-foreground">
              Leave empty for no estimate
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleStartEdit}
      className={cn(
        'cursor-pointer rounded-md transition-all duration-200',
        'hover:bg-muted/50 hover:shadow-sm',
        !disabled && 'group',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      title={disabled ? 'Editing disabled' : 'Click to edit time estimate'}
    >
      <div className={cn(
        'p-2 rounded-md transition-colors duration-200 flex items-center space-x-2',
        'text-sm text-muted-foreground',
        displayClassName,
        !disabled && 'group-hover:bg-muted/30'
      )}>
        <Clock className="w-3 h-3" />
        <span>
          {value ? `~${value} ${unit}` : (
            <span className="italic">
              {placeholder}
            </span>
          )}
        </span>
      </div>
    </div>
  );
};