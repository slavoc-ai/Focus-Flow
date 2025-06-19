import React from 'react';
import { Brain } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-card shadow-inner py-6 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Brain className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-card-foreground">FocusFlow</span>
          </div>
          
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Contact
            </a>
          </div>
          
          <div className="mt-4 md:mt-0 text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} FocusFlow. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};