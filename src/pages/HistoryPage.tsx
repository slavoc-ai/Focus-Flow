import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { History, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <History className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">History</h1>
            <p className="text-muted-foreground mt-1">
              View your completed tasks and sessions
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
            Your completed projects and session history will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-card-foreground mb-2">
              No history yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Complete some projects to see your productivity history here.
            </p>
            <Button onClick={() => navigate('/')}>
              Start Your First Project
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoryPage;