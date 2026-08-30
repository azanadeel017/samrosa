const { computeEnhancedDeduction, applyCeilingRule } = require('./backend/src/services/taxEngine.js');

console.log("=========================================");
console.log("  IRC § 170(e)(3) Tax Engine Validation  ");
console.log("=========================================\n");

console.log("--- 1. Testing computeEnhancedDeduction ---");
console.log("Formula: Min( Cost + 0.5 * (FMV - Cost), 2 * Cost )");

// Test A: 2x Cost Basis limit is applied
// C = $100, FMV = $400
// Formula 1: 100 + 0.5 * 300 = 250
// Formula 2: 2 * 100 = 200
// Result: 200
const t1 = computeEnhancedDeduction({ costBasis: 100, retailValue: 400 });
console.log("\nTest A: High Margin (Cost=$100, FMV=$400)");
console.log("Expected: 200.00");
console.log("Actual  :", t1.enhancedDeduction.toFixed(2));
console.log("Status  :", t1.enhancedDeduction === 200 ? "✅ PASS" : "❌ FAIL");

// Test B: 0.5*(Appreciation) limit is applied
// C = $100, FMV = $200
// Formula 1: 100 + 0.5 * 100 = 150
// Formula 2: 2 * 100 = 200
// Result: 150
const t2 = computeEnhancedDeduction({ costBasis: 100, retailValue: 200 });
console.log("\nTest B: Moderate Margin (Cost=$100, FMV=$200)");
console.log("Expected: 150.00");
console.log("Actual  :", t2.enhancedDeduction.toFixed(2));
console.log("Status  :", t2.enhancedDeduction === 150 ? "✅ PASS" : "❌ FAIL");

console.log("\n--- 2. Testing applyCeilingRule ---");
console.log("Formula: Min( EnhancedDeduction, 15% of NetIncome )");

// Test C: Deduction hits the 15% net income ceiling
// Enhanced = $15,000, Income = $50,000
// 15% Ceiling = $7,500
const c1 = applyCeilingRule({ enhancedDeduction: 15000, donorNetIncome: 50000 });
console.log("\nTest C: Exceeds Ceiling (Enhanced=$15,000, Income=$50,000)");
console.log("Expected Limit: 7500.00");
console.log("Actual Limit  :", c1.allowableDeduction.toFixed(2));
console.log("Status        :", c1.allowableDeduction === 7500 ? "✅ PASS" : "❌ FAIL");

// Test D: Deduction stays under the ceiling
// Enhanced = $5,000, Income = $50,000
// 15% Ceiling = $7,500
const c2 = applyCeilingRule({ enhancedDeduction: 5000, donorNetIncome: 50000 });
console.log("\nTest D: Below Ceiling (Enhanced=$5,000, Income=$50,000)");
console.log("Expected Limit: 5000.00");
console.log("Actual Limit  :", c2.allowableDeduction.toFixed(2));
console.log("Status        :", c2.allowableDeduction === 5000 ? "✅ PASS" : "❌ FAIL");

console.log("\n=========================================\n");
