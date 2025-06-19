import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, isAnonymous } = useAuth();

  useEffect(() => {
    // The onAuthStateChange listener in AuthContext is handling everything.
    // We just wait here for the final state to be determined.
    if (!loading) {
      if (user && !isAnonymous) {
        // If we have a real user, the login and merge were successful.
        console.log('✅ AuthCallbackPage: Auth complete. Redirecting to dashboard.');
        navigate('/dashboard', { replace: true });
      } else {
        // If loading is done and we still don't have a real user, something failed.
        console.error('❌ AuthCallbackPage: Auth failed. Redirecting to login.');
        navigate('/login?error=oauth_failed', { replace: true });
      }
    }
  }, [loading, user, isAnonymous, navigate]);

  // Just render a simple loading screen.
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-lg text-foreground">Finalizing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;