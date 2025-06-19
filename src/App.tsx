import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { MainLayout } from './components/layout/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

// Page components
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';
import ProjectListPage from './pages/ProjectListPage';
import TaskPlanPage from './pages/TaskPlanPage';
import DeepWorkPage from './pages/DeepWorkPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import AuthCallbackPage from './pages/AuthCallbackPage.tsx';
import PlanReviewPage from './pages/PlanReviewPage';

// Full screen loading component
const FullScreenSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
      <h2 className="text-xl font-semibold text-foreground">
        Loading FocusFlow...
      </h2>
    </div>
  </div>
);

// Protected route component for non-anonymous users only
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isAnonymous } = useAuth();
  
  if (loading) {
    return <FullScreenSpinner />;
  }
  
  // Redirect anonymous users to sign up for protected routes
  if (!user || isAnonymous) {
    return <Navigate to="/signup" replace />;
  }
  
  return <>{children}</>;
};

// Main app routes component that waits for auth to load
const AppRoutes: React.FC = () => {
  const { loading } = useAuth();

  // Show full screen spinner until auth state is determined
  if (loading) {
    return <FullScreenSpinner />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignUpPage />} />
          <Route path="auth/callback" element={<AuthCallbackPage />} />
          
          {/* These pages are available to both anonymous and authenticated users */}
          <Route path="plan-review" element={<PlanReviewPage />} />
          <Route path="deep-work" element={<DeepWorkPage />} />
          
          {/* Protected routes - require non-anonymous authentication */}
          <Route 
            path="dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="projects" 
            element={
              <ProtectedRoute>
                <ProjectListPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="project/:id/plan" 
            element={
              <ProtectedRoute>
                <TaskPlanPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="project/:id/deep-work" 
            element={
              <ProtectedRoute>
                <DeepWorkPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="history" 
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="settings" 
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } 
          />
          
          {/* 404 page */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;