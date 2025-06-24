import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PomodoroTimer } from '../components/deepwork/PomodoroTimer';
import { TaskCarousel } from '../components/deepwork/TaskCarousel';
import { FullPlanModal, SubTaskForModal } from '../components/deepwork/FullPlanModal';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { List, X, Save } from 'lucide-react';
import { sessionService, SessionDetails, SubTaskUpdate } from '../services/sessionService';

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

  // Project initialization state - project should always be initialized when entering this page
  const [isProjectInitialized] = useState(!!projectId);

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

    // Check if all sub-tasks have valid UUIDs
    const hasInvalidIds = subTasks.some(task => !task.id || task.id.startsWith('task-'));
    if (hasInvalidIds) {
      console.warn('⚠️ Cannot save session: sub-tasks still have temporary IDs');
      return { success: false, error: 'Sub-tasks not properly initialized' };
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      // Prepare sub-task updates with ALL editable fields
      const subTaskUpdates: SubTaskUpdate[] = subTasks.map(task => ({
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

      console.log('💾 Saving enhanced session progress with text edits...', {
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
        console.log('✅ Enhanced session with text edits saved successfully');
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
    console.log('🏁 Ending enhanced session with text edits...');
    
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
        console.log('💾 Interrupted enhanced session with text edits saved');
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
                {mainTask}
              </p>
              {isSaving && (
                <p className="text-xs text-primary mt-1">
                  Saving progress...
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
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
              Error saving session: {saveError}
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
        mainTask={mainTask}
        onToggleTask={handleTaskComplete} // Enable interactive checkboxes
        onTaskSelect={handleTaskSelect} // Enable task navigation
        onTaskTextUpdate={handleTaskTextUpdate} // NEW: Enable text editing
        onTaskTimeUpdate={handleTaskTimeUpdate} // NEW: Enable time editing
        readOnly={false} // This is an interactive session modal
      />

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            variant="success"
            title="Progress Saved"
            description="Your enhanced session progress with text edits has been saved successfully."
            onClose={() => setShowSuccessToast(false)}
            duration={3000}
          />
        </div>
      )}
    </div>
  );
};

export default DeepWorkPage;