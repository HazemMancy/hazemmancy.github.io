
import {
    calculateTubeSideHTC,
    calculateTubeSidePressureDrop,
    calculateVibrationAnalysis,
    calculateBellDelaware
} from "./src/lib/heatExchangerCalculations.ts";

// Minimal Self-Check Script
console.log("Running Heat Exchanger Library Self-Check...");

// 1. Check Tube HTC (Turbulent Water)
// Re=50000, Pr=6, k=0.6, D=0.025m
const htc = calculateTubeSideHTC(50000, 6, 0.6, 0.025, true);
console.log(`HTC Test (Expect ~6000): ${htc.h.toFixed(1)} W/m²K`);

// 2. Check Pressure Drop (Water)
// v=2 m/s, rho=1000, mu=0.001, D=0.025m, L=5m
const dp = calculateTubeSidePressureDrop(2, 1000, 0.001, 0.025, 5, 1);
console.log(`Pressure Drop Test (Expect ~16500 Pa): ${dp.pressureDrop.toFixed(1)} Pa`);

// 3. Check Vibration (New Params & Warnings)
const vib = calculateVibrationAnalysis(
    1.0, // velocity
    1000, // shell rho
    0.0254, // OD
    0.03175, // Pitch
    "triangular",
    200e9, // E
    7800, // tube rho
    0.002, // wall thk
    1.0, // L
    0.6, // Shell D
    1000, // Tube fluid rho [NEW]
    1450 // Sound speed [NEW]
);
console.log(`Vibration Natural Freq: ${vib.naturalFrequency.toFixed(1)} Hz`);

// 4. Check Bell-Delaware Validation
console.log("\nTesting Bell-Delaware Validation...");

// 4a. Valid Case
const validBD = calculateBellDelaware(
    10, 1000, 0.001, 0.6, 0.3, 0.25, 0.0254, 0.03175, 4.0, "triangular", 200, 0.003, 0.001, 0.1
);
console.log(`Valid BD: Warnings=${validBD.warnings.length}, Errors=${validBD.errors.length}`);

// 4b. Invalid Baffle Cut (> 50%)
const invalidBD = calculateBellDelaware(
    10, 1000, 0.001, 0.6, 0.3, 0.60, 0.0254, 0.03175, 4.0, "triangular", 200, 0.003, 0.001, 0.1
);
console.log(`Invalid BD (Cut=0.60): Error="${invalidBD.errors[0]}"`);

// 4c. Clamped Nc Warning (Small shell, large pitch)
const clampedBD = calculateBellDelaware(
    10, 1000, 0.001, 0.1, 0.05, 0.25, 0.0254, 0.080, 1.0, "triangular", 10, 0.003, 0.001, 0.1
);
if (clampedBD.warnings.length > 0) {
    console.log(`Clamped BD Warning: "${clampedBD.warnings[0]}"`);
} else {
    console.log("No warning for clamped BD (Unexpected if geometry is tight)");
}

// 5. Vibration Warning (Low Speed of Sound)
const lowSpeedVib = calculateVibrationAnalysis(
    1.0, 1000, 0.0254, 0.03175, "triangular", 200e9, 7800, 0.002, 1.0, 0.6, 1000, 40
);
if (lowSpeedVib.warnings.length > 0) {
    console.log(`Vibration Warning: "${lowSpeedVib.warnings[0]}"`);
}

// Final Verdict
if (
    htc.h > 5000 &&
    dp.pressureDrop > 15000 &&
    validBD.errors.length === 0 &&
    invalidBD.errors.length > 0 &&
    lowSpeedVib.warnings.length > 0
) {
    console.log("\n✅ ALL CHECKS PASSED");
} else {
    console.error("\n❌ CHECKS FAILED");
    process.exit(1);
}
