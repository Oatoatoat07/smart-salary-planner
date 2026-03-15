'use client';

import { useState, useMemo, useEffect } from 'react';
import { calculateNetSalary, calculateMonthlyTax, calculateSSO } from '@/lib/utils/thaiTax';
import { parseExpenseDump, ExpenseCategory } from '@/lib/utils/categorizer';
import { generateSmartInsights } from '@/lib/utils/budgetEngine';
import { PieChart, Lightbulb, Wallet, CheckCircle2, AlertTriangle, TrendingDown } from 'lucide-react';
import { BudgetBar } from '../components/BudgetBar';
import Link from 'next/link';

interface FixedBill {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
}

export default function ReportDashboard() {
  const [isLoaded, setIsLoaded] = useState(false);
  
  // State to hold local storage data
  const [grossSalaryStr, setGrossSalaryStr] = useState<string>('');
  const [sideIncomeStr, setSideIncomeStr] = useState<string>('');
  const [expenseDump, setExpenseDump] = useState<string>('');
  
  const [needsPct, setNeedsPct] = useState<number>(50);
  const [wantsPct, setWantsPct] = useState<number>(30);
  const [investPct, setInvestPct] = useState<number>(20);
  
  const [fixedBills, setFixedBills] = useState<FixedBill[]>([]);

  // Load state from local storage on mount
  useEffect(() => {
    const savedBills = localStorage.getItem('salaryPlannerFixedBills');
    if (savedBills) {
      try { setFixedBills(JSON.parse(savedBills)); } catch (e) { }
    }
    
    const savedState = localStorage.getItem('salaryPlannerState');
    if (savedState) {
        try {
            const data = JSON.parse(savedState);
            if (data.grossSalaryStr) setGrossSalaryStr(data.grossSalaryStr);
            if (data.sideIncomeStr) setSideIncomeStr(data.sideIncomeStr);
            if (data.expenseDump !== undefined) setExpenseDump(data.expenseDump);
            if (data.needsPct) setNeedsPct(data.needsPct);
            if (data.wantsPct) setWantsPct(data.wantsPct);
            if (data.investPct) setInvestPct(data.investPct);
        } catch (e) {}
    }
    setIsLoaded(true);
  }, []);

  // Compute all metrics exactly as in page.tsx
  const grossSalary = parseFloat(grossSalaryStr.replace(/,/g, '')) || 0;
  const sideIncome = parseFloat(sideIncomeStr.replace(/,/g, '')) || 0;
  const netSalary = calculateNetSalary(grossSalary, sideIncome);

  const parsedExpenses = useMemo(() => {
    return parseExpenseDump(expenseDump); // Assuming no overrides for simplicity on report, or we could load overrides too
  }, [expenseDump]);

  const budgetTargets = {
    needs: netSalary * (needsPct / 100),
    wants: netSalary * (wantsPct / 100),
    investments: netSalary * (investPct / 100)
  };

  const actualSpending = useMemo(() => {
    const totals = { needs: 0, wants: 0, investments: 0, unknown: 0 };
    parsedExpenses.forEach(exp => { totals[exp.category] += exp.amount; });
    fixedBills.forEach(bill => { totals[bill.category] += bill.amount; });
    return totals;
  }, [parsedExpenses, fixedBills]);

  const totalExpenses = actualSpending.needs + actualSpending.wants + actualSpending.investments + actualSpending.unknown;
  const remainingCash = netSalary - totalExpenses;
  
  const fmt = (num: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);

  const insights = useMemo(() => {
    return generateSmartInsights(netSalary, budgetTargets, actualSpending);
  }, [netSalary, budgetTargets, actualSpending]);

  const totalFixedAmount = fixedBills.reduce((sum, b) => sum + b.amount, 0);
  const totalVariableAmount = parsedExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (grossSalary === 0 && sideIncome === 0) {
      return (
          <main className="min-h-screen py-20 px-4 max-w-2xl mx-auto text-center space-y-6">
              <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200">
                 <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
                 <h2 className="text-2xl font-bold text-slate-800 mb-2">No Data Found</h2>
                 <p className="text-slate-500 mb-6">It looks like you haven't set up your salary or budget yet.</p>
                 <Link href="/" className="btn-primary inline-flex">Go to Planner</Link>
              </div>
          </main>
      )
  }

  return (
    <main className="min-h-screen py-10 px-4 max-w-5xl mx-auto space-y-8">
      <header className="text-center space-y-2 mb-8">
        <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
          Executive Summary
        </h1>
        <p className="text-slate-500 font-medium tracking-wide">Your monthly financial health at a glance.</p>
      </header>

      {/* Top Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-200 shadow-lg border-0 transform hover:-translate-y-1 transition duration-300">
            <div className="flex items-center gap-2 text-blue-100 mb-4 text-sm font-semibold uppercase tracking-wider">
               <Wallet size={16} /> Net Income
            </div>
            <div className="text-3xl font-extrabold">{fmt(netSalary)}</div>
            <div className="text-blue-100 text-xs mt-2 opacity-90">After Social Security & Taxes</div>
        </div>
        
        <div className="glass-panel p-6 bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-red-200 shadow-lg border-0 transform hover:-translate-y-1 transition duration-300">
            <div className="flex items-center gap-2 text-rose-100 mb-4 text-sm font-semibold uppercase tracking-wider">
               <TrendingDown size={16} /> Total Expenses
            </div>
            <div className="text-3xl font-extrabold">{fmt(totalExpenses)}</div>
            <div className="text-rose-100 text-xs mt-2 flex gap-3 opacity-90">
                <span>Fixed: {fmt(totalFixedAmount)}</span>
                <span>Var: {fmt(totalVariableAmount)}</span>
            </div>
        </div>

        <div className={`glass-panel p-6 border-0 shadow-lg transform hover:-translate-y-1 transition duration-300 ${remainingCash >= 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-200' : 'bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-slate-300'}`}>
            <div className="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wider opacity-90">
               <PieChart size={16} /> Remaining Cash
            </div>
            <div className={`text-3xl font-extrabold`}>{fmt(remainingCash)}</div>
            <div className="text-xs mt-2 opacity-90">
               {remainingCash >= 0 ? 'Surplus cash you can safely save!' : 'You are currently in a deficit!'}
            </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 pt-4">
        {/* Left Column: Progress Bars */}
        <div className="md:col-span-2 space-y-6">
            <div className="glass-panel p-8 bg-white border border-slate-200 space-y-8 h-full">
                <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6 relative">
                    Budget Progress
                    <span className="absolute bottom-[-1px] left-0 w-16 h-1 bg-blue-500 rounded-full"></span>
                </h2>
                
                <BudgetBar
                    label={`Needs (จำเป็น) - ${needsPct}% Target`}
                    target={budgetTargets.needs}
                    actual={actualSpending.needs}
                    color="bg-blue-500"
                />
                
                <BudgetBar
                    label={`Wants (ซื้อความสุข) - ${wantsPct}% Target`}
                    target={budgetTargets.wants}
                    actual={actualSpending.wants}
                    color="bg-purple-500"
                />
                
                <BudgetBar
                    label={`Invest/Save (อนาคต) - ${investPct}% Target`}
                    target={budgetTargets.investments}
                    actual={actualSpending.investments}
                    color="bg-emerald-500"
                />
            </div>
        </div>

        {/* Right Column: AI Insights */}
        <div className="space-y-6">
            <div className="glass-panel p-8 bg-gradient-to-b from-slate-50 to-white border border-slate-200 h-full relative overflow-hidden">
                <Lightbulb size={120} className="absolute -top-10 -right-10 text-amber-100 opacity-50" />
                <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6 relative z-10 flex items-center gap-2">
                    <Lightbulb size={24} className="text-amber-500" />
                    Smart Insights
                </h2>
                
                <div className="space-y-4 relative z-10">
                    {insights.length === 0 ? (
                        <div className="text-sm text-slate-500 text-center py-10 flex flex-col items-center">
                            <CheckCircle2 size={32} className="text-emerald-400 mb-2" />
                            Looking good! No specific warnings for this budget.
                        </div>
                    ) : (
                        insights.map(insight => (
                        <div 
                            key={insight.id} 
                            className={`p-4 rounded-xl border leading-relaxed shadow-sm ${
                            insight.type === 'warning' ? 'bg-red-50 text-red-900 border-red-200' :
                            insight.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' :
                            'bg-blue-50 text-blue-900 border-blue-200'
                            }`}
                        >
                            <span className="font-semibold block mb-1 text-sm">
                                {insight.type === 'warning' ? '⚠️ Alert' : insight.type === 'success' ? '🎉 Success' : 'ℹ️ Tip'}
                            </span>
                            <span className="text-sm">{insight.message}</span>
                        </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      </div>
    </main>
  );
}
