import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Toast } from '../components/ui/Toast';
import { FullPlanModal, SubTaskForModal } from '../components/deepwork/FullPlanModal';
import { 
  Play, 
  Edit3, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Plus,
  Calendar,
  Target,
  Zap,
  Search,
  Filter,
  Eye,
  SortAsc,
  SortDesc,
  History,
  Activity
} from 'lucide-react';
import { projectService, Project, ProjectFilters } from '../services/projectService';
import { sessionService } from '../services/sessionService';
import { formatDistanceToNow, format } from 'date-fns';

interface ProjectWithStats extends Project {
  completedTasks: number;
  totalTasks: number;
  completionPercentage: number;
  totalSessions: number;
  totalFocusedMinutes: number;
}

const ProjectListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // NEW: Filtering and preview state
  const [filters, setFilters] = useState<ProjectFilters>({
    status: 'active',
    searchTerm: '',
    sortBy: 'updated_at_desc'
  });
  const [previewingProject, setPreviewingProject] = useState<Project | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Load projects on component mount and when filters change
  useEffect(() => {
    loadProjects();
  }, [user, filters]);

  const loadProjects = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      console.log('📋 Loading projects with filters:', filters);
      const result = await projectService.getProjectsWithFilters(user.id, filters);

      if (result.success) {
        // Calculate stats for each project
        const projectsWithStats = await Promise.all(
          result.projects.map(async (project) => {
            const totalTasks = project.sub_tasks?.length || 0;
            const completedTasks = project.sub_tasks?.filter(task => task.is_completed).length || 0;
            const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            // Get session statistics
            const statsResult = await sessionService.getProjectStatistics(project.id, user.id);
            const stats = statsResult.success ? statsResult.statistics : {
              totalSessions: 0,
              totalFocusedMinutes: 0,
              totalPomodoros: 0,
              averageSessionLength: 0
            };

            return {
              ...project,
              completedTasks,
              totalTasks,
              completionPercentage,
              totalSessions: stats.totalSessions,
              totalFocusedMinutes: stats.totalFocusedMinutes
            };
          })
        );

        setProjects(projectsWithStats);
        console.log('✅ Projects loaded successfully:', projectsWithStats.length);
      } else {
        throw new Error(result.error || 'Failed to load projects');
      }

    } catch (error) {
      console.error('❌ Error loading projects:', error);
      setError(error instanceof Error ? error.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = (project: ProjectWithStats) => {
    console.log('🚀 Starting session from ProjectListPage with enhanced mapping');
    
    // Navigate to deep work page with ENHANCED data structure mapping
    navigate('/deep-work', {
      state: {
        plan: project.sub_tasks?.map(task => ({
          id: task.id,
          // ✅ FIXED: Map enhanced structure fields with fallbacks
          title: task.title || 'Task',
          action: task.action || task.description,
          details: task.details || task.description,
          estimated_minutes_per_sub_task: task.estimated_minutes_per_sub_task,
          isCompleted: task.is_completed,
          // Keep for backward compatibility
          sub_task_description: task.description
        })),
        mainTask: project.title,
        projectId: project.id,
        originalQuery: project.original_query,
        timeAllocated: project.allocated_time_minutes,
        energyLevel: project.energy_level,
        strictTimeAdherence: project.strict_time_adherence,
        documentName: project.document_name,
        documentText: project.document_text
      }
    });
  };

  const handleEditProject = (project: ProjectWithStats) => {
    // Navigate to plan review page for editing
    navigate('/plan-review', {
      state: {
        plan: project.sub_tasks?.map(task => ({
          id: task.id,
          // ✅ FIXED: Map enhanced structure for editing
          title: task.title || 'Task',
          action: task.action || task.description,
          details: task.details || task.description,
          estimatedMinutes: task.estimated_minutes_per_sub_task,
          completed: task.is_completed,
          // Keep for backward compatibility
          description: task.description
        })),
        mainTask: project.title,
        projectId: project.id,
        isEditing: true
      }
    });
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('🗑️ Delete project:', projectId);
      
      const result = await projectService.deleteProject(projectId, user.id);
      
      if (result.success) {
        setSuccessMessage('Project deleted successfully');
        setShowSuccessToast(true);
        await loadProjects(); // Reload the list
      } else {
        throw new Error(result.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('❌ Error deleting project:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete project');
    }
  };

  // NEW: Handle project title click for preview
  const handleProjectPreview = async (project: ProjectWithStats) => {
    try {
      console.log('👁️ Previewing project:', project.id);
      
      // Fetch full project details if needed
      const result = await projectService.getProjectById(project.id, user.id);
      
      if (result.success && result.project) {
        setPreviewingProject(result.project);
      } else {
        // Fallback to current project data
        setPreviewingProject(project);
      }
    } catch (error) {
      console.error('❌ Error loading project for preview:', error);
      // Fallback to current project data
      setPreviewingProject(project);
    }
  };

  const getStatusBadge = (project: ProjectWithStats) => {
    switch (project.status) {
      case 'completed':
        return (
          <Badge variant="success" className="flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="warning" className="flex items-center space-x-1">
            <Activity className="w-3 h-3" />
            <span>In Progress</span>
          </Badge>
        );
      case 'planning':
      default:
        return (
          <Badge variant="default" className="flex items-center space-x-1">
            <Target className="w-3 h-3" />
            <span>Planning</span>
          </Badge>
        );
    }
  };

  const getEnergyLevelIcon = (energyLevel: string) => {
    const className = "w-4 h-4";
    switch (energyLevel) {
      case 'high':
        return <Zap className={`${className} text-palette-success-500`} />;
      case 'medium':
        return <Zap className={`${className} text-palette-warning-500`} />;
      case 'low':
      default:
        return <Zap className={`${className} text-muted-foreground`} />;
    }
  };

  // NEW: Filter options
  const statusOptions = [
    { value: 'active', label: 'Active Projects', icon: Activity },
    { value: 'completed', label: 'Completed Projects', icon: CheckCircle2 },
    { value: 'all', label: 'All Projects', icon: Target }
  ];

  const sortOptions = [
    { value: 'updated_at_desc', label: 'Last Updated (Newest)' },
    { value: 'updated_at_asc', label: 'Last Updated (Oldest)' },
    { value: 'created_at_desc', label: 'Date Created (Newest)' },
    { value: 'created_at_asc', label: 'Date Created (Oldest)' },
    { value: 'completed_at_desc', label: 'Date Completed (Newest)' },
    { value: 'completed_at_asc', label: 'Date Completed (Oldest)' },
    { value: 'title_asc', label: 'Title (A-Z)' },
    { value: 'title_desc', label: 'Title (Z-A)' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              My Projects
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your tasks, track progress, and view project history
            </p>
          </div>
          
          <Button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </Button>
        </div>

        {/* Enhanced Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex space-x-2">
            {statusOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  variant={filters.status === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, status: option.value as any }))}
                  className="flex items-center space-x-2"
                >
                  <Icon className="w-4 h-4" />
                  <span>{option.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Search and Sort */}
          <div className="flex flex-1 space-x-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={filters.searchTerm || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <select
              value={filters.sortBy || 'updated_at_desc'}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
              className="px-3 py-2 bg-card border border-border rounded-md text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {projects.length} project{projects.length !== 1 ? 's' : ''} found
            {filters.status !== 'all' && ` (${filters.status === 'active' ? 'active' : filters.status})`}
          </span>
          {filters.searchTerm && (
            <span>
              Searching for: "{filters.searchTerm}"
            </span>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">{error}</p>
          <Button 
            variant="ghost" 
            onClick={loadProjects}
            className="mt-2 text-destructive hover:text-destructive"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-muted rounded-lg p-8 border border-border">
            {filters.status === 'completed' ? (
              <>
                <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  No completed projects yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Complete some projects to see them here in your history.
                </p>
              </>
            ) : filters.searchTerm ? (
              <>
                <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  No projects found
                </h3>
                <p className="text-muted-foreground mb-6">
                  No projects match your search criteria. Try adjusting your filters.
                </p>
              </>
            ) : (
              <>
                <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  No projects yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Create your first project to get started with focused work sessions.
                </p>
              </>
            )}
            <Button onClick={() => navigate('/')}>
              Create Your First Project
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle 
                      className="text-lg line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleProjectPreview(project)}
                    >
                      {project.title}
                    </CardTitle>
                    <CardDescription className="mt-2 line-clamp-2">
                      {project.original_query}
                    </CardDescription>
                  </div>
                  {getStatusBadge(project)}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">
                      Progress
                    </span>
                    <span className="font-medium text-card-foreground">
                      {project.completedTasks}/{project.totalTasks} tasks
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.completionPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Project Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {project.allocated_time_minutes}m allocated
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getEnergyLevelIcon(project.energy_level)}
                    <span className="text-muted-foreground capitalize">
                      {project.energy_level} energy
                    </span>
                  </div>
                </div>

                {/* Session Stats */}
                {project.totalSessions > 0 && (
                  <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-border">
                    <div>
                      <span className="font-medium text-card-foreground">
                        {project.totalSessions}
                      </span>
                      <span className="text-muted-foreground ml-1">
                        sessions
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-card-foreground">
                        {project.totalFocusedMinutes}
                      </span>
                      <span className="text-muted-foreground ml-1">
                        minutes
                      </span>
                    </div>
                  </div>
                )}

                {/* Date */}
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {project.status === 'completed' 
                      ? `Completed ${formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}`
                      : `Updated ${formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}`
                    }
                  </span>
                </div>
              </CardContent>

              <CardFooter className="flex space-x-2">
                {project.status === 'completed' ? (
                  <>
                    <Button
                      onClick={() => handleProjectPreview(project)}
                      className="flex-1 flex items-center justify-center space-x-2"
                      variant="outline"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Plan</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditProject(project)}
                      title="Duplicate Project"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => handleStartSession(project)}
                      className="flex-1 flex items-center justify-center space-x-2"
                      disabled={project.totalTasks === 0}
                    >
                      <Play className="w-4 h-4" />
                      <span>Start Session</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditProject(project)}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteProject(project.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Enhanced Full Plan Modal for Preview */}
      {previewingProject && (
        <FullPlanModal
          isOpen={!!previewingProject}
          onClose={() => setPreviewingProject(null)}
          tasks={previewingProject.sub_tasks?.map(task => ({
            id: task.id,
            title: task.title,
            action: task.action,
            details: task.details,
            sub_task_description: task.description,
            estimated_minutes_per_sub_task: task.estimated_minutes_per_sub_task,
            isCompleted: task.is_completed
          })) || []}
          mainTask={previewingProject.title}
          readOnly={true} // This is a preview modal
        />
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            variant="success"
            title="Success"
            description={successMessage}
            onClose={() => setShowSuccessToast(false)}
            duration={3000}
          />
        </div>
      )}
    </div>
  );
};

export default ProjectListPage;