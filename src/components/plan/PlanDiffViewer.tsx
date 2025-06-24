import React from 'react';
import { Button } from '../ui/Button';
import { Check, X, Plus, Minus, ArrowUpDown, Edit3 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface Modification {
  operation: 'update' | 'add' | 'delete' | 'reorder';
  taskId?: string;
  changes?: Record<string, any>;
  afterTaskId?: string;
  newTask?: {
    id: string;
    title: string;
    action: string;
    details: string;
    estimated_minutes_per_sub_task?: number;
  };
  newOrder?: string[];
}

interface PlanTask {
  id: string;
  title: string;
  action: string;
  details: string;
  estimatedMinutes?: number;
}

interface PlanDiffViewerProps {
  originalPlan: PlanTask[];
  modifications: Modification[];
  newProjectTitle?: string;
  originalProjectTitle: string;
  explanation?: string;
  onAccept: () => void;
  onDiscard: () => void;
  className?: string;
}

export const PlanDiffViewer: React.FC<PlanDiffViewerProps> = ({
  originalPlan,
  modifications,
  newProjectTitle,
  originalProjectTitle,
  explanation,
  onAccept,
  onDiscard,
  className
}) => {
  // Helper function to get modification for a task
  const getModificationForTask = (taskId: string) => {
    return modifications.find(mod => mod.taskId === taskId);
  };

  // Helper function to check if task will be deleted
  const isTaskDeleted = (taskId: string) => {
    return modifications.some(mod => mod.operation === 'delete' && mod.taskId === taskId);
  };

  // Helper function to get new tasks to be added
  const getNewTasks = () => {
    return modifications.filter(mod => mod.operation === 'add');
  };

  // Helper function to get reorder modification
  const getReorderModification = () => {
    return modifications.find(mod => mod.operation === 'reorder');
  };

  // Render a field diff
  const renderFieldDiff = (label: string, oldValue: any, newValue: any) => {
    if (oldValue === newValue) return null;

    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}:</p>
        {oldValue && (
          <p className="text-sm text-destructive line-through bg-destructive/10 px-2 py-1 rounded">
            {oldValue}
          </p>
        )}
        <p className="text-sm text-palette-success-600 bg-palette-success-50 dark:bg-palette-success-900/20 px-2 py-1 rounded">
          {newValue}
        </p>
      </div>
    );
  };

  const reorderMod = getReorderModification();

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header - Fixed at top */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Edit3 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-primary mb-2">
              Co-pilot Suggestions
            </h3>
            {explanation && (
              <p className="text-sm text-muted-foreground mb-4">
                {explanation}
              </p>
            )}
            <div className="flex items-center space-x-4 text-sm">
              <span className="flex items-center space-x-1">
                <Plus className="w-3 h-3 text-palette-success-500" />
                <span>{modifications.filter(m => m.operation === 'add').length} additions</span>
              </span>
              <span className="flex items-center space-x-1">
                <Edit3 className="w-3 h-3 text-primary" />
                <span>{modifications.filter(m => m.operation === 'update').length} updates</span>
              </span>
              <span className="flex items-center space-x-1">
                <Minus className="w-3 h-3 text-destructive" />
                <span>{modifications.filter(m => m.operation === 'delete').length} deletions</span>
              </span>
              {reorderMod && (
                <span className="flex items-center space-x-1">
                  <ArrowUpDown className="w-3 h-3 text-accent" />
                  <span>reordered</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Project Title Change */}
      {newProjectTitle && newProjectTitle !== originalProjectTitle && (
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <h4 className="font-medium text-card-foreground mb-3">Project Title</h4>
          {renderFieldDiff('Title', originalProjectTitle, newProjectTitle)}
        </div>
      )}

      {/* Scrollable Task Changes Container */}
      <div className="flex-1 overflow-y-auto max-h-[50vh] mb-4 pr-1">
        <div className="space-y-4">
          <h4 className="font-medium text-card-foreground">Task Changes</h4>
          
          {/* Show reorder notice */}
          {reorderMod && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <ArrowUpDown className="w-4 h-4 text-accent" />
                <span className="font-medium text-accent">Tasks will be reordered</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The task order will be changed according to your request.
              </p>
            </div>
          )}

          {/* Existing tasks (updates and deletions) */}
          {originalPlan.map((task, index) => {
            const modification = getModificationForTask(task.id);
            const isDeleted = isTaskDeleted(task.id);
            
            if (!modification && !isDeleted) return null;

            return (
              <div
                key={task.id}
                className={cn(
                  "bg-card border rounded-lg p-4",
                  isDeleted ? "border-destructive/50 bg-destructive/5" : "border-border"
                )}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {isDeleted ? (
                      <div className="p-1 bg-destructive/10 rounded">
                        <Minus className="w-3 h-3 text-destructive" />
                      </div>
                    ) : (
                      <div className="p-1 bg-primary/10 rounded">
                        <Edit3 className="w-3 h-3 text-primary" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium px-2 py-1 bg-muted rounded-full">
                        Task {index + 1}
                      </span>
                      {isDeleted && (
                        <span className="text-xs font-medium px-2 py-1 bg-destructive/10 text-destructive rounded-full">
                          Will be deleted
                        </span>
                      )}
                    </div>

                    {isDeleted ? (
                      <div className="space-y-2 opacity-60">
                        <p className="font-medium line-through text-destructive">{task.title}</p>
                        <p className="text-sm line-through text-destructive">{task.action}</p>
                        {task.details && (
                          <p className="text-sm line-through text-destructive">{task.details}</p>
                        )}
                      </div>
                    ) : modification?.operation === 'update' && modification.changes ? (
                      <div className="space-y-3">
                        {renderFieldDiff('Title', task.title, modification.changes.title || task.title)}
                        {renderFieldDiff('Action', task.action, modification.changes.action || task.action)}
                        {renderFieldDiff('Details', task.details, modification.changes.details || task.details)}
                        {renderFieldDiff(
                          'Estimated Time', 
                          task.estimatedMinutes ? `${task.estimatedMinutes} min` : 'Not set',
                          modification.changes.estimated_minutes_per_sub_task 
                            ? `${modification.changes.estimated_minutes_per_sub_task} min`
                            : task.estimatedMinutes ? `${task.estimatedMinutes} min` : 'Not set'
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {/* New tasks (additions) */}
          {getNewTasks().map((modification, index) => {
            if (!modification.newTask) return null;

            return (
              <div
                key={`new-${index}`}
                className="bg-palette-success-50 dark:bg-palette-success-900/20 border border-palette-success-200 dark:border-palette-success-800 rounded-lg p-4"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="p-1 bg-palette-success-100 dark:bg-palette-success-900/30 rounded">
                      <Plus className="w-3 h-3 text-palette-success-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium px-2 py-1 bg-palette-success-100 dark:bg-palette-success-900/30 text-palette-success-700 dark:text-palette-success-300 rounded-full">
                        New Task
                      </span>
                      {modification.afterTaskId && (
                        <span className="text-xs text-muted-foreground">
                          (after task {originalPlan.findIndex(t => t.id === modification.afterTaskId) + 1})
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="font-medium text-palette-success-800 dark:text-palette-success-200">
                        {modification.newTask.title}
                      </p>
                      <p className="text-sm text-palette-success-700 dark:text-palette-success-300">
                        {modification.newTask.action}
                      </p>
                      {modification.newTask.details && (
                        <p className="text-sm text-palette-success-600 dark:text-palette-success-400">
                          {modification.newTask.details}
                        </p>
                      )}
                      {modification.newTask.estimated_minutes_per_sub_task && (
                        <p className="text-xs text-palette-success-600 dark:text-palette-success-400">
                          Estimated: {modification.newTask.estimated_minutes_per_sub_task} minutes
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons - Fixed at bottom */}
      <div className="flex items-center justify-between pt-4 border-t border-border sticky bottom-0 bg-card">
        <div className="text-sm text-muted-foreground">
          Review the changes above and choose to accept or discard them.
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="ghost"
            onClick={onDiscard}
            className="flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Discard</span>
          </Button>
          
          <Button
            onClick={onAccept}
            className="flex items-center space-x-2"
          >
            <Check className="w-4 h-4" />
            <span>Accept Changes</span>
          </Button>
        </div>
      </div>
    </div>
  );
};