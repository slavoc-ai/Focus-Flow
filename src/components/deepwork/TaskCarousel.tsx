import React, { useEffect, useRef } from 'react';
import { Check, Circle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { EditableTaskField } from '../ui/EditableTaskField';
import { EditableNumberField } from '../ui/EditableNumberField';

interface SubTask {
  id: string;
  title?: string; // Enhanced structure
  action?: string; // Enhanced structure
  details?: string; // Enhanced structure
  sub_task_description?: string; // Backward compatibility
  estimated_minutes_per_sub_task?: number;
  isCompleted: boolean;
}

interface TaskCarouselProps {
  tasks: SubTask[];
  currentTaskIndex: number;
  onTaskComplete: (taskId: string, completed: boolean) => void;
  onTaskIndexChange: (index: number) => void;
  onTaskTextUpdate?: (taskId: string, field: 'title' | 'action' | 'details', newValue: string) => void;
  onTaskTimeUpdate?: (taskId: string, newTime: number | null) => void;
}

export const TaskCarousel: React.FC<TaskCarouselProps> = ({
  tasks,
  currentTaskIndex,
  onTaskComplete,
  onTaskIndexChange,
  onTaskTextUpdate,
  onTaskTimeUpdate
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current task
  useEffect(() => {
    if (carouselRef.current) {
      const taskElement = carouselRef.current.children[currentTaskIndex] as HTMLElement;
      if (taskElement) {
        taskElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [currentTaskIndex]);

  // Handle task completion toggle
  const handleTaskToggle = (task: SubTask) => {
    const newCompletedState = !task.isCompleted;
    onTaskComplete(task.id, newCompletedState);
  };

  // Handle manual task selection
  const handleTaskSelect = (index: number) => {
    onTaskIndexChange(index);
  };

  // Handle text field updates
  const handleTextUpdate = (taskId: string, field: 'title' | 'action' | 'details') => {
    return (newValue: string) => {
      if (onTaskTextUpdate) {
        onTaskTextUpdate(taskId, field, newValue);
      }
    };
  };

  // Handle time estimate updates
  const handleTimeUpdate = (taskId: string) => {
    return (newTime: number | null) => {
      if (onTaskTimeUpdate) {
        onTaskTimeUpdate(taskId, newTime);
      }
    };
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No tasks available
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-foreground mb-6 text-center">
        Enhanced Task Progress
      </h3>
      
      {/* Carousel Container */}
      <div className="relative overflow-hidden">
        <div
          ref={carouselRef}
          className="flex space-x-6 px-4 py-8 overflow-x-auto scrollbar-hide"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {tasks.map((task, index) => {
            const isActive = index === currentTaskIndex;
            const isCompleted = task.isCompleted;
            const isPrevious = index < currentTaskIndex;
            const isNext = index > currentTaskIndex;
            
            return (
              <div
                key={task.id}
                className={cn(
                  "flex-shrink-0 w-80 transition-all duration-500 cursor-pointer",
                  "transform-gpu", // Enable GPU acceleration
                  {
                    // Active task - center, large, fully opaque
                    "scale-100 opacity-100 z-10": isActive,
                    // Previous tasks - smaller, faded, slightly rotated
                    "scale-90 opacity-60 -rotate-2 translate-x-4": isPrevious && !isActive,
                    // Next tasks - smaller, faded, slightly rotated
                    "scale-90 opacity-60 rotate-2 -translate-x-4": isNext && !isActive,
                    // Completed tasks - additional styling
                    "saturate-50": isCompleted && !isActive
                  }
                )}
                style={{
                  scrollSnapAlign: 'center',
                  perspective: '1000px'
                }}
                onClick={() => handleTaskSelect(index)}
              >
                <div
                  className={cn(
                    "bg-card rounded-xl shadow-lg border p-6 h-full",
                    "transition-all duration-300 hover:shadow-xl",
                    {
                      "border-primary shadow-primary/20": isActive,
                      "border-border": !isActive,
                      "bg-palette-success-50 dark:bg-palette-success-900/20 border-palette-success-200 dark:border-palette-success-700": isCompleted
                    }
                  )}
                >
                  {/* Task Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full",
                          isActive 
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}>
                          Task {index + 1}
                        </span>
                        {task.estimated_minutes_per_sub_task && (
                          <span className="text-xs text-muted-foreground">
                            ~{task.estimated_minutes_per_sub_task} min
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Completion Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskToggle(task);
                      }}
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200",
                        "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2",
                        isCompleted
                          ? "bg-palette-success-500 text-white hover:bg-palette-success-600 focus:ring-palette-success-500"
                          : "border-2 border-border hover:border-primary focus:ring-primary"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Circle className="w-4 h-4 opacity-0" />
                      )}
                    </button>
                  </div>

                  {/* Enhanced Task Content with Inline Editing for Active Task */}
                  <div className="mb-4 space-y-3">
                    {/* Task Title */}
                    {isActive && onTaskTextUpdate ? (
                      <EditableTaskField
                        value={task.title || 'Task'}
                        onSave={handleTextUpdate(task.id, 'title')}
                        placeholder="Enter task title..."
                        variant="title"
                        maxLength={100}
                      />
                    ) : (
                      <h4 className={cn(
                        "font-bold text-lg leading-tight",
                        isCompleted 
                          ? "line-through text-muted-foreground"
                          : "text-card-foreground",
                        isActive && "text-primary"
                      )}>
                        {task.title || 'Task'}
                      </h4>
                    )}
                    
                    {/* Immediate Action */}
                    {isActive && onTaskTextUpdate ? (
                      <EditableTaskField
                        value={task.action || task.sub_task_description || ''}
                        onSave={handleTextUpdate(task.id, 'action')}
                        placeholder="Enter immediate action..."
                        variant="action"
                        maxLength={200}
                      />
                    ) : (
                      <p className={cn(
                        "font-medium",
                        isCompleted 
                          ? "line-through text-muted-foreground"
                          : "text-primary",
                        isActive && "font-semibold"
                      )}>
                        {task.action || task.sub_task_description || ''}
                      </p>
                    )}
                    
                    {/* Detailed Explanation */}
                    {isActive && onTaskTextUpdate ? (
                      <EditableTaskField
                        value={task.details || task.sub_task_description || ''}
                        onSave={handleTextUpdate(task.id, 'details')}
                        placeholder="Enter detailed explanation..."
                        variant="details"
                        multiline={true}
                        maxLength={500}
                      />
                    ) : (
                      task.details && (
                        <p className={cn(
                          "text-sm leading-relaxed",
                          isCompleted 
                            ? "line-through text-muted-foreground"
                            : "text-muted-foreground"
                        )}>
                          {task.details}
                        </p>
                      )
                    )}

                    {/* Time Estimate - Editable for Active Task */}
                    {isActive && onTaskTimeUpdate ? (
                      <EditableNumberField
                        value={task.estimated_minutes_per_sub_task}
                        onSave={handleTimeUpdate(task.id)}
                        placeholder="Add time estimate..."
                        min={1}
                        max={480}
                        unit="minutes"
                        allowNull={true}
                      />
                    ) : (
                      task.estimated_minutes_per_sub_task && (
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>~{task.estimated_minutes_per_sub_task} minutes</span>
                        </div>
                      )
                    )}
                  </div>

                  {/* Active Task Indicator */}
                  {isActive && (
                    <div className="flex items-center justify-center">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      <span className="ml-2 text-xs font-medium text-primary">
                        Current Task {onTaskTextUpdate ? '(Editable)' : ''}
                      </span>
                    </div>
                  )}

                  {/* Completed Task Indicator */}
                  {isCompleted && !isActive && (
                    <div className="flex items-center justify-center">
                      <Check className="w-4 h-4 text-palette-success-500" />
                      <span className="ml-2 text-xs font-medium text-palette-success-600 dark:text-palette-success-400">
                        Completed
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Dots */}
      <div className="flex justify-center space-x-2 mt-6">
        {tasks.map((_, index) => (
          <button
            key={index}
            onClick={() => handleTaskSelect(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-200",
              index === currentTaskIndex
                ? "bg-primary scale-125"
                : tasks[index].isCompleted
                ? "bg-palette-success-400"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
            )}
          />
        ))}
      </div>

      {/* Progress Summary */}
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground">
          {tasks.filter(task => task.isCompleted).length} of {tasks.length} tasks completed
        </p>
        {onTaskTextUpdate && (
          <p className="text-xs text-primary mt-1">
            Click on the current task fields to edit them
          </p>
        )}
      </div>
    </div>
  );
};