import { supabase } from './supabaseClient';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
}

class Logger {
  private static instance: Logger;
  private readonly MAX_BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private logQueue: LogEntry[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    // Initialize flush interval
    this.scheduleFlush();

    // Listen for unload to flush remaining logs
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getCommonContext(): Pick<LogEntry, 'userId' | 'sessionId' | 'url' | 'userAgent'> {
    const session = supabase.auth.session();
    return {
      userId: session?.user?.id,
      sessionId: session?.access_token,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    };
  }

  private async flush(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const logsToSend = [...this.logQueue];
    this.logQueue = [];

    try {
      const { error } = await supabase
        .from('logs')
        .insert(logsToSend);

      if (error) {
        console.error('Error sending logs to Supabase:', error);
        // Re-queue failed logs
        this.logQueue = [...logsToSend, ...this.logQueue];
      }
    } catch (error) {
      console.error('Error flushing logs:', error);
      // Re-queue failed logs
      this.logQueue = [...logsToSend, ...this.logQueue];
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

  private addToQueue(entry: Omit<LogEntry, 'timestamp'>): void {
    const fullEntry: LogEntry = {
      ...entry,
      ...this.getCommonContext(),
      timestamp: new Date().toISOString(),
    };

    this.logQueue.push(fullEntry);

    // Also log to console in development
    if (import.meta.env.DEV) {
      const consoleMethod = entry.level === 'debug' ? 'log' : entry.level;
      console[consoleMethod](
        `[${fullEntry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`,
        entry.context || ''
      );
    }

    // Flush if queue is full
    if (this.logQueue.length >= this.MAX_BATCH_SIZE) {
      this.flush();
    }
  }

  public debug(message: string, context?: Record<string, any>): void {
    this.addToQueue({ level: 'debug', message, context });
  }

  public info(message: string, context?: Record<string, any>): void {
    this.addToQueue({ level: 'info', message, context });
  }

  public warn(message: string, context?: Record<string, any>): void {
    this.addToQueue({ level: 'warn', message, context });
  }

  public error(message: string, context?: Record<string, any>): void {
    this.addToQueue({ level: 'error', message, context });
  }

  public async createErrorLog(error: Error, context?: Record<string, any>): Promise<void> {
    const errorContext = {
      ...context,
      name: error.name,
      stack: error.stack,
    };

    this.error(error.message, errorContext);
  }
}

export const logger = Logger.getInstance();