import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ReynoldsFrictionCalculator from '@/components/calculators/ReynoldsFrictionCalculator';

const ReynoldsFrictionPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link 
            to="/calculators" 
            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calculators
          </Link>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Reynolds Number & Friction Factor Calculator
          </h1>
          <p className="text-muted-foreground">
            Calculate Reynolds number, determine flow regime, and compute friction factor using 
            Colebrook-White (iterative), Swamee-Jain, and Haaland correlations.
          </p>
        </div>

        <ReynoldsFrictionCalculator />
      </div>
    </div>
  );
};

export default ReynoldsFrictionPage;
