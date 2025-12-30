import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CompressorPowerCalculator from '@/components/calculators/CompressorPowerCalculator';
import Footer from '@/components/Footer';

const CompressorPowerPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-6">
          <Link to="/calculators">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Calculators
            </Button>
          </Link>
        </div>
        <CompressorPowerCalculator />
      </div>
      <Footer />
    </div>
  );
};

export default CompressorPowerPage;
