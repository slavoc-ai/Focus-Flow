import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Edit3, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EditableTaskFieldProps {
  value: string | number | null;
  onSave: (newValue: string | number | null) => void;
  type?: 'text' | 'textarea' | 'number';
  placeholder?: string;
  className?: string;
  displayClassName?: string;
  editClassName?: string;
  disabled?: boolean;
  multiline?: boolean;
  numberMin?: number;
  numberMax?: number;
  suffix?: string; // For displaying units like "min"
  emptyText?: string; // Text to show when value is empty
}

export const EditableTaskField: React.FC<EditableTaskFieldProps> = ({
  value,
  onSave,
  type = 'text',
  placeholder = 'Click to edit...',
  className = '',
  displayClassName = '',
  editClassName = '',
  disabled = false,
  multiline = false,
  numberMin,
  numberMax,
  suffix = '',
  emptyText = 'Click to add...'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || '');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Update edit value when prop value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value?.toString() || '');
    }
  }, [value, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text' || type === 'textarea') {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(value?.toString() || '');
  };

  const handleSave = () => {
    let processedValue: string | number | null = editValue.trim();
    
    if (type === 'number') {
      if (processedValue === '') {
        processedValue = null;
      } else {
        const numValue = parseFloat(processedValue);
        if (isNaN(numValue)) {
          // Invalid number, revert to original
          setEditValue(value?.toString() || '');
          setIsEditing(false);
          return;
        }
        
        // Apply min/max constraints
        if (numberMin !== undefined && numValue < numberMin) {
          processedValue = numberMin;
        } else if (numberMax !== undefined && numValue > numberMax) {
          processedValue = numberMax;
        } else {
          processedValue = numValue;
        }
      }
    } else {
      // For text fields, empty string becomes null if no meaningful content
      if (processedValue === '') {
        processedValue = null;
      }
    }

    onSave(processedValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value?.toString() || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (type === 'textarea' && !e.ctrlKey) {
        // Allow normal Enter in textarea unless Ctrl+Enter
        return;
      }
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const displayValue = value?.toString() || '';
  const hasValue = displayValue.length > 0;

  if (isEditing) {
    const InputComponent = multiline || type === 'textarea' ? 'textarea' : 'input';
    
    return (
      <div className={cn('relative', className)}>
        <InputComponent
          ref={inputRef as any}
          type={type === 'number' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setIsFocused(false)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          min={type === 'number' ? numberMin : undefined}
          max={type === 'number' ? numberMax : undefined}
          className={cn(
            'w-full px-2 py-1 text-sm bg-card border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            type === 'textarea' && 'min-h-[60px] resize-vertical',
            editClassName
          )}
          rows={type === 'textarea' ? 3 : undefined}
        />
        
        <div className="flex items-center space-x-1 mt-1">
          <button
            onClick={handleSave}
            className="p-1 text-palette-success-600 hover:bg-palette-success-100 rounded transition-colors"
            title="Save (Enter)"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 text-muted-foreground hover:bg-muted rounded transition-colors"
            title="Cancel (Esc)"
          >
            <X className="w-3 h-3" />
          </button>
          {type === 'textarea' && (
            <span className="text-xs text-muted-foreground ml-2">
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
        'group relative cursor-pointer transition-all duration-200',
        'hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      title={disabled ? undefined : 'Click to edit'}
    >
      <div className={cn(
        'flex items-center space-x-2',
        !hasValue && 'text-muted-foreground italic',
        displayClassName
      )}>
        {type === 'number' && hasValue && (
          <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        )}
        
        <span className="flex-1">
          {hasValue ? displayValue : emptyText}
          {hasValue && suffix && (
            <span className="text-muted-foreground ml-1">{suffix}</span>
          )}
        </span>
        
        {!disabled && (
          <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        )}
      </div>
    </div>
  );
};