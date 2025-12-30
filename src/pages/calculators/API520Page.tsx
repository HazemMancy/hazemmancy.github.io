import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import API520Calculator from '@/components/calculators/API520Calculator';
import Footer from '@/components/Footer';

export default function API520Page() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-6">
          <Link to="/calculators">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Calculators
            </Button>
          </Link>
        </div>
        <API520Calculator />
      </div>
      <Footer />
    </div>
  );
}
