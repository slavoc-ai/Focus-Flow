import { create } from 'zustand';

interface UiState {
  viewMode: 'wizard' | 'power';
  cameFromReviewPage: boolean;
  setViewMode: (mode: 'wizard' | 'power') => void;
  toggleViewMode: () => void;
  setCameFromReviewPage: (value: boolean) => void;
  initialize: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  viewMode: 'wizard', // Default to wizard for new users
  cameFromReviewPage: false,
  
  setViewMode: (mode) => {
    set({ viewMode: mode });
    localStorage.setItem('focusflow-view-mode', mode);
  },
  
  toggleViewMode: () => {
    const newMode = get().viewMode === 'wizard' ? 'power' : 'wizard';
    set({ viewMode: newMode });
    localStorage.setItem('focusflow-view-mode', newMode);
  },
  
  setCameFromReviewPage: (value) => set({ cameFromReviewPage: value }),
  
  initialize: () => {
    const savedMode = localStorage.getItem('focusflow-view-mode');
    if (savedMode === 'power') {
      set({ viewMode: 'power' });
    }
  },
}));