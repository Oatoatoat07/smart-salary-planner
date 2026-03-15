export interface BudgetTargets {
  needs: number;
  wants: number;
  investments: number;
}

export interface ActualSpending {
  needs: number;
  wants: number;
  investments: number;
  unknown: number;
}

export interface Insight {
  id: string;
  type: 'warning' | 'success' | 'info';
  message: string;
}

export function generateSmartInsights(
  netSalary: number,
  targets: BudgetTargets,
  actuals: ActualSpending
): Insight[] {
  const insights: Insight[] = [];

  // Edge case: No data yet
  if (netSalary === 0 || (actuals.needs === 0 && actuals.wants === 0 && actuals.investments === 0)) {
    return [{
      id: 'welcome',
      type: 'info',
      message: 'Start adding your income and expenses to see personalized insights here!'
    }];
  }

  const totalSpent = actuals.needs + actuals.wants + actuals.investments + actuals.unknown;
  const isLowIncome = netSalary < 20000;

  // 1. Overall Warning: Spending more than you earn
  if (totalSpent > netSalary) {
    insights.push({
      id: 'over_budget',
      type: 'warning',
      message: '🚨 Alert: You are currently spending more than your net income! Review your biggest expenses immediately.'
    });
  }

  // 2. Needs Check
  if (actuals.needs > targets.needs) {
    const diff = actuals.needs - targets.needs;
    insights.push({
      id: 'high_needs',
      type: 'warning',
      message: `Your basic Needs are exceeding your target by ฿${diff.toLocaleString()}. Consider reviewing fixed subscriptions or rent if possible, as this leaves less room for your future.`
    });
  }

  // 3. Wants Check
  if (actuals.wants > targets.wants) {
    insights.push({
      id: 'high_wants',
      type: 'warning',
      message: `You're spending a bit too much on Wants this month. Try to cut back on little daily treats (like coffee or shopping) to stay within your budget.`
    });
  }

  // 4. Investments & Savings Check
  if (actuals.investments < targets.investments) {
    if (isLowIncome) {
      insights.push({
        id: 'low_invest_low_salary',
        type: 'info',
        message: `It's tough to invest heavily with a starting salary. Focus on building an emergency cash fund (around 30,000 THB) in a high-yield savings account first before looking at stocks.`
      });
    } else {
      insights.push({
        id: 'low_invest_high_salary',
        type: 'warning',
        message: `You are falling behind on your saving/investing goals! Try to move money into your investment accounts at the start of the month so you don't accidentally spend it.`
      });
    }
  } else if (actuals.investments > 0 && actuals.investments >= targets.investments) {
    insights.push({
      id: 'high_invest_success',
      type: 'success',
      message: `🎉 Great job hitting your investment target! Consistency is the key to building wealth.`
    });
  }

  // 5. Uncategorized reminder
  if (actuals.unknown > 0) {
    insights.push({
      id: 'has_unknowns',
      type: 'info',
      message: `You have ฿${actuals.unknown.toLocaleString()} in uncategorized expenses. Assign them a category in the list above for better tracking.`
    });
  }

  return insights;
}
