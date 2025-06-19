import { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '../lib/analytics';

export function useAnalytics() {
  const location = useLocation();

  // Track page views automatically
  useEffect(() => {
    const pageTitle = document.title;
    analytics.trackPageView(pageTitle, {
      path: location.pathname,
      search: location.search,
    });
  }, [location]);

  const trackEvent = useCallback((event_name: string, event_data?: Record<string, any>) => {
    analytics.trackEvent(event_name, event_data);
  }, []);

  const trackError = useCallback((error: Error, additional_data?: Record<string, any>) => {
    analytics.trackError(error, additional_data);
  }, []);

  const trackInteraction = useCallback(
    (
      interaction_type: string,
      element_type: string,
      element_id?: string,
      additional_data?: Record<string, any>
    ) => {
      analytics.trackInteraction(interaction_type, element_type, element_id, additional_data);
    },
    []
  );

  return {
    trackEvent,
    trackError,
    trackInteraction,
  };
}