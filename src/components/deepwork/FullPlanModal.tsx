import React from 'react';
import { Modal, ModalHeader, ModalFooter } from '../ui/Modal';
import { Check, Circle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SubTask {
  id: string;
  sub_task_description: string;
  estimated_minutes_per_sub_task?: number;
  isCompleted: boolean;
}

interface FullPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: SubTask[];
  mainTask: string;
  onTaskSelect?: (taskId: string) => void;
}

export const FullPlanModal: React.FC<FullPlanModalProps> = ({
  isOpen,
  onClose,
  tasks,
  mainTask,
  onTaskSelect
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Full Plan Overview"
      description="Review all tasks in your current plan"
      className="max-w-2xl"
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
                "flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200",
                "hover:bg-muted/50",
                onTaskSelect && "cursor-pointer hover:border-primary/50",
                task.isCompleted
                  ? "bg-palette-success-50 dark:bg-palette-success-900/20 border-palette-success-200 dark:border-palette-success-800"
                  : "bg-card border-border"
              )}
              onClick={() => handleTaskClick(task.id)}
            >
              {/* Task Number & Status */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                <span className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full",
                  task.isCompleted
                    ? "bg-palette-success-100 text-palette-success-700 dark:bg-palette-success-900/30 dark:text-palette-success-300"
                    : "bg-muted text-muted-foreground"
                )}>
                  {index + 1}
                </span>
                
                <div className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full",
                  task.isCompleted
                    ? "bg-palette-success-500 text-white"
                    : "border-2 border-border"
                )}>
                  {task.isCompleted ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Circle className="w-3 h-3 opacity-0" />
                  )}
                </div>
              </div>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm leading-relaxed",
                  task.isCompleted
                    ? "line-through text-muted-foreground"
                    : "text-card-foreground"
                )}>
                  {task.sub_task_description}
                </p>
                
                {task.estimated_minutes_per_sub_task && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center space-x-1">
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
      </div>

      <ModalFooter>
        <div className="flex justify-between items-center w-full">
          <div className="text-sm text-muted-foreground">
            {onTaskSelect && "Click on a task to navigate to it"}
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