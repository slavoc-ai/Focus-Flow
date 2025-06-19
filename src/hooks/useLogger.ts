import { useCallback } from 'react';
import { logger } from '../lib/logger';

export function useLogger() {
  const debug = useCallback((message: string, context?: Record<string, any>) => {
    logger.debug(message, context);
  }, []);

  const info = useCallback((message: string, context?: Record<string, any>) => {
    logger.info(message, context);
  }, []);

  const warn = useCallback((message: string, context?: Record<string, any>) => {
    logger.warn(message, context);
  }, []);

  const error = useCallback((message: string, context?: Record<string, any>) => {
    logger.error(message, context);
  }, []);

  const logError = useCallback((error: Error, context?: Record<string, any>) => {
    logger.createErrorLog(error, context);
  }, []);

  return {
    debug,
    info,
    warn,
    error,
    logError,
  };
}