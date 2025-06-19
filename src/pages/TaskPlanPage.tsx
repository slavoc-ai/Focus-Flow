import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Target, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TaskPlanPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Target className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Task Plan</h1>
            <p className="text-muted-foreground mt-1">
              Plan and organize your tasks
            </p>
          </div>
        </div>
        
        <Button 
          onClick={() => navigate('/')}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </Button>
      </div>

      {/* Placeholder content - this will be implemented later */}
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Advanced task planning features will be available here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-card-foreground mb-2">
              Task planning features coming soon
            </h3>
            <p className="text-muted-foreground mb-6">
              For now, you can create and manage projects from the home page.
            </p>
            <Button onClick={() => navigate('/')}>
              Create New Project
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskPlanPage;