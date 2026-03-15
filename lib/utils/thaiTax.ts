// Thai Social Security & Tax Calculation Utilities

/**
 * Calculates Thai Social Security (ประกันสังคม)
 * 5% of salary, capped at a maximum salary of 15,000 THB (max 750 THB/month)
 */
export function calculateSSO(monthlySalary: number): number {
    const ssoRate = 0.05;
    const maxSalaryBase = 15000;

    const baseForSso = Math.min(monthlySalary, maxSalaryBase);
    return baseForSso * ssoRate;
}

/**
 * Calculates estimated monthly withholding tax based on Thai progressive tax brackets.
 * Assumes standard deductions for a single person:
 * - Personal allowance: 60,000 THB
 * - Standard expense deduction: 50% of income (max 100,000 THB)
 */
export function calculateMonthlyTax(monthlySalary: number, monthlySideIncome: number = 0): number {
    const yearlySalary = monthlySalary * 12;
    const yearlySideIncome = monthlySideIncome * 12;
    const totalYearlyIncome = yearlySalary + yearlySideIncome;

    if (totalYearlyIncome <= 0) return 0;

    const ssoYearly = calculateSSO(monthlySalary) * 12;

    // Salary gets standard 50% deduction (max 100k)
    const salaryDeduction = Math.min(yearlySalary * 0.5, 100000);
    // For a 'lazy' estimate, assume online selling/freelance has about 50% deductible expenses
    const sideIncomeDeduction = yearlySideIncome * 0.5;
    const personalAllowance = 60000;

    // Net Taxable Income = Gross - Expenses - Personal - SSO
    let netTaxableIncome = totalYearlyIncome - salaryDeduction - sideIncomeDeduction - personalAllowance - ssoYearly;

    if (netTaxableIncome <= 0) return 0;

    let yearlyTax = 0;

    // Tax Brackets (Net Income / Rate)
    const brackets = [
        { limit: 150000, rate: 0.00 }, // 0 - 150k : 0%
        { limit: 300000, rate: 0.05 }, // 150k - 300k : 5%
        { limit: 500000, rate: 0.10 }, // 300k - 500k : 10%
        { limit: 750000, rate: 0.15 }, // 500k - 750k : 15%
        { limit: 1000000, rate: 0.20 }, // 750k - 1m : 20%
        { limit: 2000000, rate: 0.25 }, // 1m - 2m : 25%
        { limit: 5000000, rate: 0.30 }, // 2m - 5m : 30%
        { limit: Infinity, rate: 0.35 }  // > 5m : 35%
    ];

    let previousLimit = 0;

    for (const bracket of brackets) {
        if (netTaxableIncome > previousLimit) {
            const taxableAmountInBracket = Math.min(netTaxableIncome - previousLimit, bracket.limit - previousLimit);
            yearlyTax += taxableAmountInBracket * bracket.rate;
            previousLimit = bracket.limit;
        } else {
            break;
        }
    }

    return yearlyTax / 12; // Return estimated monthly tax
}

/**
 * Returns the true take-home pay
 */
export function calculateNetSalary(monthlySalary: number, monthlySideIncome: number = 0): number {
    const sso = calculateSSO(monthlySalary);
    const tax = calculateMonthlyTax(monthlySalary, monthlySideIncome);
    return (monthlySalary + monthlySideIncome) - sso - tax;
}
