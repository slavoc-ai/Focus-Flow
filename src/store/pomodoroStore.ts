import { create } from 'zustand';
import { PomodoroSettings, PomodoroState, PomodoroPhase } from '../types';
import { DEFAULT_POMODORO_SETTINGS } from '../constants';

interface PomodoroStore {
  // State
  settings: PomodoroSettings;
  state: PomodoroState;
  
  // Actions
  initializeTimer: (settings?: Partial<PomodoroSettings>) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: (phase?: PomodoroPhase) => void;
  skipToNextPhase: () => void;
  updateSettings: (newSettings: Partial<PomodoroSettings>) => void;
  tick: () => void;
}

export const usePomodoroStore = create<PomodoroStore>((set, get) => ({
  settings: { ...DEFAULT_POMODORO_SETTINGS },
  
  state: {
    phase: 'work',
    timeLeft: DEFAULT_POMODORO_SETTINGS.workMinutes * 60,
    isRunning: false,
    totalCompletedPomodoros: 0
  },
  
  initializeTimer: (settings = {}) => {
    const newSettings = { ...get().settings, ...settings };
    set({ 
      settings: newSettings,
      state: {
        ...get().state,
        phase: 'work',
        timeLeft: newSettings.workMinutes * 60,
        isRunning: false
      }
    });
  },
  
  startTimer: () => {
    set(state => ({
      state: {
        ...state.state,
        isRunning: true
      }
    }));
  },
  
  pauseTimer: () => {
    set(state => ({
      state: {
        ...state.state,
        isRunning: false
      }
    }));
  },
  
  resetTimer: (phase = 'work') => {
    const { settings } = get();
    let timeLeft = 0;
    
    switch (phase) {
      case 'work':
        timeLeft = settings.workMinutes * 60;
        break;
      case 'short-break':
        timeLeft = settings.shortBreakMinutes * 60;
        break;
      case 'long-break':
        timeLeft = settings.longBreakMinutes * 60;
        break;
    }
    
    set(state => ({
      state: {
        ...state.state,
        phase,
        timeLeft,
        isRunning: false
      }
    }));
  },
  
  skipToNextPhase: () => {
    const { state, settings } = get();
    let nextPhase: PomodoroPhase = 'work';
    let nextTimeLeft = settings.workMinutes * 60;
    let totalCompletedPomodoros = state.totalCompletedPomodoros;
    
    if (state.phase === 'work') {
      // After work, determine if it should be a short or long break
      totalCompletedPomodoros += 1;
      if (totalCompletedPomodoros % 4 === 0) {
        nextPhase = 'long-break';
        nextTimeLeft = settings.longBreakMinutes * 60;
      } else {
        nextPhase = 'short-break';
        nextTimeLeft = settings.shortBreakMinutes * 60;
      }
    } else {
      // After any break, go back to work
      nextPhase = 'work';
      nextTimeLeft = settings.workMinutes * 60;
    }
    
    set({
      state: {
        ...state,
        phase: nextPhase,
        timeLeft: nextTimeLeft,
        totalCompletedPomodoros
      }
    });
    
    // Play sound notification if enabled
    if (settings.enableSoundNotifications) {
      // Play sound - will implement in a separate component
    }
  },
  
  updateSettings: (newSettings) => {
    set(state => ({ 
      settings: { ...state.settings, ...newSettings } 
    }));
  },
  
  tick: () => {
    const { state } = get();
    
    if (!state.isRunning || state.timeLeft <= 0) return;
    
    const newTimeLeft = state.timeLeft - 1;
    
    if (newTimeLeft <= 0) {
      // Time's up, move to the next phase
      get().skipToNextPhase();
    } else {
      // Just update the time
      set({
        state: {
          ...state,
          timeLeft: newTimeLeft
        }
      });
    }
  }
}));