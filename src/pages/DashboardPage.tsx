import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Toast } from '../components/ui/Toast';
import { EditableProjectTitle } from '../components/ui/EditableProjectTitle';
import { 
  Play, 
  TrendingUp, 
  Clock, 
  Target, 
  Calendar,
  Users,
  BarChart3,
  Activity,
  Zap,
  CheckCircle2,
  Plus,
  ArrowRight,
  Timer,
  Brain,
  Coffee
} from 'lucide-react';
import { projectService, Project } from '../services/projectService';
import { sessionService } from '../services/sessionService';
import { formatDistanceToNow, format, subDays, startOfWeek, endOfWeek } from 'date-fns';

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalSessions: number;
  totalFocusedHours: number;
  averageSessionLength: number;
  completionRate: number;
  weeklyFocusTime: number;
  streak: number;
}

interface RecentProject extends Project {
  completedTasks: number;
  totalTasks: number;
  completionPercentage: number;
  lastSessionDate?: string;
}

interface ProductivityInsight {
  title: string;
  value: string;
  description: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalSessions: 0,
    totalFocusedHours: 0,
    averageSessionLength: 0,
    completionRate: 0,
    weeklyFocusTime: 0,
    streak: 0
  });
  
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [insights, setInsights] = useState<ProductivityInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // NEW: Project title editing state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  // Check for session completion message
  useEffect(() => {
    if (location.state?.sessionCompleted) {
      const summary = location.state.sessionSummary;
      setSuccessMessage(
        `Session completed! ${summary?.totalSessionTime || 0} minutes of focused work with ${summary?.pomodorosCompleted || 0} Pomodoros.`
      );
      setShowSuccessToast(true);
      
      // Clear the state to prevent showing on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      console.log('📊 Loading dashboard data...');

      // Load projects
      const projectsResult = await projectService.getProjectsByUserId(user.id);
      if (!projectsResult.success) {
        throw new Error(projectsResult.error || 'Failed to load projects');
      }

      const projects = projectsResult.projects;

      // Load recent sessions
      const sessionsResult = await sessionService.getUserSessions(user.id, 50);
      const sessions = sessionsResult.success ? sessionsResult.sessions : [];

      // Calculate stats
      const totalProjects = projects.length;
      const activeProjects = projects.filter(p => p.status === 'in_progress').length;
      const completedProjects = projects.filter(p => p.status === 'completed').length;
      const totalSessions = sessions.length;
      const totalFocusedMinutes = sessions.reduce((sum, session) => sum + session.total_focused_minutes, 0);
      const totalFocusedHours = Math.round(totalFocusedMinutes / 60 * 10) / 10;
      const averageSessionLength = totalSessions > 0 ? Math.round(totalFocusedMinutes / totalSessions) : 0;
      
      // Calculate completion rate
      const totalTasks = projects.reduce((sum, project) => sum + (project.sub_tasks?.length || 0), 0);
      const completedTasks = projects.reduce((sum, project) => 
        sum + (project.sub_tasks?.filter(task => task.is_completed).length || 0), 0);
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Calculate weekly focus time
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      const weeklyFocusTime = sessions
        .filter(session => {
          const sessionDate = new Date(session.start_time);
          return sessionDate >= weekStart && sessionDate <= weekEnd;
        })
        .reduce((sum, session) => sum + session.total_focused_minutes, 0);

      // Calculate streak (days with sessions in last 30 days)
      const last30Days = Array.from({ length: 30 }, (_, i) => subDays(new Date(), i));
      const daysWithSessions = last30Days.filter(day => 
        sessions.some(session => 
          format(new Date(session.start_time), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
        )
      ).length;

      setStats({
        totalProjects,
        activeProjects,
        completedProjects,
        totalSessions,
        totalFocusedHours,
        averageSessionLength,
        completionRate,
        weeklyFocusTime: Math.round(weeklyFocusTime / 60 * 10) / 10,
        streak: daysWithSessions
      });

      // Process recent projects
      const recentProjectsWithStats: RecentProject[] = projects
        .slice(0, 6)
        .map(project => {
          const totalTasks = project.sub_tasks?.length || 0;
          const completedTasks = project.sub_tasks?.filter(task => task.is_completed).length || 0;
          const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          
          const projectSessions = sessions.filter(s => s.project_id === project.id);
          const lastSessionDate = projectSessions.length > 0 ? projectSessions[0].start_time : undefined;

          return {
            ...project,
            completedTasks,
            totalTasks,
            completionPercentage,
            lastSessionDate
          };
        });

      setRecentProjects(recentProjectsWithStats);

      // Generate insights
      const generatedInsights: ProductivityInsight[] = [
        {
          title: 'Focus Time This Week',
          value: `${Math.round(weeklyFocusTime / 60 * 10) / 10}h`,
          description: `${weeklyFocusTime > 0 ? '+' : ''}${Math.round(weeklyFocusTime / 60)} hours of deep work`,
          trend: weeklyFocusTime > 300 ? 'up' : weeklyFocusTime > 100 ? 'neutral' : 'down',
          icon: <Clock className="w-5 h-5" />
        },
        {
          title: 'Completion Rate',
          value: `${completionRate}%`,
          description: `${completedTasks} of ${totalTasks} tasks completed`,
          trend: completionRate > 75 ? 'up' : completionRate > 50 ? 'neutral' : 'down',
          icon: <Target className="w-5 h-5" />
        },
        {
          title: 'Active Days',
          value: `${daysWithSessions}`,
          description: 'Days with focus sessions in last 30 days',
          trend: daysWithSessions > 20 ? 'up' : daysWithSessions > 10 ? 'neutral' : 'down',
          icon: <Calendar className="w-5 h-5" />
        },
        {
          title: 'Session Quality',
          value: `${averageSessionLength}min`,
          description: 'Average session length',
          trend: averageSessionLength > 30 ? 'up' : averageSessionLength > 15 ? 'neutral' : 'down',
          icon: <Activity className="w-5 h-5" />
        }
      ];

      setInsights(generatedInsights);
      console.log('✅ Dashboard data loaded successfully');

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuickSession = (project: RecentProject) => {
    console.log('🚀 Starting quick session from DashboardPage with enhanced mapping');
    
    navigate('/deep-work', {
      state: {
        plan: project.sub_tasks?.map(task => ({
          id: task.id,
          title: task.title || 'Task',
          action: task.action || task.description,
          details: task.details || task.description,
          estimated_minutes_per_sub_task: task.estimated_minutes_per_sub_task,
          isCompleted: task.is_completed,
          description: task.description
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

  // NEW: Handle project title save
  const handleProjectTitleSave = async (projectId: string, newTitle: string) => {
    if (!user) return;

    try {
      console.log('📝 Saving project title from dashboard:', { projectId, newTitle });
      
      const result = await projectService.updateProject(
        projectId,
        { title: newTitle },
        user.id
      );
      
      if (result.success) {
        setSuccessMessage('Project title updated successfully');
        setShowSuccessToast(true);
        await loadDashboardData(); // Reload to get updated data
      } else {
        throw new Error(result.error || 'Failed to update project title');
      }
    } catch (error) {
      console.error('❌ Error updating project title:', error);
      throw error; // Re-throw to let EditableProjectTitle handle the error
    } finally {
      setEditingProjectId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="warning">In Progress</Badge>;
      case 'planning':
      default:
        return <Badge variant="default">Planning</Badge>;
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-palette-success-500" />;
      case 'down':
        return <TrendingUp className="w-4 h-4 text-destructive rotate-180" />;
      case 'neutral':
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user?.full_name || user?.username || 'User'}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Here's your productivity overview and recent activity
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button 
            variant="outline"
            onClick={() => navigate('/projects')}
            className="flex items-center space-x-2"
          >
            <BarChart3 className="w-4 h-4" />
            <span>All Projects</span>
          </Button>
          
          <Button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">{error}</p>
          <Button 
            variant="ghost" 
            onClick={loadDashboardData}
            className="mt-2 text-destructive hover:text-destructive"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {stats.totalProjects}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Projects
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-palette-success-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-palette-success-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {stats.completionRate}%
                </p>
                <p className="text-sm text-muted-foreground">
                  Completion Rate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-palette-warning-100 rounded-lg">
                <Clock className="w-6 h-6 text-palette-warning-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {stats.totalFocusedHours}h
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Focus Time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-secondary/10 rounded-lg">
                <Zap className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {stats.streak}
                </p>
                <p className="text-sm text-muted-foreground">
                  Active Days (30d)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Productivity Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-primary" />
            <span>Productivity Insights</span>
          </CardTitle>
          <CardDescription>
            Your performance metrics and trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {insights.map((insight, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="text-muted-foreground">
                      {insight.icon}
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {insight.title}
                    </span>
                  </div>
                  {getTrendIcon(insight.trend)}
                </div>
                <p className="text-2xl font-bold text-card-foreground">
                  {insight.value}
                </p>
                <p className="text-xs text-muted-foreground">
                  {insight.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Projects</CardTitle>
                  <CardDescription>
                    Continue working on your active projects
                  </CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/projects')}
                  className="flex items-center space-x-1"
                >
                  <span>View All</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentProjects.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-muted rounded-lg p-6">
                    <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-card-foreground mb-2">
                      No projects yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first project to start tracking your progress
                    </p>
                    <Button onClick={() => navigate('/')}>
                      Create Project
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentProjects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          {/* Editable Project Title */}
                          <EditableProjectTitle
                            value={project.title}
                            onSave={(newTitle) => handleProjectTitleSave(project.id, newTitle)}
                            placeholder="Enter project title..."
                            displayClassName="font-semibold text-card-foreground truncate"
                            disabled={editingProjectId === project.id}
                            className="flex-1"
                          />
                          {getStatusBadge(project.status)}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{project.completedTasks}/{project.totalTasks} tasks</span>
                          <span>•</span>
                          <span>{project.allocated_time_minutes}m allocated</span>
                          {project.lastSessionDate && (
                            <>
                              <span>•</span>
                              <span>
                                Last session {formatDistanceToNow(new Date(project.lastSessionDate), { addSuffix: true })}
                              </span>
                            </>
                          )}
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mt-3">
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className="bg-primary h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${project.completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => handleStartQuickSession(project)}
                        size="sm"
                        className="ml-4 flex items-center space-x-2"
                        disabled={project.totalTasks === 0}
                      >
                        <Play className="w-4 h-4" />
                        <span>Start</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Start */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Timer className="w-5 h-5 text-primary" />
                <span>Quick Start</span>
              </CardTitle>
              <CardDescription>
                Start a new productive session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => navigate('/')}
                className="w-full flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => navigate('/settings')}
                className="w-full flex items-center justify-center space-x-2"
              >
                <Clock className="w-4 h-4" />
                <span>Timer Settings</span>
              </Button>
              
              <Button 
                variant="ghost"
                onClick={() => navigate('/history')}
                className="w-full flex items-center justify-center space-x-2"
              >
                <BarChart3 className="w-4 h-4" />
                <span>View Analytics</span>
              </Button>
            </CardContent>
          </Card>

          {/* Session Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Coffee className="w-5 h-5 text-secondary" />
                <span>Session Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Total Sessions
                </span>
                <span className="font-semibold text-card-foreground">
                  {stats.totalSessions}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Avg Session
                </span>
                <span className="font-semibold text-card-foreground">
                  {stats.averageSessionLength}min
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  This Week
                </span>
                <span className="font-semibold text-card-foreground">
                  {stats.weeklyFocusTime}h
                </span>
              </div>
              
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Active Projects
                  </span>
                  <span className="font-semibold text-primary">
                    {stats.activeProjects}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            variant="success"
            title="Success!"
            description={successMessage}
            onClose={() => setShowSuccessToast(false)}
            duration={5000}
          />
        </div>
      )}
    </div>
  );
};

export default DashboardPage;