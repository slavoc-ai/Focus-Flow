import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PomodoroTimer } from '../components/deepwork/PomodoroTimer';
import { TaskCarousel } from '../components/deepwork/TaskCarousel';
import { FullPlanModal, SubTaskForModal } from '../components/deepwork/FullPlanModal';
import { PlanCoPilot } from '../components/plan/PlanCoPilot';
import { PlanDiffViewer, Modification } from '../components/plan/PlanDiffViewer';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { List, X, Save, Sparkles } from 'lucide-react';
import { sessionService, SessionDetails, SubTaskUpdate } from '../services/sessionService';
import { planService } from '../services/planService';
import { projectService, NewSubTaskForCreation } from '../services/projectService';

interface SubTask {
  id: string;
  title: string; // Enhanced structure
  action: string; // Enhanced structure
  details: string; // Enhanced structure
  estimated_minutes_per_sub_task?: number;
  isCompleted: boolean;
  // Keep for backward compatibility
  sub_task_description?: string;
}

interface SessionData {
  project_id: string;
  mainTask: string;
  subTasks: SubTask[];
  pomodorosCompleted: number;
  totalFocusedTime: number; // in minutes
  sessionStartTime: Date;
}

const DeepWorkPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Get plan data from navigation state
  const planData = location.state?.plan || [];
  const mainTask = location.state?.mainTask || 'Deep Work Session';
  const projectId = location.state?.projectId;
  
  // Convert plan data to enhanced SubTask format
  const [subTasks, setSubTasks] = useState<SubTask[]>(() => {
    return planData.map((task: any, index: number) => ({
      id: task.id || `task-${index + 1}`,
      // Enhanced structure with fallbacks for backward compatibility
      title: task.title || `Task ${index + 1}`,
      action: task.action || task.description || task.sub_task_description || '',
      details: task.details || task.description || task.sub_task_description || '',
      estimated_minutes_per_sub_task: task.estimatedMinutes || task.estimated_minutes_per_sub_task,
      isCompleted: task.completed || task.isCompleted || false,
      // Keep for backward compatibility
      sub_task_description: task.sub_task_description || task.description || task.action
    }));
  });

  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [showFullPlanModal, setShowFullPlanModal] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData>({
    project_id: projectId,
    mainTask,
    subTasks,
    pomodorosCompleted: 0,
    totalFocusedTime: 0,
    sessionStartTime: new Date()
  });

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Co-pilot local state
  const [isCoPilotModalOpen, setIsCoPilotModalOpen] = useState(false);
  const [isCoPilotLoading, setIsCoPilotLoading] = useState(false);
  const [coPilotModifications, setCoPilotModifications] = useState<{
    modifications: Modification[];
    newProjectTitle?: string;
    explanation?: string;
  } | null>(null);

  // Project initialization state - project should always be initialized when entering this page
  const [isProjectInitialized] = useState(!!projectId);

  // Helper function to apply modifications to the current plan
  const applyModifications = (currentTasks: SubTask[], modifications: Modification[]): SubTask[] => {
    let newTasks = [...currentTasks];

    // Process modifications in order
    for (const mod of modifications) {
      switch (mod.operation) {
        case 'update':
          if (mod.taskId && mod.changes) {
            const taskIndex = newTasks.findIndex(task => task.id === mod.taskId);
            if (taskIndex !== -1) {
              newTasks[taskIndex] = {
                ...newTasks[taskIndex],
                title: mod.changes.title || newTasks[taskIndex].title,
                action: mod.changes.action || newTasks[taskIndex].action,
                details: mod.changes.details || newTasks[taskIndex].details,
                estimated_minutes_per_sub_task: mod.changes.estimated_minutes_per_sub_task || newTasks[taskIndex].estimated_minutes_per_sub_task
              };
            }
          }
          break;

        case 'add':
          if (mod.newTask) {
            const newTask: SubTask = {
              id: mod.newTask.id,
              title: mod.newTask.title,
              action: mod.newTask.action,
              details: mod.newTask.details,
              estimated_minutes_per_sub_task: mod.newTask.estimated_minutes_per_sub_task,
              isCompleted: false,
              sub_task_description: mod.newTask.action // Backward compatibility
            };

            if (mod.afterTaskId) {
              const insertIndex = newTasks.findIndex(task => task.id === mod.afterTaskId) + 1;
              newTasks.splice(insertIndex, 0, newTask);
            } else {
              newTasks.unshift(newTask); // Add at beginning
            }
          }
          break;

        case 'delete':
          if (mod.taskId) {
            newTasks = newTasks.filter(task => task.id !== mod.taskId);
          }
          break;

        case 'reorder':
          if (mod.newOrder) {
            const reorderedTasks = mod.newOrder.map(taskId => 
              newTasks.find(task => task.id === taskId)
            ).filter(Boolean) as SubTask[];
            newTasks = reorderedTasks;
          }
          break;
      }
    }

    return newTasks;
  };

  // Co-pilot handlers
  const handleCoPilotCommand = async (command: string) => {
    setIsCoPilotLoading(true);
    setCoPilotModifications(null);
    
    try {
      console.log('🤖 Processing Co-pilot command in DeepWorkPage:', command);

      // Prepare current plan for Co-pilot
      const currentPlan = {
        project_title: mainTask,
        sub_tasks: subTasks.map(task => ({
          id: task.id,
          title: task.title,
          action: task.action,
          details: task.details,
          estimated_minutes_per_sub_task: task.estimated_minutes_per_sub_task
        }))
      };

      // Get document context from location state if available
      const documentContext = location.state?.documentFiles?.length > 0 
        ? `Documents processed: ${location.state.documentFiles.join(', ')}`
        : undefined;

      // Call Co-pilot service
      const result = await planService.refinePlanWithAI(command, currentPlan, documentContext);

      if (!result.success) {
        throw new Error(result.error || 'Co-pilot refinement failed');
      }

      console.log('✅ Co-pilot refinement successful in DeepWorkPage:', {
        modificationsCount: result.modifications.length,
        hasNewTitle: !!result.newProjectTitle
      });

      // Set proposed modifications for review
      setCoPilotModifications({
        modifications: result.modifications,
        newProjectTitle: result.newProjectTitle,
        explanation: result.explanation
      });

    } catch (error) {
      console.error('❌ Co-pilot error in DeepWorkPage:', error);
      setSaveError(error instanceof Error ? error.message : 'Co-pilot refinement failed');
    } finally {
      setIsCoPilotLoading(false);
    }
  };

  const handleAcceptModifications = () => {
    if (!coPilotModifications) return;

    console.log('✅ Applying Co-pilot modifications in DeepWorkPage:', coPilotModifications.modifications.length);

    // Apply modifications to the current plan
    const updatedTasks = applyModifications(subTasks, coPilotModifications.modifications);
    
    // Update local state directly
    setSubTasks(updatedTasks);
    
    // Update session data
    setSessionData(prev => ({ ...prev, subTasks: updatedTasks }));

    // Update main task if title changed
    if (coPilotModifications.newProjectTitle) {
      setSessionData(prev => ({ ...prev, mainTask: coPilotModifications.newProjectTitle! }));
    }

    // Reset Co-pilot state and close modal
    setCoPilotModifications(null);
    setIsCoPilotModalOpen(false);

    // Show success message
    setShowSuccessToast(true);
  };

  const handleDiscardModifications = () => {
    setCoPilotModifications(null); // Just clear the diff, stay in the modal
  };

  const handleCloseCoPilotModal = () => {
    setCoPilotModifications(null); // Always clear diffs when closing
    setIsCoPilotModalOpen(false);
  };

  // Find the next uncompleted task
  const findNextUncompletedTask = () => {
    const nextIndex = subTasks.findIndex((task, index) => 
      index >= currentTaskIndex && !task.isCompleted
    );
    return nextIndex !== -1 ? nextIndex : subTasks.findIndex(task => !task.isCompleted);
  };

  // Enhanced task completion handler for FullPlanModal integration
  const handleTaskComplete = (taskId: string, completed: boolean) => {
    const updatedTasks = subTasks.map(task => 
      task.id === taskId ? { ...task, isCompleted: completed } : task
    );
    
    setSubTasks(updatedTasks);
    setSessionData(prev => ({ ...prev, subTasks: updatedTasks }));

    // Auto-advance to next uncompleted task when ANY task is completed
    const taskIndex = subTasks.findIndex(task => task.id === taskId);
    if (completed) {
      // Find the next uncompleted task from the updated tasks
      const nextUncompletedIndex = updatedTasks.findIndex((task, index) => 
        !task.isCompleted && index > taskIndex
      );
      
      // If no uncompleted task found after current, find the first uncompleted task
      const finalNextIndex = nextUncompletedIndex !== -1 
        ? nextUncompletedIndex 
        : updatedTasks.findIndex(task => !task.isCompleted);
      
      // Only advance if we found an uncompleted task and it's different from current
      if (finalNextIndex !== -1 && finalNextIndex !== currentTaskIndex) {
        setTimeout(() => {
          setCurrentTaskIndex(finalNextIndex);
        }, 300); // Small delay for smooth transition
      }
    }
  };

  // NEW: Handle task text updates (title, action, details)
  const handleTaskTextUpdate = (taskId: string, field: 'title' | 'action' | 'details', newValue: string) => {
    console.log(`📝 Updating task ${taskId} field ${field}:`, newValue);
    
    const updatedTasks = subTasks.map(task => 
      task.id === taskId ? { ...task, [field]: newValue } : task
    );
    
    setSubTasks(updatedTasks);
    setSessionData(prev => ({ ...prev, subTasks: updatedTasks }));
  };

  // NEW: Handle task time estimate updates
  const handleTaskTimeUpdate = (taskId: string, newTime: number | null) => {
    console.log(`⏱️ Updating task ${taskId} time estimate:`, newTime);
    
    const updatedTasks = subTasks.map(task => 
      task.id === taskId ? { ...task, estimated_minutes_per_sub_task: newTime || undefined } : task
    );
    
    setSubTasks(updatedTasks);
    setSessionData(prev => ({ ...prev, subTasks: updatedTasks }));
  };

  // Handle task selection from FullPlanModal
  const handleTaskSelect = (taskId: string) => {
    const taskIndex = subTasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
      setCurrentTaskIndex(taskIndex);
      setShowFullPlanModal(false);
    }
  };

  // Handle Pomodoro completion
  const handlePomodoroComplete = (focusedMinutes: number) => {
    setSessionData(prev => ({
      ...prev,
      pomodorosCompleted: prev.pomodorosCompleted + 1,
      totalFocusedTime: prev.totalFocusedTime + focusedMinutes
    }));
  };

  // Save session progress
  const saveSessionProgress = async (isEndingSession: boolean = false) => {
    if (!user || !projectId || !isProjectInitialized) {
      console.warn('⚠️ Cannot save session: missing user, project ID, or project not initialized');
      return { success: false, error: 'Project not ready for saving' };
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      // Identify tasks with temporary IDs (added by Co-pilot)
      const tasksToCreate = subTasks.filter(task => task.id.startsWith('task-') || task.id.startsWith('temp-'));
      const existingTasks = subTasks.filter(task => !task.id.startsWith('task-') && !task.id.startsWith('temp-'));

      console.log('🔍 Checking for tasks to create:', {
        tasksToCreateCount: tasksToCreate.length,
        existingTasksCount: existingTasks.length,
        totalTasks: subTasks.length
      });

      // If there are new tasks, create them in the database first
      let finalSubTasks = [...subTasks];
      if (tasksToCreate.length > 0) {
        console.log('🚀 Creating new tasks in database:', tasksToCreate.length);

        // Prepare tasks for creation
        const newTasksForCreation: NewSubTaskForCreation[] = tasksToCreate.map(task => ({
          tempId: task.id,
          title: task.title,
          action: task.action,
          details: task.details,
          description: task.sub_task_description || task.details,
          estimated_minutes_per_sub_task: task.estimated_minutes_per_sub_task,
          is_completed: task.isCompleted
        }));

        // Create the tasks in the database
        const { createdTasks, tempIdMap, success, error } = await projectService.addSubTasksToProject(
          projectId,
          user.id,
          newTasksForCreation
        );

        if (!success || !createdTasks) {
          throw new Error(error || 'Failed to create new tasks');
        }

        console.log('✅ New tasks created successfully:', {
          count: createdTasks.length,
          tempIdMap
        });

        // Update the local state with the new database IDs
        finalSubTasks = subTasks.map(task => {
          // If this is a temporary task, replace it with the database version
          if (task.id.startsWith('task-') || task.id.startsWith('temp-')) {
            const newId = tempIdMap[task.id];
            if (newId) {
              const dbTask = createdTasks.find(t => t.id === newId);
              if (dbTask) {
                return {
                  ...task,
                  id: dbTask.id
                };
              }
            }
          }
          return task;
        });

        // Update the component state
        setSubTasks(finalSubTasks);
        setSessionData(prev => ({ ...prev, subTasks: finalSubTasks }));

        console.log('✅ Local state updated with database IDs');
      }

      // Prepare sub-task updates with ALL editable fields
      const subTaskUpdates: SubTaskUpdate[] = finalSubTasks.map(task => ({
        id: task.id,
        title: task.title,
        action: task.action,
        details: task.details,
        estimated_minutes_per_sub_task: task.estimated_minutes_per_sub_task,
        is_completed: task.isCompleted
      }));

      // Prepare session details
      const sessionDetails: SessionDetails = {
        pomodoros_completed: sessionData.pomodorosCompleted,
        total_focused_minutes: sessionData.totalFocusedTime,
        start_time: sessionData.sessionStartTime,
        end_time: new Date(),
        notes: undefined // Could be added in future
      };

      console.log('💾 Saving enhanced session progress with Co-pilot changes...', {
        projectId,
        subTaskUpdates: subTaskUpdates.length,
        sessionDetails,
        hasTextEdits: subTaskUpdates.some(task => task.title || task.action || task.details)
      });

      const result = await sessionService.saveSessionProgress(
        projectId,
        subTaskUpdates,
        sessionDetails,
        user.id
      );

      if (result.success) {
        console.log('✅ Enhanced session with Co-pilot changes saved successfully');
        if (!isEndingSession) {
          setShowSuccessToast(true);
        }
        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to save session');
      }

    } catch (error) {
      console.error('❌ Error saving enhanced session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save session';
      setSaveError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSaving(false);
    }
  };

  // Handle session end
  const handleEndSession = async () => {
    console.log('🏁 Ending enhanced session with Co-pilot changes...');
    
    const saveResult = await saveSessionProgress(true);
    
    if (saveResult.success) {
      // Navigate to dashboard or project list
      navigate('/dashboard', {
        state: {
          sessionCompleted: true,
          sessionSummary: {
            ...sessionData,
            subTasks: subTasks,
            sessionEndTime: new Date(),
            totalSessionTime: Math.floor((Date.now() - sessionData.sessionStartTime.getTime()) / 1000 / 60)
          }
        }
      });
    }
    // If save failed, user can still navigate but we've shown an error
  };

  // Handle manual save
  const handleManualSave = async () => {
    await saveSessionProgress(false);
  };

  // Handle interruption (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (!user || !projectId || !isProjectInitialized) return;

      // Check if all sub-tasks have valid UUIDs before saving
      const hasInvalidIds = subTasks.some(task => !task.id || task.id.startsWith('task-'));
      if (hasInvalidIds) return;

      // Best-effort save of current state
      try {
        await sessionService.saveInterruptedSession(
          projectId,
          subTasks.map(task => ({
            id: task.id,
            title: task.title,
            action: task.action,
            details: task.details,
            estimated_minutes_per_sub_task: task.estimated_minutes_per_sub_task,
            is_completed: task.isCompleted
          })),
          {
            pomodoros_completed: sessionData.pomodorosCompleted,
            total_focused_minutes: sessionData.totalFocusedTime,
            start_time: sessionData.sessionStartTime
          },
          user.id
        );
        console.log('💾 Interrupted enhanced session with Co-pilot changes saved');
      } catch (error) {
        console.warn('⚠️ Failed to save interrupted enhanced session:', error);
      }
      
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, sessionData, subTasks, isProjectInitialized, projectId]);

  // Check if all tasks are completed
  const allTasksCompleted = subTasks.every(task => task.isCompleted);

  // Check if actions should be disabled
  const actionsDisabled = !isProjectInitialized || isSaving;

  // Redirect if no plan data or project ID
  if (!planData || planData.length === 0 || !projectId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <h2 className="text-2xl font-bold text-foreground">
          {!projectId ? 'No Project Available' : 'No Plan Available'}
        </h2>
        <p className="text-muted-foreground text-center max-w-md">
          {!projectId 
            ? 'Please create a project first before starting a deep work session.'
            : 'Please create a plan first before starting a deep work session.'
          }
        </p>
        <Button onClick={() => navigate('/')}>
          Create New Plan
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-card-foreground">
                Enhanced Deep Work Session
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {sessionData.mainTask}
              </p>
              {isSaving && (
                <p className="text-xs text-primary mt-1">
                  Saving progress...
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Co-pilot Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCoPilotModalOpen(true)}
                disabled={actionsDisabled || isCoPilotLoading}
                className="flex items-center space-x-2 border-primary/50 text-primary hover:bg-primary/10"
              >
                <Sparkles className="w-4 h-4" />
                <span>Refine Plan</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualSave}
                disabled={actionsDisabled}
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Progress</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullPlanModal(true)}
                className="flex items-center space-x-2"
              >
                <List className="w-4 h-4" />
                <span>View Full Plan</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleEndSession}
                disabled={actionsDisabled}
                className="flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>End Session</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {saveError && (
        <div className="bg-destructive/10 border-b border-destructive/20">
          <div className="container mx-auto px-4 py-3">
            <p className="text-destructive text-sm">
              Error: {saveError}
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Pomodoro Timer */}
          <div className="flex justify-center">
            <PomodoroTimer
              onPomodoroComplete={handlePomodoroComplete}
              isSessionActive={!allTasksCompleted}
            />
          </div>

          {/* Enhanced Task Carousel with Editing */}
          {!allTasksCompleted ? (
            <TaskCarousel
              tasks={subTasks}
              currentTaskIndex={currentTaskIndex}
              onTaskComplete={handleTaskComplete}
              onTaskIndexChange={setCurrentTaskIndex}
              onTaskTextUpdate={handleTaskTextUpdate}
              onTaskTimeUpdate={handleTaskTimeUpdate}
            />
          ) : (
            <div className="text-center py-12">
              <div className="bg-palette-success-50 rounded-lg p-8 border border-palette-success-200">
                <h2 className="text-2xl font-bold text-palette-success-800 mb-4">
                  🎉 All Tasks Completed!
                </h2>
                <p className="text-palette-success-700 mb-6">
                  Congratulations! You've completed all tasks in your enhanced plan.
                </p>
                <div className="space-y-2 text-sm text-palette-success-600">
                  <p>Pomodoros completed: {sessionData.pomodorosCompleted}</p>
                  <p>Total focused time: {sessionData.totalFocusedTime} minutes</p>
                </div>
                <Button
                  onClick={handleEndSession}
                  disabled={actionsDisabled}
                  className="mt-6"
                >
                  {isSaving ? 'Saving...' : 'End Session'}
                </Button>
              </div>
            </div>
          )}

          {/* Session Stats */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              Session Progress
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {subTasks.filter(task => task.isCompleted).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Tasks Completed
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">
                  {sessionData.pomodorosCompleted}
                </div>
                <div className="text-sm text-muted-foreground">
                  Pomodoros Done
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">
                  {sessionData.totalFocusedTime}
                </div>
                <div className="text-sm text-muted-foreground">
                  Minutes Focused
                </div>
              </div>
            </div>

            {projectId && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Enhanced Project ID: {projectId.substring(0, 8)}... • 
                  {isProjectInitialized ? ' Auto-saving enabled with text edits' : ' Initializing project...'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Co-pilot Modal */}
      <Modal
        isOpen={isCoPilotModalOpen}
        onClose={handleCloseCoPilotModal}
        title="Refine Plan with Co-pilot ✨"
        className="max-w-4xl"
      >
        <div className="p-4 space-y-6">
          {/* Co-pilot Command Input */}
          <PlanCoPilot
            isOpen={true}
            onClose={() => {}}
            onSubmit={handleCoPilotCommand}
            isLoading={isCoPilotLoading}
            className="static bg-transparent border-0 shadow-none"
          />

          {/* Diff Viewer */}
          {coPilotModifications && (
            <PlanDiffViewer
              originalPlan={subTasks}
              modifications={coPilotModifications.modifications}
              newProjectTitle={coPilotModifications.newProjectTitle}
              originalProjectTitle={sessionData.mainTask}
              explanation={coPilotModifications.explanation}
              onAccept={handleAcceptModifications}
              onDiscard={handleDiscardModifications}
            />
          )}

          {/* Help Text */}
          {!coPilotModifications && !isCoPilotLoading && (
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="mb-2">
                <strong>How to use the Co-pilot:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Type a command like "Make all tasks 10 minutes long" or "Add a final review step"</li>
                <li>The Co-pilot will analyze your plan and suggest changes</li>
                <li>Review the suggested changes and accept or discard them</li>
                <li>Changes will be applied to your current session</li>
              </ul>
            </div>
          )}
        </div>
      </Modal>

      {/* Enhanced Full Plan Modal with Interactive Features */}
      <FullPlanModal
        isOpen={showFullPlanModal}
        onClose={() => setShowFullPlanModal(false)}
        tasks={subTasks.map(task => ({
          id: task.id,
          title: task.title,
          action: task.action,
          details: task.details,
          sub_task_description: task.sub_task_description,
          estimated_minutes_per_sub_task: task.estimated_minutes_per_sub_task,
          isCompleted: task.isCompleted
        }))}
        mainTask={sessionData.mainTask}
        onToggleTask={handleTaskComplete} // Enable interactive checkboxes
        onTaskSelect={handleTaskSelect} // Enable task navigation
        onTaskTextUpdate={handleTaskTextUpdate} // NEW: Enable text editing
        onTaskTimeUpdate={handleTaskTimeUpdate} // NEW: Enable time editing
        readOnly={false} // This is an interactive session modal
        onRefinePlan={() => {
          setShowFullPlanModal(false);
          setIsCoPilotModalOpen(true);
        }}
      />

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            variant="success"
            title="Success!"
            description={coPilotModifications ? "Co-pilot changes applied successfully." : "Progress saved successfully."}
            onClose={() => setShowSuccessToast(false)}
            duration={3000}
          />
        </div>
      )}
    </div>
  );
};

export default DeepWorkPage;