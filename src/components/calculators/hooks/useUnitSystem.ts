import { useState, useCallback } from 'react';
import { UnitSystem } from '../types/hydraulicTypes';

export const useUnitSystem = () => {
    const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');

    // Convert value helper
    const convertValue = useCallback((val: string, factor: number) => {
        const num = parseFloat(val);
        return isNaN(num) ? val : (num * factor).toFixed(4);
    }, []);

    const convertTemp = useCallback((val: string, toF: boolean) => {
        const num = parseFloat(val);
        if (isNaN(num)) return val;
        return toF ? ((num * 9 / 5) + 32).toFixed(2) : ((num - 32) * 5 / 9).toFixed(2);
    }, []);

    const handleUnitSystemChange = (isImperial: boolean) => {
        setUnitSystem(isImperial ? 'imperial' : 'metric');
    };

    return {
        unitSystem,
        setUnitSystem,
        handleUnitSystemChange,
        convertValue,
        convertTemp
    };
};
