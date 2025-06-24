import React, { useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from '../ui/Modal';
import { Check, Circle, Clock, Star, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { EditableTaskField } from '../ui/EditableTaskField';
import { EditableNumberField } from '../ui/EditableNumberField';
import { Button } from '../ui/Button';

// Enhanced interface for modal tasks with richer structure
export interface SubTaskForModal {
  id: string;
  title?: string; // Enhanced structure
  action?: string; // Enhanced structure
  details?: string; // Enhanced structure
  sub_task_description?: string; // Backward compatibility
  estimated_minutes_per_sub_task?: number;
  isCompleted: boolean;
}

interface FullPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: SubTaskForModal[];
  mainTask: string;
  onTaskSelect?: (taskId: string) => void;
  // Interactive functionality
  onToggleTask?: (taskId: string, newCompletedStatus: boolean) => void;
  // NEW: Text and time editing handlers
  onTaskTextUpdate?: (taskId: string, field: 'title' | 'action' | 'details', newValue: string) => void;
  onTaskTimeUpdate?: (taskId: string, newTime: number | null) => void;
  readOnly?: boolean; // Disable interactions when previewing
  onRefinePlan?: () => void; // New prop for refine plan button
}

export const FullPlanModal: React.FC<FullPlanModalProps> = ({
  isOpen,
  onClose,
  tasks,
  mainTask,
  onTaskSelect,
  onToggleTask,
  onTaskTextUpdate,
  onTaskTimeUpdate,
  readOnly = false,
  onRefinePlan
}) => {
  const completedTasks = tasks.filter(task => task.isCompleted).length;
  const totalEstimatedTime = tasks.reduce((total, task) => 
    total + (task.estimated_minutes_per_sub_task || 0), 0
  );

  // State to track expanded task IDs
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  // State to track edit mode
  const [isEditMode, setIsEditMode] = useState(false);

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedTaskIds(new Set(tasks.map(task => task.id)));
  };

  const collapseAll = () => {
    setExpandedTaskIds(new Set());
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  const handleTaskClick = (taskId: string) => {
    if (onTaskSelect) {
      onTaskSelect(taskId);
    }
  };

  const handleTaskToggle = (e: React.MouseEvent, taskId: string, currentStatus: boolean) => {
    e.stopPropagation();
    if (!readOnly && onToggleTask) {
      onToggleTask(taskId, !currentStatus);
    }
  };

  // Handle text field updates
  const handleTextUpdate = (taskId: string, field: 'title' | 'action' | 'details') => {
    return (newValue: string) => {
      if (!readOnly && onTaskTextUpdate && isEditMode) {
        onTaskTextUpdate(taskId, field, newValue);
      }
    };
  };

  // Handle time estimate updates
  const handleTimeUpdate = (taskId: string) => {
    return (newTime: number | null) => {
      if (!readOnly && onTaskTimeUpdate && isEditMode) {
        onTaskTimeUpdate(taskId, newTime);
      }
    };
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Full Plan Overview"
      description="Review and manage all tasks in your current plan"
      className="max-w-3xl"
    >
      <div className="flex flex-col h-full">
        {/* Plan Header */}
        <div className="bg-muted rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-card-foreground mb-2">
            {mainTask}
          </h3>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{completedTasks} of {tasks.length} tasks completed</span>
            {totalEstimatedTime > 0 && (
              <span className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>~{totalEstimatedTime} minutes total</span>
              </span>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-border rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>Expand All</Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>Collapse All</Button>
          </div>
          
          <div className="flex space-x-2">
            {!readOnly && onRefinePlan && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onRefinePlan}
                className="flex items-center space-x-1 border-primary/50 text-primary hover:bg-primary/10"
              >
                <Sparkles className="w-3 h-3" />
                <span>Refine Plan</span>
              </Button>
            )}
            
            {!readOnly && onTaskTextUpdate && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={toggleEditMode}
                className={cn(
                  "flex items-center space-x-1",
                  isEditMode && "bg-primary/10 border-primary text-primary"
                )}
              >
                <Star className="w-3 h-3" />
                <span>Enable Editing</span>
              </Button>
            )}
          </div>
        </div>

        {/* Task List - Single Scrollable Container */}
        <div className="overflow-y-auto flex-1 pr-1 mb-4">
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No tasks in this plan
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {tasks.map((task, index) => {
                const isExpanded = expandedTaskIds.has(task.id);
                
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "border rounded-lg transition-all duration-200",
                      task.isCompleted
                        ? "bg-palette-success-50 dark:bg-palette-success-900/20 border-palette-success-200 dark:border-palette-success-800"
                        : "bg-card border-border hover:border-primary/50",
                      onTaskSelect && readOnly && "cursor-pointer hover:border-primary/50"
                    )}
                  >
                    {/* Task Header - Always visible */}
                    <div 
                      className="flex items-center p-3"
                      onClick={() => readOnly && onTaskSelect ? handleTaskClick(task.id) : toggleTaskExpansion(task.id)}
                    >
                      {/* Task Number & Checkbox */}
                      <div className="flex items-center space-x-3 flex-shrink-0">
                        <span className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full",
                          task.isCompleted
                            ? "bg-palette-success-100 text-palette-success-700 dark:bg-palette-success-900/30 dark:text-palette-success-300"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {index + 1}
                        </span>
                        
                        {/* Interactive Checkbox */}
                        <button 
                          className={cn(
                            "flex items-center justify-center w-5 h-5 rounded-full transition-all duration-200",
                            !readOnly && "cursor-pointer hover:scale-110",
                            readOnly && "cursor-default",
                            task.isCompleted
                              ? "bg-palette-success-500 text-white"
                              : "border-2 border-border hover:border-primary"
                          )}
                          onClick={(e) => handleTaskToggle(e, task.id, task.isCompleted)}
                          disabled={readOnly}
                        >
                          {task.isCompleted ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Circle className="w-3 h-3 opacity-0" />
                          )}
                        </button>
                      </div>

                      {/* Task Title */}
                      <div className="flex-1 mx-2">
                        {isEditMode && onTaskTextUpdate ? (
                          <EditableTaskField
                            value={task.title || `Task ${index + 1}`}
                            onSave={handleTextUpdate(task.id, 'title')}
                            placeholder="Enter task title..."
                            variant="title"
                            maxLength={100}
                            displayClassName="py-0 px-0"
                          />
                        ) : (
                          <p className={cn(
                            "font-medium text-sm",
                            task.isCompleted
                              ? "line-through text-muted-foreground"
                              : "text-card-foreground"
                          )}>
                            {task.title || `Task ${index + 1}`}
                          </p>
                        )}
                      </div>
                      
                      {/* Time and Expand/Collapse */}
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        {task.estimated_minutes_per_sub_task && (
                          <span className="text-xs">
                            ~{task.estimated_minutes_per_sub_task} min
                          </span>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskExpansion(task.id);
                          }}
                          className="p-1 text-muted-foreground hover:text-card-foreground"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="pl-10 pr-4 pb-3 space-y-2">
                        {/* Action */}
                        {isEditMode && onTaskTextUpdate ? (
                          <EditableTaskField
                            value={task.action || task.sub_task_description || ''}
                            onSave={handleTextUpdate(task.id, 'action')}
                            placeholder="Enter immediate action..."
                            variant="action"
                            maxLength={200}
                            displayClassName="py-0 px-0"
                          />
                        ) : (
                          <p className={cn(
                            "text-sm font-medium",
                            task.isCompleted
                              ? "line-through text-muted-foreground"
                              : "text-primary"
                          )}>
                            {task.action || task.sub_task_description || ''}
                          </p>
                        )}
                        
                        {/* Details */}
                        {isEditMode && onTaskTextUpdate ? (
                          <EditableTaskField
                            value={task.details || task.sub_task_description || ''}
                            onSave={handleTextUpdate(task.id, 'details')}
                            placeholder="Enter detailed explanation..."
                            variant="details"
                            multiline={true}
                            maxLength={500}
                            displayClassName="py-0 px-0"
                          />
                        ) : (
                          task.details && (
                            <p className={cn(
                              "text-sm",
                              task.isCompleted
                                ? "line-through text-muted-foreground"
                                : "text-muted-foreground"
                            )}>
                              {task.details}
                            </p>
                          )
                        )}
                        
                        {/* Time Estimate */}
                        {isEditMode && onTaskTimeUpdate ? (
                          <EditableNumberField
                            value={task.estimated_minutes_per_sub_task}
                            onSave={handleTimeUpdate(task.id)}
                            placeholder="Add time estimate..."
                            min={1}
                            max={480}
                            unit="minutes"
                            allowNull={true}
                            displayClassName="py-0 px-0"
                          />
                        ) : (
                          task.estimated_minutes_per_sub_task && (
                            <p className="text-xs text-muted-foreground mt-2 flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>~{task.estimated_minutes_per_sub_task} minutes</span>
                            </p>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mode Notice */}
        {readOnly ? (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
            <p className="text-primary text-sm text-center">
              This is a preview of the project plan. To make changes, start a new session or edit the project.
            </p>
          </div>
        ) : (
          isEditMode && onTaskTextUpdate && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
              <p className="text-primary text-sm text-center">
                Editing mode is active. Click on task fields to edit them.
              </p>
            </div>
          )
        )}

        <ModalFooter>
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-muted-foreground">
              {!readOnly && onToggleTask && "Click checkboxes to mark tasks as complete"}
              {!readOnly && onTaskTextUpdate && isEditMode && " • Click on task fields to edit them"}
              {readOnly && onTaskSelect && "Click on a task to navigate to it"}
              {readOnly && !onTaskSelect && `${completedTasks}/${tasks.length} tasks completed`}
            </div>
            <Button
              onClick={onClose}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Close
            </Button>
          </div>
        </ModalFooter>
      </div>
    </Modal>
  );
};