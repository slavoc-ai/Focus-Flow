import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Play, Pause, SkipForward, PlusCircle } from 'lucide-react';
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
  const [totalTime, setTotalTime] = useState(workMinutes * 60); // Track total time for progress
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
        const newTime = longBreakMinutes * 60;
        setTimeLeft(newTime);
        setTotalTime(newTime);
      } else {
        setPhase('shortBreak');
        const newTime = shortBreakMinutes * 60;
        setTimeLeft(newTime);
        setTotalTime(newTime);
      }
    } else {
      // After any break, go back to work
      setPhase('work');
      const newTime = workMinutes * 60;
      setTimeLeft(newTime);
      setTotalTime(newTime);
    }
  };

  // Start/Resume timer
  const startTimer = () => {
    if (phase === 'idle') {
      setPhase('work');
      const newTime = workMinutes * 60;
      setTimeLeft(newTime);
      setTotalTime(newTime);
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

  // NEW: Add 5 minutes to current timer
  const addFiveMinutes = () => {
    const additionalTime = 5 * 60; // 5 minutes in seconds
    setTimeLeft(prev => prev + additionalTime);
    setTotalTime(prev => prev + additionalTime);
  };

  // Get phase display info with improved colors for visibility
  const getPhaseInfo = () => {
    switch (phase) {
      case 'work':
        return { 
          label: 'Work Time', 
          color: 'text-primary', 
          bgColor: 'bg-primary/10 border-primary/20',
          // Improved colors for better visibility in both themes
          progressColor: '#2563EB', // Blue-600 - solid color for work
          backgroundStroke: 'rgba(37, 99, 235, 0.15)' // Blue with low opacity
        };
      case 'shortBreak':
        return { 
          label: 'Short Break', 
          color: 'text-secondary', 
          bgColor: 'bg-secondary/10 border-secondary/20',
          progressColor: '#10B981', // Emerald-500 - solid color for short break
          backgroundStroke: 'rgba(16, 185, 129, 0.15)' // Emerald with low opacity
        };
      case 'longBreak':
        return { 
          label: 'Long Break', 
          color: 'text-accent', 
          bgColor: 'bg-accent/10 border-accent/20',
          progressColor: '#F97316', // Orange-500 - solid color for long break
          backgroundStroke: 'rgba(249, 115, 22, 0.15)' // Orange with low opacity
        };
      default:
        return { 
          label: 'Ready to Start', 
          color: 'text-muted-foreground', 
          bgColor: 'bg-muted border-border',
          progressColor: '#6B7280', // Gray-500 - solid color for idle
          backgroundStroke: 'rgba(107, 114, 128, 0.15)' // Gray with low opacity
        };
    }
  };

  // Get next phase info for "Next Up" display
  const getNextPhaseInfo = () => {
    if (phase === 'work') {
      const nextCycles = completedCycles + 1;
      if (nextCycles % 4 === 0) {
        return { label: 'Long Break', duration: formatTime(longBreakMinutes * 60) };
      } else {
        return { label: 'Short Break', duration: formatTime(shortBreakMinutes * 60) };
      }
    } else {
      return { label: 'Work', duration: formatTime(workMinutes * 60) };
    }
  };

  // Calculate progress percentage
  const progressPercentage = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
  const circumference = 2 * Math.PI * 90; // radius of 90
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  const phaseInfo = getPhaseInfo();
  const nextPhase = getNextPhaseInfo();

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

      {/* Timer Display with Enhanced Circular Progress */}
      <div className="text-center mb-6 relative">
        {/* Circular Progress Bar with Fixed Colors */}
        {phase !== 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-64 h-64 transform -rotate-90" viewBox="0 0 200 200">
              {/* Background circle with improved visibility */}
              <circle
                cx="100"
                cy="100"
                r="90"
                stroke={phaseInfo.backgroundStroke}
                strokeWidth="8"
                fill="transparent"
              />
              {/* Progress circle with solid colors for better visibility */}
              <circle
                cx="100"
                cy="100"
                r="90"
                stroke={phaseInfo.progressColor}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{
                  filter: 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.1))'
                }}
              />
            </svg>
          </div>
        )}
        
        {/* Timer Text */}
        <div className="relative z-10 flex items-center justify-center h-64">
          <div className="text-6xl md:text-7xl font-mono font-bold text-foreground">
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Next Up Display */}
      {phase !== 'idle' && (
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">
            Next: <span className="font-medium text-card-foreground">
              {nextPhase.label} ({nextPhase.duration})
            </span>
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center space-x-3">
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

        {/* Add 5 Min Button */}
        <Button
          onClick={addFiveMinutes}
          size="lg"
          variant="ghost"
          className="flex items-center space-x-2"
          disabled={phase === 'idle' || timeLeft === 0}
          title="Extend timer by 5 minutes"
        >
          <PlusCircle className="w-5 h-5" />
          <span>+5 Min</span>
        </Button>
      </div>
    </div>
  );
};