import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { EditableProjectTitle } from '../components/ui/EditableProjectTitle';
import { EditableTaskField } from '../components/ui/EditableTaskField';
import { EditableNumberField } from '../components/ui/EditableNumberField';
import { useAuth } from '../contexts/AuthContext';
import { usePlanStore } from '../store/planStore';
import { useUiStore } from '../store/uiStore';
import { projectService, ProjectData, SubTaskData } from '../services/projectService';
import { GripVertical, Trash2, Plus, Check, X, AlertCircle, Play, Save, RefreshCw, FileText, Sparkles } from 'lucide-react';

interface SortableTaskItemProps {
  task: {
    id: string;
    title: string;
    action: string;
    details: string;
    estimatedMinutes?: number;
    completed?: boolean;
  };
  onEdit: (id: string, newValues: { title?: string; action?: string; details?: string; estimatedMinutes?: number }) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({ task, onEdit, onDelete, disabled = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleFieldSave = (field: 'title' | 'action' | 'details' | 'estimatedMinutes') => {
    return (newValue: string | number | null) => {
      if (field === 'estimatedMinutes') {
        onEdit(task.id, { [field]: newValue as number | undefined });
      } else {
        onEdit(task.id, { [field]: newValue as string });
      }
    };
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 p-6 bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing mt-1"
        disabled={disabled}
      >
        <GripVertical className="w-5 h-5" />
      </button>

      {/* Task Content */}
      <div className="flex-1 space-y-3">
        {/* Task Title */}
        <EditableTaskField
          value={task.title}
          onSave={handleFieldSave('title')}
          placeholder="Enter task title..."
          variant="title"
          disabled={disabled}
          maxLength={100}
        />
        
        {/* Immediate Action */}
        <EditableTaskField
          value={task.action}
          onSave={handleFieldSave('action')}
          placeholder="Enter immediate action..."
          variant="action"
          disabled={disabled}
          maxLength={200}
        />
        
        {/* Detailed Explanation */}
        <EditableTaskField
          value={task.details}
          onSave={handleFieldSave('details')}
          placeholder="Enter detailed explanation..."
          variant="details"
          multiline={true}
          disabled={disabled}
          maxLength={500}
        />
        
        {/* Time Estimate */}
        <EditableNumberField
          value={task.estimatedMinutes}
          onSave={handleFieldSave('estimatedMinutes')}
          placeholder="Add time estimate..."
          disabled={disabled}
          min={1}
          max={480}
          unit="minutes"
          allowNull={true}
        />
      </div>

      {/* Delete Button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onDelete(task.id)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-1"
        disabled={disabled}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

const PlanReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { 
    plan, 
    projectTitle,
    timeWarning, 
    updatePlan, 
    addPlanTask, 
    deletePlanTask, 
    updatePlanTask, 
    taskDescription,
    timeAllocated,
    energyLevel,
    strictTimeAdherence,
    documentFiles,
    isEditingProject,
    editingProjectId,
    loadExistingProject,
    restoreInputsFromPlan
  } = usePlanStore();

  const { setCameFromReviewPage } = useUiStore();
  
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAction, setNewTaskAction] = useState('');
  const [newTaskDetails, setNewTaskDetails] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  
  // Project saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(editingProjectId);

  // Project title editing
  const [currentProjectTitle, setCurrentProjectTitle] = useState(projectTitle || taskDescription);

  // Update project title when store changes
  useEffect(() => {
    setCurrentProjectTitle(projectTitle || taskDescription);
  }, [projectTitle, taskDescription]);

  // Check if we need to load an existing project
  useEffect(() => {
    const stateProjectId = location.state?.projectId;
    const isEditing = location.state?.isEditing;

    if (stateProjectId && isEditing && !isEditingProject && user) {
      console.log('📋 Loading existing project for editing:', stateProjectId);
      loadExistingProject(stateProjectId, user.id).catch(error => {
        console.error('❌ Failed to load project:', error);
        setSaveError('Failed to load project for editing');
      });
    } else if (location.state?.plan && !isEditingProject) {
      console.log('📋 Using fresh plan data from navigation state');
      setProjectId(null);
    }
  }, [location.state, user, isEditingProject, loadExistingProject]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = plan.findIndex((item) => item.id === active.id);
      const newIndex = plan.findIndex((item) => item.id === over?.id);
      
      updatePlan(arrayMove(plan, oldIndex, newIndex));
    }
  };

  const handleEditTask = (id: string, newValues: { title?: string; action?: string; details?: string; estimatedMinutes?: number }) => {
    updatePlanTask(id, newValues);
  };

  const handleDeleteTask = (id: string) => {
    setShowDeleteModal(id);
  };

  const confirmDelete = () => {
    if (showDeleteModal) {
      deletePlanTask(showDeleteModal);
      setShowDeleteModal(null);
    }
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim() && newTaskAction.trim()) {
      const newTask = {
        id: `task-${Date.now()}`,
        title: newTaskTitle.trim(),
        action: newTaskAction.trim(),
        details: newTaskDetails.trim() || newTaskAction.trim(),
        completed: false
      };
      
      updatePlan([...plan, newTask]);
      
      // Reset form
      setNewTaskTitle('');
      setNewTaskAction('');
      setNewTaskDetails('');
      setShowAddTask(false);
    }
  };

  const handleProjectTitleSave = async (newTitle: string) => {
    // For now, just update the local state
    // In a full implementation, this would also update the store
    setCurrentProjectTitle(newTitle);
    console.log('📝 Project title updated:', newTitle);
  };

  const saveProjectToDraft = async () => {
    if (!user || plan.length === 0) {
      setSaveError('Cannot save: missing user information or empty plan');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      console.log('💾 Saving enhanced project as draft...');

      const projectData: ProjectData = {
        title: currentProjectTitle || (taskDescription.length > 50 ? taskDescription.substring(0, 50) + '...' : taskDescription),
        original_query: taskDescription,
        allocated_time_minutes: timeAllocated || 0,
        energy_level: energyLevel as 'low' | 'medium' | 'high',
        strict_time_adherence: strictTimeAdherence,
      };

      const subTasksData: Omit<SubTaskData, 'order_index'>[] = plan.map(task => ({
        title: task.title,
        action: task.action,
        details: task.details,
        estimated_minutes_per_sub_task: task.estimatedMinutes
      }));

      const result = await projectService.saveNewProjectAndPlan(
        projectData,
        subTasksData,
        user.id,
        documentFiles
      );

      if (result.success && result.project) {
        console.log('✅ Enhanced project saved successfully:', result.project.id);
        setProjectId(result.project.id);
        setShowSuccessToast(true);
      } else {
        throw new Error(result.error || 'Failed to save project');
      }

    } catch (error) {
      console.error('❌ Error saving enhanced project:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartSession = async () => {
    if (!user || plan.length === 0) {
      setSaveError('Cannot start session: missing user information or empty plan');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      let finalProjectId: string;
      let finalPlanData: any[];

      if (isEditingProject && editingProjectId) {
        console.log('📝 Updating existing enhanced project before starting session...');
        
        const projectData = {
          title: currentProjectTitle || (taskDescription.length > 50 ? taskDescription.substring(0, 50) + '...' : taskDescription),
          original_query: taskDescription,
          allocated_time_minutes: timeAllocated || 0,
          energy_level: energyLevel as 'low' | 'medium' | 'high',
          strict_time_adherence: strictTimeAdherence,
        };

        const updateResult = await projectService.updateProject(editingProjectId, projectData, user.id);
        
        if (!updateResult.success) {
          throw new Error(updateResult.error || 'Failed to update project');
        }

        finalProjectId = editingProjectId;
        finalPlanData = plan.map(task => ({
          id: task.id,
          title: task.title,
          action: task.action,
          details: task.details,
          estimated_minutes_per_sub_task: task.estimatedMinutes,
          isCompleted: task.completed || false
        }));
        console.log('✅ Enhanced project updated successfully:', finalProjectId);
      } else {
        console.log('💾 Creating new enhanced project before starting session...');
        
        const projectData: ProjectData = {
          title: currentProjectTitle || (taskDescription.length > 50 ? taskDescription.substring(0, 50) + '...' : taskDescription),
          original_query: taskDescription,
          allocated_time_minutes: timeAllocated || 0,
          energy_level: energyLevel as 'low' | 'medium' | 'high',
          strict_time_adherence: strictTimeAdherence,
        };

        const subTasksData: Omit<SubTaskData, 'order_index'>[] = plan.map(task => ({
          title: task.title,
          action: task.action,
          details: task.details,
          estimated_minutes_per_sub_task: task.estimatedMinutes
        }));

        const result = await projectService.saveNewProjectAndPlan(
          projectData,
          subTasksData,
          user.id,
          documentFiles
        );

        if (!result.success || !result.project) {
          throw new Error(result.error || 'Failed to create project');
        }

        finalProjectId = result.project.id;
        finalPlanData = result.project.sub_tasks?.map(dbTask => ({
          id: dbTask.id,
          title: dbTask.title || dbTask.description,
          action: dbTask.action || dbTask.description,
          details: dbTask.details || dbTask.description,
          estimated_minutes_per_sub_task: dbTask.estimated_minutes_per_sub_task,
          isCompleted: dbTask.is_completed
        })) || [];
        console.log('✅ Enhanced project created successfully:', finalProjectId);
      }

      const sessionData = {
        plan: finalPlanData,
        mainTask: currentProjectTitle || taskDescription || 'Deep Work Session',
        projectId: finalProjectId,
        originalQuery: taskDescription,
        timeAllocated: timeAllocated || 0,
        energyLevel,
        strictTimeAdherence,
        documentFiles: documentFiles.map(f => f.name),
      };

      navigate('/deep-work', { state: sessionData });

    } catch (error) {
      console.error('❌ Error starting enhanced session:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to start session');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToHome = () => {
    setCameFromReviewPage(true);
    restoreInputsFromPlan();
    navigate('/');
  };

  if (plan.length === 0 && !isEditingProject) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          No Plan Available
        </h2>
        <p className="text-muted-foreground mb-6">
          Please go back to the homepage and create a plan first.
        </p>
        <Button onClick={handleBackToHome}>
          Create New Plan
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-card rounded-lg shadow-lg p-6 border border-border">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-card-foreground">
                {isEditingProject ? 'Edit Your Plan' : 'Review Your Enhanced Plan'}
              </h2>
            </div>
            
            {/* Editable Project Title */}
            <div className="mb-3">
              <EditableProjectTitle
                value={currentProjectTitle}
                onSave={handleProjectTitleSave}
                placeholder="Enter project title..."
                showAiIcon={!!projectTitle && !isEditingProject}
                className="text-lg"
              />
            </div>
            
            <p className="text-muted-foreground text-sm">
              {isEditingProject 
                ? 'Modify your existing project and start a new session' 
                : 'Review your AI-generated tasks with enhanced structure and save your project'
              }
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {isEditingProject && (
              <Button
                onClick={handleBackToHome}
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2"
                disabled={isSaving}
              >
                <RefreshCw className="w-4 h-4" />
                <span>New Plan</span>
              </Button>
            )}
            
            {user && !isEditingProject && !projectId && (
              <Button
                onClick={handleBackToHome}
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isSaving}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Save Status */}
        {projectId && !isEditingProject && (
          <div className="mb-6 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-primary text-sm">
              ✅ Enhanced project saved successfully! You can now start your session or continue editing.
            </p>
          </div>
        )}

        {/* Editing Project Status */}
        {isEditingProject && (
          <div className="mb-6 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-primary text-sm">
              📝 Editing existing project. Changes will be saved when you start your session.
            </p>
          </div>
        )}

        {/* Error Display */}
        {saveError && (
          <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive text-sm">
              ❌ {saveError}
            </p>
          </div>
        )}
        
        {/* Time Warning */}
        {timeWarning && (
          <div className="mb-6 p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <p className="text-accent text-sm">
                {timeWarning}
              </p>
            </div>
          </div>
        )}
        
        {/* Enhanced Plan Tasks with Inline Editing */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={plan.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4 mb-6">
              {plan.map((task) => (
                <SortableTaskItem
                  key={task.id}
                  task={task}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  disabled={isSaving}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Enhanced Add New Task */}
        {showAddTask ? (
          <div className="mb-6 p-6 border-2 border-dashed border-border rounded-lg bg-muted/30">
            <h4 className="font-semibold text-card-foreground mb-4">Add New Task</h4>
            <div className="space-y-3">
              <Input
                placeholder="Task title (e.g., 'Research Phase')"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="font-semibold"
              />
              <Input
                placeholder="Immediate action (e.g., 'Open browser and search for...')"
                value={newTaskAction}
                onChange={(e) => setNewTaskAction(e.target.value)}
              />
              <textarea
                placeholder="Detailed explanation and context..."
                value={newTaskDetails}
                onChange={(e) => setNewTaskDetails(e.target.value)}
                className="w-full min-h-[80px] px-3 py-2 bg-card border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground text-card-foreground transition-colors duration-200"
              />
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim() || !newTaskAction.trim()}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowAddTask(false);
                    setNewTaskTitle('');
                    setNewTaskAction('');
                    setNewTaskDetails('');
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowAddTask(true)}
            className="w-full mb-6"
            disabled={isSaving}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Step
          </Button>
        )}

        {/* Enhanced Project Summary */}
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold text-card-foreground mb-3">Project Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Time Allocated:</span>
              <span className="ml-2 font-medium">
                {timeAllocated ? `${timeAllocated} minutes` : 'Unlimited'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Energy Level:</span>
              <span className="ml-2 font-medium capitalize">{energyLevel}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Tasks:</span>
              <span className="ml-2 font-medium">{plan.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Strict Time:</span>
              <span className="ml-2 font-medium">{strictTimeAdherence ? 'Yes' : 'No'}</span>
            </div>
          </div>
          {documentFiles.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center space-x-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Documents:</span>
                <span className="font-medium">
                  {documentFiles.length} file{documentFiles.length > 1 ? 's' : ''} processed
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {documentFiles.map(f => f.name).join(', ')}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="ghost"
            onClick={handleBackToHome}
            className="sm:w-auto"
            disabled={isSaving}
          >
            {isEditingProject ? 'New Plan' : 'Back to Home'}
          </Button>
          
          <div className="flex gap-3 flex-1">
            {user && !isEditingProject && !projectId && (
              <Button
                onClick={saveProjectToDraft}
                disabled={isSaving}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                {isSaving ? 'Saving...' : 'Save Draft'}
              </Button>
            )}
            
            <Button
              onClick={handleStartSession}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center space-x-2"
              disabled={plan.length === 0 || isSaving}
            >
              <Play className="w-4 h-4" />
              <span>{isSaving ? 'Starting...' : 'Start Deep Work Session'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
      >
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="ghost"
            onClick={() => setShowDeleteModal(null)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirmDelete}
          >
            Delete
          </Button>
        </div>
      </Modal>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            variant="success"
            title="Enhanced Project Saved"
            description="Your project with enhanced task structure has been saved successfully."
            onClose={() => setShowSuccessToast(false)}
            duration={3000}
          />
        </div>
      )}
    </div>
  );
};

export default PlanReviewPage;