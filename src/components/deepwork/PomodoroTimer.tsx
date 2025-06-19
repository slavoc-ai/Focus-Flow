import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';
import { formatTime } from '../../lib/utils';

type TimerPhase = 'idle' | 'work' | 'shortBreak' | 'longBreak' | 'paused';

interface PomodoroTimerProps {
  onPomodoroComplete?: (focusedMinutes: number) => void;
  isSessionActive?: boolean;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  onPomodoroComplete,
  isSessionActive = true
}) => {
  const { user } = useAuth();
  
  // Get user settings or use defaults
  const workMinutes = user?.default_pomodoro_work_minutes || 25;
  const shortBreakMinutes = user?.default_pomodoro_short_break_minutes || 5;
  const longBreakMinutes = user?.default_pomodoro_long_break_minutes || 15;
  const soundNotificationsEnabled = user?.enable_sound_notifications ?? true;
  
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [timeLeft, setTimeLeft] = useState(workMinutes * 60); // in seconds
  const [completedCycles, setCompletedCycles] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const phaseStartTimeRef = useRef<Date | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context for sound notifications
  useEffect(() => {
    if (soundNotificationsEnabled && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Web Audio API not supported:', error);
      }
    }
  }, [soundNotificationsEnabled]);

  // Play notification sound
  const playNotificationSound = (frequency: number = 800, duration: number = 200) => {
    if (!soundNotificationsEnabled || !audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration / 1000);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Error playing notification sound:', error);
    }
  };

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Timer finished
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  // Handle phase completion
  const handlePhaseComplete = () => {
    setIsRunning(false);
    
    // Calculate focused time for work phases
    if (phase === 'work' && phaseStartTimeRef.current) {
      const focusedMinutes = Math.floor((Date.now() - phaseStartTimeRef.current.getTime()) / 1000 / 60);
      onPomodoroComplete?.(focusedMinutes);
    }
    
    // Play notification sound
    if (phase === 'work') {
      playNotificationSound(1000, 300); // Higher pitch for work completion
    } else {
      playNotificationSound(600, 300); // Lower pitch for break completion
    }
    
    // Move to next phase
    moveToNextPhase();
  };

  // Move to next phase
  const moveToNextPhase = () => {
    if (phase === 'work') {
      const newCompletedCycles = completedCycles + 1;
      setCompletedCycles(newCompletedCycles);
      
      // Determine break type
      if (newCompletedCycles % 4 === 0) {
        setPhase('longBreak');
        setTimeLeft(longBreakMinutes * 60);
      } else {
        setPhase('shortBreak');
        setTimeLeft(shortBreakMinutes * 60);
      }
    } else {
      // After any break, go back to work
      setPhase('work');
      setTimeLeft(workMinutes * 60);
    }
  };

  // Start/Resume timer
  const startTimer = () => {
    if (phase === 'idle') {
      setPhase('work');
      setTimeLeft(workMinutes * 60);
    }
    setIsRunning(true);
    phaseStartTimeRef.current = new Date();
  };

  // Pause timer
  const pauseTimer = () => {
    setIsRunning(false);
  };

  // Skip current interval
  const skipInterval = () => {
    setIsRunning(false);
    setTimeLeft(0);
    handlePhaseComplete();
  };

  // Reset timer
  const resetTimer = () => {
    setIsRunning(false);
    setPhase('idle');
    setTimeLeft(workMinutes * 60);
    setCompletedCycles(0);
    phaseStartTimeRef.current = null;
  };

  // Get phase display info
  const getPhaseInfo = () => {
    switch (phase) {
      case 'work':
        return { 
          label: 'Work Time', 
          color: 'text-primary', 
          bgColor: 'bg-primary/10 border-primary/20' 
        };
      case 'shortBreak':
        return { 
          label: 'Short Break', 
          color: 'text-secondary', 
          bgColor: 'bg-secondary/10 border-secondary/20' 
        };
      case 'longBreak':
        return { 
          label: 'Long Break', 
          color: 'text-accent', 
          bgColor: 'bg-accent/10 border-accent/20' 
        };
      default:
        return { 
          label: 'Ready to Start', 
          color: 'text-muted-foreground', 
          bgColor: 'bg-muted border-border' 
        };
    }
  };

  const phaseInfo = getPhaseInfo();

  return (
    <div className={`rounded-2xl p-8 shadow-lg border ${phaseInfo.bgColor}`}>
      {/* Phase Label */}
      <div className="text-center mb-6">
        <h2 className={`text-xl font-semibold ${phaseInfo.color}`}>
          {phaseInfo.label}
        </h2>
        {completedCycles > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Completed cycles: {completedCycles}
          </p>
        )}
      </div>

      {/* Timer Display */}
      <div className="text-center mb-8">
        <div className="text-6xl md:text-7xl font-mono font-bold text-foreground">
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-4">
        {!isRunning ? (
          <Button
            onClick={startTimer}
            size="lg"
            className="flex items-center space-x-2"
            disabled={!isSessionActive}
          >
            <Play className="w-5 h-5" />
            <span>{phase === 'idle' ? 'Start' : 'Resume'}</span>
          </Button>
        ) : (
          <Button
            onClick={pauseTimer}
            size="lg"
            variant="secondary"
            className="flex items-center space-x-2"
          >
            <Pause className="w-5 h-5" />
            <span>Pause</span>
          </Button>
        )}

        <Button
          onClick={skipInterval}
          size="lg"
          variant="outline"
          className="flex items-center space-x-2"
          disabled={phase === 'idle'}
        >
          <SkipForward className="w-5 h-5" />
          <span>Skip</span>
        </Button>

        <Button
          onClick={resetTimer}
          size="lg"
          variant="ghost"
          className="flex items-center space-x-2"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Reset</span>
        </Button>
      </div>

      {/* Progress Indicator */}
      {phase !== 'idle' && (
        <div className="mt-6">
          <div className="w-full bg-border rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-1000 ${
                phase === 'work' ? 'bg-primary' :
                phase === 'shortBreak' ? 'bg-secondary' :
                'bg-accent'
              }`}
              style={{
                width: `${((getTotalTime() - timeLeft) / getTotalTime()) * 100}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );

  function getTotalTime(): number {
    switch (phase) {
      case 'work':
        return workMinutes * 60;
      case 'shortBreak':
        return shortBreakMinutes * 60;
      case 'longBreak':
        return longBreakMinutes * 60;
      default:
        return workMinutes * 60;
    }
  }
};