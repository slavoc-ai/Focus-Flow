// Focus tips shown during loading
export const FOCUS_TIPS = [
  "Turn off all unnecessary notifications.",
  "Put your phone on silent or 'Do Not Disturb' mode.",
  "Prepare your workspace: clear away any clutter.",
  "Pour a glass of water to stay hydrated during your session.",
  "Take a few deep breaths to center yourself.",
  "Remember: small steps lead to big results!",
  "Close unnecessary browser tabs to reduce distractions.",
  "Set a clear intention for what you want to accomplish.",
  "Ensure good lighting in your workspace.",
  "Adjust your chair for proper posture.",
  "If music helps you focus, prepare a distraction-free playlist.",
  "Let others know you'll be unavailable during this time.",
  "Break down complex tasks into smaller, manageable parts.",
  "Focus on one task at a time.",
  "Set realistic expectations for your session."
];

// Default Pomodoro settings
export const DEFAULT_POMODORO_SETTINGS = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  enableSoundNotifications: true
};

// Energy levels for task input
export const ENERGY_LEVELS = [
  { value: 'low', label: 'Low', description: 'Feeling tired or unfocused' },
  { value: 'medium', label: 'Medium', description: 'Average energy level' },
  { value: 'high', label: 'High', description: 'Feeling energetic and motivated' }
];

// Supported document formats
export const SUPPORTED_DOCUMENT_FORMATS = [
  'application/pdf'
];

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PROJECT: '/project/:id',
  TASK_PLAN: '/project/:id/plan',
  DEEP_WORK: '/project/:id/deep-work',
  HISTORY: '/history',
  SETTINGS: '/settings',
};