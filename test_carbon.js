const { computeEmissionsAvoidance } = require('./backend/src/services/carbonEngine.js');

console.log("=========================================");
console.log("    EPA WARM v15 Carbon Metrics Tests    ");
console.log("=========================================\n");

console.log("Formula: Weight (lbs) * 2.0 * CategoryMultiplier\n");

// Test 1: PREPARED_MEALS
// Weight = 100 lbs
// Multiplier = 1.2
// Expected Avoided CO2e = 100 * 2.0 * 1.2 = 240.00
const t1 = computeEmissionsAvoidance({ weightLbs: 100, classification: 'PREPARED_MEALS' });
console.log("Test 1: Prepared Meals Diversion");
console.log("Input   : 100 lbs, PREPARED_MEALS");
console.log("Expected: 240.00 avoided CO2e lbs");
console.log("Actual  :", t1.avoidedEmissionsLbs.toFixed(2));
console.log("Status  :", t1.avoidedEmissionsLbs === 240.00 ? "✅ PASS" : "❌ FAIL");
console.log("");

// Test 2: Shelf-Stable
// Weight = 100 lbs
// Multiplier = 1.0
// Expected Avoided CO2e = 100 * 2.0 * 1.0 = 200.00
const t2 = computeEmissionsAvoidance({ weightLbs: 100, classification: 'SHELF_STABLE' });
console.log("Test 2: Shelf-Stable Food Diversion");
console.log("Input   : 100 lbs, SHELF_STABLE");
console.log("Expected: 200.00 avoided CO2e lbs");
console.log("Actual  :", t2.avoidedEmissionsLbs.toFixed(2));
console.log("Status  :", t2.avoidedEmissionsLbs === 200.00 ? "✅ PASS" : "❌ FAIL");
console.log("");

// Test 3: Fractional calculations
// Weight = 47.5 lbs, DAIRY_MEAT
// Expected Avoided CO2e = 47.5 * 2.0 * 1.3 = 123.50
const t3 = computeEmissionsAvoidance({ weightLbs: 47.5, classification: 'DAIRY_MEAT' });
console.log("Test 3: Fractional Weights (DAIRY_MEAT)");
console.log("Input   : 47.5 lbs, DAIRY_MEAT");
console.log("Expected: 123.50 avoided CO2e lbs");
console.log("Actual  :", t3.avoidedEmissionsLbs.toFixed(2));
console.log("Status  :", t3.avoidedEmissionsLbs === 123.50 ? "✅ PASS" : "❌ FAIL");

console.log("\n=========================================\n");
