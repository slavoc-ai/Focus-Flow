import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Toast } from '../components/ui/Toast';
import { CheckboxField } from '../components/forms/CheckboxField';
import { TimeSelector } from '../components/forms/TimeSelector';
import { supabase } from '../lib/supabaseClient';
import { 
  User, 
  Clock, 
  Volume2, 
  Key, 
  Save, 
  Eye, 
  EyeOff,
  TestTube,
  AlertCircle,
  CheckCircle2,
  Settings as SettingsIcon,
  Brain
} from 'lucide-react';

interface UserSettings {
  // Profile settings
  username: string;
  full_name: string;
  avatar_url: string;
  
  // Pomodoro settings
  default_pomodoro_work_minutes: number;
  default_pomodoro_short_break_minutes: number;
  default_pomodoro_long_break_minutes: number;
  enable_sound_notifications: boolean;
  
  // LLM settings
  llm_provider: string;
}

const SettingsPage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  
  // Form state
  const [settings, setSettings] = useState<UserSettings>({
    username: '',
    full_name: '',
    avatar_url: '',
    default_pomodoro_work_minutes: 25,
    default_pomodoro_short_break_minutes: 5,
    default_pomodoro_long_break_minutes: 15,
    enable_sound_notifications: true,
    llm_provider: 'gemini'
  });

  // LLM API key state (separate from other settings for security)
  const [apiKey, setApiKey] = useState('');
  const [hasExistingApiKey, setHasExistingApiKey] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null); // Track which section is saving
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [apiKeyTestResult, setApiKeyTestResult] = useState<'success' | 'error' | null>(null);

  // Load user settings on mount
  useEffect(() => {
    if (user) {
      setSettings({
        username: user.username || '',
        full_name: user.full_name || '',
        avatar_url: user.avatar_url || '',
        default_pomodoro_work_minutes: user.default_pomodoro_work_minutes || 25,
        default_pomodoro_short_break_minutes: user.default_pomodoro_short_break_minutes || 5,
        default_pomodoro_long_break_minutes: user.default_pomodoro_long_break_minutes || 15,
        enable_sound_notifications: user.enable_sound_notifications ?? true,
        llm_provider: user.llm_provider || 'gemini'
      });

      // Check if user has an existing API key
      setHasExistingApiKey(!!user.encrypted_llm_api_key);
    }
  }, [user]);

  const validateSettings = (section: string): boolean => {
    const newErrors: Record<string, string> = {};

    if (section === 'profile') {
      if (!settings.username.trim()) {
        newErrors.username = 'Username is required';
      } else if (settings.username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
      }
      
      if (!settings.full_name.trim()) {
        newErrors.full_name = 'Full name is required';
      }
    }

    if (section === 'pomodoro') {
      if (settings.default_pomodoro_work_minutes < 1 || settings.default_pomodoro_work_minutes > 120) {
        newErrors.work_minutes = 'Work time must be between 1 and 120 minutes';
      }
      if (settings.default_pomodoro_short_break_minutes < 1 || settings.default_pomodoro_short_break_minutes > 60) {
        newErrors.short_break_minutes = 'Short break must be between 1 and 60 minutes';
      }
      if (settings.default_pomodoro_long_break_minutes < 1 || settings.default_pomodoro_long_break_minutes > 120) {
        newErrors.long_break_minutes = 'Long break must be between 1 and 120 minutes';
      }
    }

    if (section === 'llm' && apiKey) {
      if (settings.llm_provider === 'gemini' && !apiKey.startsWith('AIza')) {
        newErrors.api_key = 'Gemini API keys should start with "AIza"';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveSection = async (section: 'profile' | 'pomodoro' | 'llm') => {
    if (!user || !validateSettings(section)) return;

    try {
      setSaving(section);
      setErrors({});

      if (section === 'llm') {
        // Handle LLM API key saving through Edge Function
        await saveLLMApiKey();
      } else {
        // Handle profile and pomodoro settings
        let updateData: Partial<UserSettings> = {};

        switch (section) {
          case 'profile':
            updateData = {
              username: settings.username,
              full_name: settings.full_name,
              avatar_url: settings.avatar_url
            };
            break;
            
          case 'pomodoro':
            updateData = {
              default_pomodoro_work_minutes: settings.default_pomodoro_work_minutes,
              default_pomodoro_short_break_minutes: settings.default_pomodoro_short_break_minutes,
              default_pomodoro_long_break_minutes: settings.default_pomodoro_long_break_minutes,
              enable_sound_notifications: settings.enable_sound_notifications
            };
            break;
        }

        await updateProfile(updateData);
      }
      
      setSuccessMessage(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully!`);
      setShowSuccessToast(true);

      // Clear API key field after successful save
      if (section === 'llm') {
        setApiKey('');
        setHasExistingApiKey(true);
      }

    } catch (error) {
      console.error(`Error saving ${section} settings:`, error);
      setErrors({ [section]: `Failed to save ${section} settings. Please try again.` });
    } finally {
      setSaving(null);
    }
  };

  const saveLLMApiKey = async () => {
    if (!apiKey) {
      throw new Error('API key is required');
    }

    try {
      console.log('🔑 Saving LLM API key securely...');

      const { data, error } = await supabase.functions.invoke('set-user-llm-key', {
        body: {
          apiKey: apiKey,
          provider: settings.llm_provider
        }
      });

      if (error) {
        console.error('❌ Error from set-user-llm-key function:', error);
        throw new Error(error.message || 'Failed to save API key');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to save API key');
      }

      console.log('✅ API key saved successfully');
    } catch (error) {
      console.error('❌ Error saving API key:', error);
      throw error;
    }
  };

  const testApiKey = async () => {
    if (!apiKey && !hasExistingApiKey) {
      setErrors({ api_key: 'Please enter an API key to test' });
      return;
    }

    try {
      setTestingApiKey(true);
      setApiKeyTestResult(null);
      setErrors({});

      console.log('🧪 Testing API key...');

      const { data, error } = await supabase.functions.invoke('test-user-llm-key', {
        body: {
          apiKey: apiKey || undefined, // Send the key if provided, otherwise use stored key
          provider: settings.llm_provider
        }
      });

      if (error) {
        console.error('❌ Error from test-user-llm-key function:', error);
        setApiKeyTestResult('error');
        return;
      }

      if (data.success) {
        console.log('✅ API key test successful');
        setApiKeyTestResult('success');
      } else {
        console.error('❌ API key test failed:', data.message);
        setApiKeyTestResult('error');
      }

    } catch (error) {
      console.error('❌ Error testing API key:', error);
      setApiKeyTestResult('error');
    } finally {
      setTestingApiKey(false);
    }
  };

  const clearApiKey = async () => {
    if (!confirm('Are you sure you want to remove your API key? This will revert to using the default FocusFlow API key.')) {
      return;
    }

    try {
      setSaving('llm');
      
      // Update profile to remove API key
      await updateProfile({
        encrypted_llm_api_key: null,
        llm_provider: null
      });

      setApiKey('');
      setHasExistingApiKey(false);
      setSuccessMessage('API key removed successfully. Using default FocusFlow API key.');
      setShowSuccessToast(true);

    } catch (error) {
      console.error('❌ Error clearing API key:', error);
      setErrors({ llm: 'Failed to remove API key. Please try again.' });
    } finally {
      setSaving(null);
    }
  };

  const resetToDefaults = (section: 'pomodoro') => {
    if (section === 'pomodoro') {
      setSettings(prev => ({
        ...prev,
        default_pomodoro_work_minutes: 25,
        default_pomodoro_short_break_minutes: 5,
        default_pomodoro_long_break_minutes: 15,
        enable_sound_notifications: true
      }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <SettingsIcon className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Customize your FocusFlow experience
          </p>
        </div>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <User className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Manage your personal information and account details
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Username"
              value={settings.username}
              onChange={(e) => setSettings(prev => ({ ...prev, username: e.target.value }))}
              error={errors.username}
              placeholder="Enter your username"
            />
            <Input
              label="Full Name"
              value={settings.full_name}
              onChange={(e) => setSettings(prev => ({ ...prev, full_name: e.target.value }))}
              error={errors.full_name}
              placeholder="Enter your full name"
            />
          </div>
          
          <Input
            label="Avatar URL"
            value={settings.avatar_url}
            onChange={(e) => setSettings(prev => ({ ...prev, avatar_url: e.target.value }))}
            placeholder="https://example.com/avatar.jpg"
            helperText="Optional: URL to your profile picture"
          />

          {errors.profile && (
            <div className="text-destructive text-sm">{errors.profile}</div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={() => saveSection('profile')}
              disabled={saving === 'profile'}
              className="flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving === 'profile' ? 'Saving...' : 'Save Profile'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pomodoro Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>Pomodoro Timer Settings</CardTitle>
              <CardDescription>
                Customize your focus and break durations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TimeSelector
              label="Work Duration"
              value={settings.default_pomodoro_work_minutes}
              onChange={(e) => setSettings(prev => ({ ...prev, default_pomodoro_work_minutes: parseInt(e.target.value) || 25 }))}
              error={errors.work_minutes}
              min="1"
              max="120"
              unit="minutes"
            />
            <TimeSelector
              label="Short Break"
              value={settings.default_pomodoro_short_break_minutes}
              onChange={(e) => setSettings(prev => ({ ...prev, default_pomodoro_short_break_minutes: parseInt(e.target.value) || 5 }))}
              error={errors.short_break_minutes}
              min="1"
              max="60"
              unit="minutes"
            />
            <TimeSelector
              label="Long Break"
              value={settings.default_pomodoro_long_break_minutes}
              onChange={(e) => setSettings(prev => ({ ...prev, default_pomodoro_long_break_minutes: parseInt(e.target.value) || 15 }))}
              error={errors.long_break_minutes}
              min="1"
              max="120"
              unit="minutes"
            />
          </div>

          <div className="border-t border-border pt-6">
            <h4 className="font-medium text-card-foreground mb-4 flex items-center space-x-2">
              <Volume2 className="w-4 h-4" />
              <span>Sound Settings</span>
            </h4>
            <CheckboxField
              label="Enable Sound Notifications"
              description="Play notification sounds when work/break sessions end"
              checked={settings.enable_sound_notifications}
              onChange={(e) => setSettings(prev => ({ ...prev, enable_sound_notifications: e.target.checked }))}
            />
          </div>

          {errors.pomodoro && (
            <div className="text-destructive text-sm">{errors.pomodoro}</div>
          )}

          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={() => resetToDefaults('pomodoro')}
              className="text-muted-foreground hover:text-card-foreground"
            >
              Reset to Defaults
            </Button>
            <Button
              onClick={() => saveSection('pomodoro')}
              disabled={saving === 'pomodoro'}
              className="flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving === 'pomodoro' ? 'Saving...' : 'Save Settings'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* LLM API Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Brain className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>AI Settings</CardTitle>
              <CardDescription>
                Configure your AI provider and API key for plan generation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-accent-foreground mb-1">
                  Optional Personal API Key
                </p>
                <p className="text-muted-foreground">
                  You can optionally provide your own Gemini API key for unlimited usage. 
                  If not provided, FocusFlow will use its default API with usage limits.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                LLM Provider
              </label>
              <select
                value={settings.llm_provider}
                onChange={(e) => setSettings(prev => ({ ...prev, llm_provider: e.target.value }))}
                className="w-full px-3 py-2 bg-card border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-card-foreground"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai" disabled>OpenAI (Coming Soon)</option>
                <option value="claude" disabled>Claude (Coming Soon)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                API Key {hasExistingApiKey && '(Saved securely)'}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasExistingApiKey ? "Enter new key to replace existing" : "AIza... (optional)"}
                  className="w-full px-3 py-2 pr-10 bg-card border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-card-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.api_key && (
                <p className="mt-1 text-sm text-destructive">{errors.api_key}</p>
              )}
            </div>
          </div>

          {/* API Key Testing */}
          {(apiKey || hasExistingApiKey) && (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={testApiKey}
                  disabled={testingApiKey}
                  className="flex items-center space-x-2"
                >
                  <TestTube className="w-4 h-4" />
                  <span>{testingApiKey ? 'Testing...' : 'Test API Key'}</span>
                </Button>
                
                {apiKeyTestResult && (
                  <div className={`flex items-center space-x-2 text-sm ${
                    apiKeyTestResult === 'success' 
                      ? 'text-palette-success-600' 
                      : 'text-destructive'
                  }`}>
                    {apiKeyTestResult === 'success' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span>
                      {apiKeyTestResult === 'success' ? 'API key is valid' : 'API key test failed'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>How to get a Gemini API key:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline">Google AI Studio</a></li>
              <li>Sign in with your Google account</li>
              <li>Click "Create API Key"</li>
              <li>Copy the key and paste it above</li>
            </ol>
          </div>

          {errors.llm && (
            <div className="text-destructive text-sm">{errors.llm}</div>
          )}

          <div className="flex justify-end space-x-3">
            {hasExistingApiKey && (
              <Button
                variant="ghost"
                onClick={clearApiKey}
                disabled={saving === 'llm'}
                className="text-destructive hover:text-destructive"
              >
                Remove API Key
              </Button>
            )}
            <Button
              onClick={() => saveSection('llm')}
              disabled={saving === 'llm' || (!apiKey && !hasExistingApiKey)}
              className="flex items-center space-x-2"
            >
              <Key className="w-4 h-4" />
              <span>{saving === 'llm' ? 'Saving...' : 'Save API Settings'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Information */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Information</CardTitle>
          <CardDescription>
            Your current usage and account status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {hasExistingApiKey ? 'Personal' : 'Default'}
              </div>
              <div className="text-sm text-muted-foreground">
                API Key
              </div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-card-foreground">
                {settings.llm_provider || 'Gemini'}
              </div>
              <div className="text-sm text-muted-foreground">
                Current Provider
              </div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-card-foreground">
                Active
              </div>
              <div className="text-sm text-muted-foreground">
                Account Status
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            variant="success"
            title="Settings Saved"
            description={successMessage}
            onClose={() => setShowSuccessToast(false)}
            duration={3000}
          />
        </div>
      )}
    </div>
  );
};

export default SettingsPage;