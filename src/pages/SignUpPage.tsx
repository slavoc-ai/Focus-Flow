import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/Card';

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle, convertToPermanentUser, user, isAnonymous } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Redirect non-anonymous users to dashboard
  useEffect(() => {
    console.log('🔍 SignUpPage useEffect - Auth state check:', {
      hasUser: !!user,
      isAnonymous,
      userType: user?.is_anonymous ? 'anonymous' : user ? 'authenticated' : 'none'
    });
    
    if (user && !isAnonymous) {
      console.log('✅ User is authenticated and not anonymous, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [user, isAnonymous, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setIsLoading(true);
      
      if (user && isAnonymous) {
        // Convert existing anonymous user to permanent account
        console.log('🔄 Converting anonymous user to permanent account');
        await convertToPermanentUser(formData.email, formData.password);
        console.log('✅ Anonymous user conversion initiated successfully');
        // Navigation will happen automatically via useEffect when user state updates
      } else {
        // Create brand new user account
        console.log('📝 Creating new user account');
        await signUp(formData.email, formData.password);
        console.log('✅ New user sign-up initiated successfully');
        // Show success message for email verification
        setError(null);
      }
      
    } catch (error: any) {
      console.error('❌ Error during sign-up/conversion:', error);
      
      if (error?.message?.includes('User already registered') || 
          error?.message?.includes('user_already_exists')) {
        setError('This email is already registered. Please sign in or use a different email.');
      } else {
        setError(error?.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Error signing up with Google:', error);
      setError('Failed to sign up with Google. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Brain className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-center text-card-foreground">
            {isAnonymous ? 'Save Your Progress' : 'Create your account'}
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            {isAnonymous 
              ? 'Create a free account to save your projects and access them anywhere'
              : 'Start your productivity journey with FocusFlow'
            }
          </p>
          
          {isAnonymous && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">
                  Converting guest session to permanent account
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Your current projects and progress will be preserved
              </p>
            </div>
          )}
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm bg-destructive/10 border border-destructive/20 text-destructive rounded-md">
                {error}
              </div>
            )}

            <Input
              type="email"
              label="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isLoading}
            />

            <Input
              type="password"
              label="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={isLoading}
              helperText="Must be at least 6 characters"
            />

            <Input
              type="password"
              label="Confirm Password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              disabled={isLoading}
            />
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-foreground" />
              ) : (
                `Create ${isAnonymous ? 'Permanent ' : ''}Account`
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignUp}
              disabled={isLoading}
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-5 h-5 mr-2"
              />
              {isLoading ? 'Signing up...' : `Sign up with Google`}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:text-primary/80">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SignUpPage;