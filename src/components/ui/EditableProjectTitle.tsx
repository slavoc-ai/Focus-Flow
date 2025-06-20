import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Edit3, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EditableProjectTitleProps {
  value: string;
  onSave: (newTitle: string) => void;
  placeholder?: string;
  className?: string;
  displayClassName?: string;
  disabled?: boolean;
  showAiIcon?: boolean; // Show AI icon for AI-generated titles
  maxLength?: number;
}

export const EditableProjectTitle: React.FC<EditableProjectTitleProps> = ({
  value,
  onSave,
  placeholder = 'Enter project title...',
  className = '',
  displayClassName = '',
  disabled = false,
  showAiIcon = false,
  maxLength = 100
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update edit value when prop value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (disabled || isSaving) return;
    setIsEditing(true);
    setEditValue(value);
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();
    
    if (trimmedValue === '') {
      // Don't allow empty titles
      setEditValue(value);
      setIsEditing(false);
      return;
    }

    if (trimmedValue === value) {
      // No change
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      await onSave(trimmedValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving project title:', error);
      // Revert on error
      setEditValue(value);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
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
      <div className={cn('relative', className)}>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={isSaving}
          className={cn(
            'w-full px-3 py-2 text-lg font-semibold bg-card border-2 border-primary rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            'transition-all duration-200',
            isSaving && 'opacity-50 cursor-not-allowed',
            displayClassName
          )}
        />
        
        <div className="flex items-center space-x-2 mt-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-palette-success-100 text-palette-success-700 hover:bg-palette-success-200 rounded transition-colors disabled:opacity-50"
            title="Save (Enter)"
          >
            <Check className="w-3 h-3" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-muted text-muted-foreground hover:bg-muted/80 rounded transition-colors disabled:opacity-50"
            title="Cancel (Esc)"
          >
            <X className="w-3 h-3" />
            <span>Cancel</span>
          </button>
          <span className="text-xs text-muted-foreground">
            {editValue.length}/{maxLength}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleStartEdit}
      className={cn(
        'group relative cursor-pointer transition-all duration-200',
        'hover:bg-muted/30 rounded-lg px-3 py-2 -mx-3 -my-2',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      title={disabled ? undefined : 'Click to edit project title'}
    >
      <div className={cn(
        'flex items-center space-x-2',
        displayClassName
      )}>
        {showAiIcon && (
          <Sparkles className="w-4 h-4 text-primary flex-shrink-0" title="AI-generated title" />
        )}
        
        <span className="flex-1 text-lg font-semibold text-card-foreground">
          {value || 'Untitled Project'}
        </span>
        
        {!disabled && (
          <Edit3 className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        )}
      </div>
      
      {showAiIcon && (
        <p className="text-xs text-primary/70 mt-1 -mx-3">
          AI-generated • Click to customize
        </p>
      )}
    </div>
  );
};