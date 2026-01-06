import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

import Footer from '@/components/Footer';

interface CalculatorPageWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function CalculatorPageWrapper({
  title,
  description,
  children
}: CalculatorPageWrapperProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Header */}
      <header className="bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-50 transition-colors duration-300">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/calculators">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Calculators</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-semibold truncate max-w-[200px] sm:max-w-none">
                {title}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        {description && (
          <div className="mb-6">
            <p className="text-muted-foreground text-sm sm:text-base max-w-3xl">
              {description}
            </p>
          </div>
        )}
        {children}
      </main>

      <Footer />
    </div>
  );
}
