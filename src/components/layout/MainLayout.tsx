import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { cn } from '../../lib/utils';

interface MainLayoutProps {
  children?: React.ReactNode;
  variant?: 'default' | 'full-bleed';
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, variant = 'default' }) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const effectiveVariant = isHomePage ? 'full-bleed' : variant;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className={cn(
        "flex-grow",
        effectiveVariant === 'default' && "container mx-auto px-4 py-8"
      )}>
        {children || <Outlet />}
      </main>
      <Footer />
    </div>
  );
};