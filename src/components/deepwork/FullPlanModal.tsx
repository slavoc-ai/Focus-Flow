import React from 'react';
import { Modal, ModalHeader, ModalFooter } from '../ui/Modal';
import { Check, Circle, Clock, Star } from 'lucide-react';
import { cn } from '../../lib/utils';

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
  // NEW: Interactive functionality
  onToggleTask?: (taskId: string, newCompletedStatus: boolean) => void;
  readOnly?: boolean; // Disable interactions when previewing
}

export const FullPlanModal: React.FC<FullPlanModalProps> = ({
  isOpen,
  onClose,
  tasks,
  mainTask,
  onTaskSelect,
  onToggleTask,
  readOnly = false
}) => {
  const completedTasks = tasks.filter(task => task.isCompleted).length;
  const totalEstimatedTime = tasks.reduce((total, task) => 
    total + (task.estimated_minutes_per_sub_task || 0), 0
  );

  const handleTaskClick = (taskId: string) => {
    if (onTaskSelect) {
      onTaskSelect(taskId);
    }
  };

  const handleTaskToggle = (taskId: string, currentStatus: boolean) => {
    if (!readOnly && onToggleTask) {
      onToggleTask(taskId, !currentStatus);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={readOnly ? "Plan Preview" : "Full Plan Overview"}
      description={readOnly ? "View all tasks in this project" : "Review and manage all tasks in your current plan"}
      className="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Plan Header */}
        <div className="bg-muted rounded-lg p-4">
          <h3 className="font-semibold text-card-foreground mb-2">
            {mainTask}
          </h3>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>{completedTasks} of {tasks.length} tasks completed</span>
            {totalEstimatedTime > 0 && (
              <span className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>~{totalEstimatedTime} minutes total</span>
              </span>
            )}
            {readOnly && (
              <span className="flex items-center space-x-1 text-primary">
                <Star className="w-4 h-4" />
                <span>Preview Mode</span>
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

        {/* Task List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className={cn(
                "flex items-start space-x-3 p-4 rounded-lg border transition-all duration-200",
                !readOnly && "hover:bg-muted/50",
                onTaskSelect && readOnly && "cursor-pointer hover:border-primary/50",
                task.isCompleted
                  ? "bg-palette-success-50 dark:bg-palette-success-900/20 border-palette-success-200 dark:border-palette-success-800"
                  : "bg-card border-border"
              )}
              onClick={() => readOnly && handleTaskClick(task.id)}
            >
              {/* Task Number & Interactive Checkbox */}
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
                <label 
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200",
                    !readOnly && "cursor-pointer hover:scale-110",
                    readOnly && "cursor-default",
                    task.isCompleted
                      ? "bg-palette-success-500 text-white"
                      : "border-2 border-border hover:border-primary"
                  )}
                  htmlFor={`modal-checkbox-${task.id}`}
                >
                  <input
                    id={`modal-checkbox-${task.id}`}
                    type="checkbox"
                    checked={task.isCompleted}
                    onChange={() => handleTaskToggle(task.id, task.isCompleted)}
                    disabled={readOnly}
                    className="sr-only" // Hide the actual checkbox, use custom styling
                  />
                  {task.isCompleted ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Circle className="w-3 h-3 opacity-0" />
                  )}
                </label>
              </div>

              {/* Enhanced Task Content */}
              <div className="flex-1 min-w-0">
                {/* Task Title */}
                {task.title && (
                  <h4 className={cn(
                    "font-bold text-lg leading-tight mb-2",
                    task.isCompleted
                      ? "line-through text-muted-foreground"
                      : "text-card-foreground"
                  )}>
                    {task.title}
                  </h4>
                )}
                
                {/* Immediate Action */}
                {task.action && (
                  <p className={cn(
                    "font-medium mb-2",
                    task.isCompleted
                      ? "line-through text-muted-foreground"
                      : "text-primary"
                  )}>
                    {task.action}
                  </p>
                )}
                
                {/* Detailed Explanation */}
                {task.details && (
                  <p className={cn(
                    "text-sm leading-relaxed mb-2",
                    task.isCompleted
                      ? "line-through text-muted-foreground"
                      : "text-muted-foreground"
                  )}>
                    {task.details}
                  </p>
                )}
                
                {/* Fallback for backward compatibility */}
                {!task.title && !task.action && !task.details && task.sub_task_description && (
                  <p className={cn(
                    "text-sm leading-relaxed",
                    task.isCompleted
                      ? "line-through text-muted-foreground"
                      : "text-card-foreground"
                  )}>
                    {task.sub_task_description}
                  </p>
                )}
                
                {/* Time Estimate */}
                {task.estimated_minutes_per_sub_task && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>~{task.estimated_minutes_per_sub_task} minutes</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {tasks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No tasks in this plan
            </p>
          </div>
        )}

        {/* Read-only Notice */}
        {readOnly && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <p className="text-primary text-sm text-center">
              This is a preview of the project plan. To make changes, start a new session or edit the project.
            </p>
          </div>
        )}
      </div>

      <ModalFooter>
        <div className="flex justify-between items-center w-full">
          <div className="text-sm text-muted-foreground">
            {!readOnly && onToggleTask && "Click checkboxes to mark tasks as complete"}
            {readOnly && onTaskSelect && "Click on a task to navigate to it"}
            {readOnly && !onTaskSelect && `${completedTasks}/${tasks.length} tasks completed`}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Close
          </button>
        </div>
      </ModalFooter>
    </Modal>
  );
};