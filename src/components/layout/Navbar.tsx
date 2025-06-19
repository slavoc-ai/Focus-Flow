import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Brain, Menu, X, UserPlus } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, signOut, isAnonymous } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  // ADD DETAILED LOGGING:
  console.log('Navbar: Auth state received:', { 
    user: user ? {
      id: user.id,
      email: user.email,
      username: user.username,
      full_name: user.full_name,
      is_anonymous: user.is_anonymous
    } : null, 
    isAnonymous,
    hasUser: !!user,
    userType: user?.is_anonymous ? 'anonymous' : user ? 'authenticated' : 'none'
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Guest Session Banner */}
      {isAnonymous && (
        <div className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground text-sm text-center py-2 px-4 shadow-sm">
          <div className="flex items-center justify-center space-x-2">
            <UserPlus className="w-4 h-4" />
            <span>
              You're in a guest session. Your work is saved temporarily.{' '}
              <Link 
                to="/signup" 
                className="font-semibold underline hover:text-primary-foreground/80 transition-colors"
              >
                Create a free account
              </Link>{' '}
              to save your progress permanently and access it anywhere.
            </span>
          </div>
        </div>
      )}

      <nav className="bg-card shadow-sm border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            {/* Logo and Title */}
            <Link to="/" className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-card-foreground">FocusFlow</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {user ? (
                <>
                  <Link 
                    to="/" 
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      isActivePath('/') 
                        ? 'text-primary' 
                        : 'text-muted-foreground'
                    }`}
                  >
                    New Project
                  </Link>
                  
                  {!isAnonymous && (
                    <>
                      <Link 
                        to="/dashboard" 
                        className={`text-sm font-medium transition-colors hover:text-primary ${
                          isActivePath('/dashboard') 
                            ? 'text-primary' 
                            : 'text-muted-foreground'
                        }`}
                      >
                        Dashboard
                      </Link>
                      <Link 
                        to="/projects" 
                        className={`text-sm font-medium transition-colors hover:text-primary ${
                          isActivePath('/projects') 
                            ? 'text-primary' 
                            : 'text-muted-foreground'
                        }`}
                      >
                        Projects
                      </Link>
                      <Link 
                        to="/history" 
                        className={`text-sm font-medium transition-colors hover:text-primary ${
                          isActivePath('/history') 
                            ? 'text-primary' 
                            : 'text-muted-foreground'
                        }`}
                      >
                        History
                      </Link>
                      <Link 
                        to="/settings" 
                        className={`text-sm font-medium transition-colors hover:text-primary ${
                          isActivePath('/settings') 
                            ? 'text-primary' 
                            : 'text-muted-foreground'
                        }`}
                      >
                        Settings
                      </Link>
                    </>
                  )}
                  
                  <div className="flex items-center space-x-4 ml-6 pl-6 border-l border-border">
                    <ThemeToggle />
                    
                    {isAnonymous ? (
                      <div className="flex items-center space-x-3">
                        <Button 
                          onClick={() => navigate('/signup')}
                          className="flex items-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-md"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Sign Up Free</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => navigate('/login')}
                          className="text-muted-foreground hover:text-card-foreground hover:bg-muted"
                        >
                          Sign In
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button 
                          variant="ghost" 
                          onClick={handleSignOut}
                          className="text-muted-foreground hover:text-card-foreground hover:bg-muted"
                        >
                          Sign Out
                        </Button>
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {user.full_name?.[0] || user.email?.[0] || '?'}
                            </span>
                          </div>
                          <div className="hidden lg:block">
                            <p className="text-sm font-medium text-card-foreground">
                              {user.full_name || user.username || 'User'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <ThemeToggle />
                  <Link 
                    to="/login" 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Sign In
                  </Link>
                  <Button 
                    onClick={() => navigate('/signup')}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-md"
                  >
                    Get Started Free
                  </Button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-2">
              <ThemeToggle />
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-muted-foreground hover:text-card-foreground"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-card border-t border-border">
            <div className="px-4 py-6 space-y-4">
              {user ? (
                <>
                  {/* User Info */}
                  <div className="flex items-center space-x-3 pb-4 border-b border-border">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {user.full_name?.[0] || user.email?.[0] || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">
                        {isAnonymous ? 'Guest User' : (user.full_name || user.username || 'User')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isAnonymous ? 'Temporary session' : user.email}
                      </p>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-3">
                    <Link
                      to="/"
                      className={`block text-base font-medium transition-colors hover:text-primary ${
                        isActivePath('/') 
                          ? 'text-primary' 
                          : 'text-muted-foreground'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      New Project
                    </Link>
                    
                    {!isAnonymous && (
                      <>
                        <Link
                          to="/dashboard"
                          className={`block text-base font-medium transition-colors hover:text-primary ${
                            isActivePath('/dashboard') 
                              ? 'text-primary' 
                              : 'text-muted-foreground'
                          }`}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Dashboard
                        </Link>
                        <Link
                          to="/projects"
                          className={`block text-base font-medium transition-colors hover:text-primary ${
                            isActivePath('/projects') 
                              ? 'text-primary' 
                              : 'text-muted-foreground'
                          }`}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Projects
                        </Link>
                        <Link
                          to="/history"
                          className={`block text-base font-medium transition-colors hover:text-primary ${
                            isActivePath('/history') 
                              ? 'text-primary' 
                              : 'text-muted-foreground'
                          }`}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          History
                        </Link>
                        <Link
                          to="/settings"
                          className={`block text-base font-medium transition-colors hover:text-primary ${
                            isActivePath('/settings') 
                              ? 'text-primary' 
                              : 'text-muted-foreground'
                          }`}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Settings
                        </Link>
                      </>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border">
                    {isAnonymous ? (
                      <div className="space-y-2">
                        <Button
                          onClick={() => {
                            navigate('/signup');
                            setIsMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-md"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Sign Up Free</span>
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            navigate('/login');
                            setIsMenuOpen(false);
                          }}
                          className="w-full text-muted-foreground hover:text-card-foreground hover:bg-muted"
                        >
                          Sign In
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          handleSignOut();
                          setIsMenuOpen(false);
                        }}
                        className="block w-full text-left text-base font-medium text-muted-foreground hover:text-primary"
                      >
                        Sign Out
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block text-base font-medium text-muted-foreground hover:text-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Button
                    onClick={() => {
                      navigate('/signup');
                      setIsMenuOpen(false);
                    }}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-md"
                  >
                    Get Started Free
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
};