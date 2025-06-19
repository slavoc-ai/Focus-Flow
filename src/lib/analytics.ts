import { supabase } from './supabaseClient';
import { SUPPORT_EMAIL } from '../constants/contact';

export type AnalyticsEvent = {
  event_name: string;
  event_data?: Record<string, any>;
};

class Analytics {
  private static instance: Analytics;
  private readonly MAX_BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    this.scheduleFlush();

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }

    // Log the support email configuration for debugging
    console.log('📊 Analytics initialized with support email:', SUPPORT_EMAIL);
  }

  public static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  private getCommonContext() {
    const session = supabase.auth.session();
    return {
      user_id: session?.user?.id,
      session_id: session?.access_token,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    };
  }

  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const { error } = await supabase
        .from('analytics_events')
        .insert(
          eventsToSend.map(event => ({
            ...event,
            ...this.getCommonContext(),
          }))
        );

      if (error) {
        console.error('Error sending analytics events:', error);
        console.error(`For analytics issues, contact support at: ${SUPPORT_EMAIL}`);
        // Re-queue failed events
        this.eventQueue = [...eventsToSend, ...this.eventQueue];
      }
    } catch (error) {
      console.error('Error flushing analytics events:', error);
      console.error(`For analytics issues, contact support at: ${SUPPORT_EMAIL}`);
      // Re-queue failed events
      this.eventQueue = [...eventsToSend, ...this.eventQueue];
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    this.flushTimeout = setTimeout(() => {
      this.flush();
      this.scheduleFlush();
    }, this.FLUSH_INTERVAL);
  }

  public trackEvent(event_name: string, event_data?: Record<string, any>): void {
    this.eventQueue.push({ event_name, event_data });

    // Log in development
    if (import.meta.env.DEV) {
      console.log(`[Analytics] ${event_name}`, event_data || '');
    }

    // Flush if queue is full
    if (this.eventQueue.length >= this.MAX_BATCH_SIZE) {
      this.flush();
    }
  }

  public trackPageView(page_title: string, additional_data?: Record<string, any>): void {
    this.trackEvent('page_view', {
      page_title,
      ...additional_data,
    });
  }

  public trackError(error: Error, additional_data?: Record<string, any>): void {
    this.trackEvent('error', {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack,
      support_email: SUPPORT_EMAIL,
      ...additional_data,
    });
  }

  public trackInteraction(
    interaction_type: string,
    element_type: string,
    element_id?: string,
    additional_data?: Record<string, any>
  ): void {
    this.trackEvent('interaction', {
      interaction_type,
      element_type,
      element_id,
      ...additional_data,
    });
  }
}

export const analytics = Analytics.getInstance();