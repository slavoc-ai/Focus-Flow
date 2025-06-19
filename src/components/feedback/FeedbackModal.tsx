import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Toast } from '../ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { SUPPORT_EMAIL } from '../../constants/contact';
import { Send, MessageSquare, Star, Bug, Lightbulb, Heart, X } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 'general' | 'bug' | 'feature' | 'compliment';

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const feedbackTypes = [
    { id: 'general', label: 'General Feedback', icon: MessageSquare, color: 'text-primary' },
    { id: 'bug', label: 'Report Bug', icon: Bug, color: 'text-destructive' },
    { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-accent' },
    { id: 'compliment', label: 'Compliment', icon: Heart, color: 'text-palette-success-500' },
  ];

  const resetForm = () => {
    setFeedbackType('general');
    setSubject('');
    setMessage('');
    setRating(null);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Please enter your feedback message');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Prepare feedback data
      const feedbackData = {
        type: feedbackType,
        subject: subject.trim() || `${feedbackTypes.find(t => t.id === feedbackType)?.label} from ${user?.full_name || user?.email || 'Anonymous User'}`,
        message: message.trim(),
        rating,
        user_id: user?.id || null,
        user_email: user?.email || 'anonymous@focusflow.app',
        user_name: user?.full_name || user?.username || 'Anonymous User',
        created_at: new Date().toISOString(),
        user_agent: navigator.userAgent,
        url: window.location.href,
      };

      console.log('📧 Sending feedback via Edge Function:', {
        type: feedbackType,
        hasSubject: !!subject,
        messageLength: message.length,
        hasRating: rating !== null,
        userType: user?.is_anonymous ? 'anonymous' : 'authenticated',
        supportEmail: SUPPORT_EMAIL
      });

      // Send feedback via Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
        },
        body: JSON.stringify(feedbackData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `Failed to send feedback: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send feedback');
      }

      console.log('✅ Feedback sent successfully');
      setShowSuccessToast(true);
      resetForm();
      onClose();

    } catch (error) {
      console.error('❌ Error sending feedback:', error);
      setError(error instanceof Error ? error.message : 'Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Send Feedback"
        description="Help us improve FocusFlow with your thoughts and suggestions"
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feedback Type Selection */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-3">
              What type of feedback would you like to share?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {feedbackTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFeedbackType(type.id as FeedbackType)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 text-left hover:bg-muted/50 ${
                      feedbackType === type.id
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className={`w-4 h-4 ${feedbackType === type.id ? 'text-primary' : type.color}`} />
                      <span className={`text-sm font-medium ${
                        feedbackType === type.id ? 'text-primary' : 'text-card-foreground'
                      }`}>
                        {type.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rating (for general feedback and compliments) */}
          {(feedbackType === 'general' || feedbackType === 'compliment') && (
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                How would you rate your experience? (Optional)
              </label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(rating === star ? null : star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        rating && star <= rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subject */}
          <Input
            label="Subject (Optional)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={`Brief summary of your ${feedbackTypes.find(t => t.id === feedbackType)?.label.toLowerCase()}`}
            disabled={isSubmitting}
          />

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1">
              Your Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                feedbackType === 'bug'
                  ? 'Please describe the bug you encountered, including steps to reproduce it...'
                  : feedbackType === 'feature'
                  ? 'Describe the feature you would like to see added...'
                  : feedbackType === 'compliment'
                  ? 'Tell us what you love about FocusFlow...'
                  : 'Share your thoughts, suggestions, or questions...'
              }
              className="w-full min-h-[120px] px-3 py-2 bg-card border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground text-card-foreground transition-colors duration-200 resize-vertical"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* User Info Display */}
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Sending as:</strong> {user?.full_name || user?.username || 'Anonymous User'} 
              ({user?.email || 'anonymous@focusflow.app'})
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This feedback will be sent to <strong>{SUPPORT_EMAIL}</strong>
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Sending...' : 'Send Feedback'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            variant="success"
            title="Feedback Sent!"
            description="Thank you for your feedback. We'll review it and get back to you if needed."
            onClose={() => setShowSuccessToast(false)}
            duration={5000}
          />
        </div>
      )}
    </>
  );
};