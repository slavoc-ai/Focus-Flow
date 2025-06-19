import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export function calculateProjectCompletion(tasks: { completed: boolean }[]): number {
  if (tasks.length === 0) return 0;
  const completedTasks = tasks.filter(task => task.completed).length;
  return Math.round((completedTasks / tasks.length) * 100);
}

export async function uploadDocument(file: File): Promise<{ url: string; name: string }> {
  // This is a stub - in a real app, this would upload to Supabase storage
  // For MVP purposes, we'll simulate this
  console.log('Uploading document:', file.name);
  
  // Return mock values
  return {
    url: URL.createObjectURL(file), // This is temporary and will only work for the current session
    name: file.name
  };
}

export function checkFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}