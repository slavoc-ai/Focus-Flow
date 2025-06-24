import React, { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface EditableTaskFieldProps {
  value: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  displayClassName?: string;
  inputClassName?: string;
  maxLength?: number;
  disabled?: boolean;
  variant?: 'title' | 'action' | 'details';
}

export const EditableTaskField: React.FC<EditableTaskFieldProps> = ({
  value,
  onSave,
  placeholder = 'Enter text...',
  multiline = false,
  className = '',
  displayClassName = '',
  inputClassName = '',
  maxLength,
  disabled = false,
  variant = 'action'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Update edit value when prop value changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (multiline) {
        // For textarea, set cursor to end
        const textarea = inputRef.current as HTMLTextAreaElement;
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      } else {
        // For input, select all text
        (inputRef.current as HTMLInputElement).select();
      }
    }
  }, [isEditing, multiline]);

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(value);
    setError(null);
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();
    
    // Validation
    if (!trimmedValue) {
      setError('This field cannot be empty');
      return;
    }

    if (maxLength && trimmedValue.length > maxLength) {
      setError(`Maximum ${maxLength} characters allowed`);
      return;
    }

    try {
      await onSave(trimmedValue);
      setIsEditing(false);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (multiline && !e.ctrlKey) {
        // Allow normal Enter in multiline unless Ctrl+Enter
        return;
      }
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // Get variant-specific styling
  const getVariantStyles = () => {
    switch (variant) {
      case 'title':
        return {
          display: 'font-bold text-lg leading-tight text-card-foreground',
          input: 'font-bold text-lg'
        };
      case 'action':
        return {
          display: 'font-medium text-primary',
          input: 'font-medium'
        };
      case 'details':
        return {
          display: 'text-sm leading-relaxed text-muted-foreground',
          input: 'text-sm'
        };
      default:
        return {
          display: 'text-card-foreground',
          input: ''
        };
    }
  };

  const variantStyles = getVariantStyles();

  if (isEditing) {
    const InputComponent = multiline ? 'textarea' : 'input';
    
    return (
      <div className={cn('space-y-2', className)}>
        <div className="relative">
          <InputComponent
            ref={inputRef as any}
            type={multiline ? undefined : 'text'}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLength}
            className={cn(
              'w-full px-3 py-2 bg-card border border-input rounded-md shadow-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
              'placeholder:text-muted-foreground text-card-foreground',
              'transition-colors duration-200',
              variantStyles.input,
              multiline && 'min-h-[80px] resize-vertical',
              error && 'border-destructive focus:ring-destructive focus:border-destructive',
              inputClassName
            )}
            rows={multiline ? 3 : undefined}
          />
          
          {maxLength && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              {editValue.length}/{maxLength}
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
            disabled={!editValue.trim()}
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
          {multiline && (
            <span className="text-xs text-muted-foreground">
              Ctrl+Enter to save
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
      title={disabled ? 'Editing disabled' : 'Click to edit'}
    >
      <div className={cn(
        'p-2 rounded-md transition-colors duration-200',
        variantStyles.display,
        displayClassName,
        !disabled && 'group-hover:bg-muted/30'
      )}>
        {value || (
          <span className="text-muted-foreground italic">
            {placeholder}
          </span>
        )}
      </div>
    </div>
  );
};