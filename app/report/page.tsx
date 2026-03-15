'use client';

import { useState, useMemo, useEffect } from 'react';
import { calculateNetSalary, calculateMonthlyTax, calculateSSO } from '@/lib/utils/thaiTax';
import { parseExpenseDump, ExpenseCategory } from '@/lib/utils/categorizer';
import { generateSmartInsights } from '@/lib/utils/budgetEngine';
import { PieChart, Lightbulb, Wallet, CheckCircle2, AlertTriangle, TrendingDown, List, X, Edit2, Check } from 'lucide-react';
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
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, ExpenseCategory>>({});
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Editing State for Fixed Bills
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [editBillName, setEditBillName] = useState('');
  const [editBillAmount, setEditBillAmount] = useState('');
  const [editBillCategory, setEditBillCategory] = useState<ExpenseCategory>('needs');

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
            if (data.categoryOverrides) setCategoryOverrides(data.categoryOverrides);
        } catch (e) {}
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage whenever core state changes (to sync edits back to planner)
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('salaryPlannerFixedBills', JSON.stringify(fixedBills));
    const data = { grossSalaryStr, sideIncomeStr, expenseDump, needsPct, wantsPct, investPct, categoryOverrides };
    localStorage.setItem('salaryPlannerState', JSON.stringify(data));
  }, [fixedBills, grossSalaryStr, sideIncomeStr, expenseDump, needsPct, wantsPct, investPct, categoryOverrides, isLoaded]);

  // Compute all metrics exactly as in page.tsx
  const grossSalary = parseFloat(grossSalaryStr.replace(/,/g, '')) || 0;
  const sideIncome = parseFloat(sideIncomeStr.replace(/,/g, '')) || 0;
  const netSalary = calculateNetSalary(grossSalary, sideIncome);

  const parsedExpenses = useMemo(() => {
    const baseParsed = parseExpenseDump(expenseDump);
    return baseParsed.map(exp => ({
      ...exp,
      category: categoryOverrides[exp.name] || exp.category
    }));
  }, [expenseDump, categoryOverrides]);

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

  // Modal actions
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBillId(null);
  };

  const removeBill = (id: string) => {
    setFixedBills(prev => prev.filter(b => b.id !== id));
    if (editingBillId === id) setEditingBillId(null);
  };

  const startEditingBill = (bill: FixedBill) => {
    setEditingBillId(bill.id);
    setEditBillName(bill.name);
    setEditBillAmount(bill.amount.toString());
    setEditBillCategory(bill.category);
  };

  const saveEditedBill = () => {
    if (!editBillName || !editBillAmount) return;
    const amount = parseFloat(editBillAmount.replace(/,/g, ''));
    if (isNaN(amount)) return;

    setFixedBills(prev => 
      prev.map(b => b.id === editingBillId ? { ...b, name: editBillName, amount, category: editBillCategory } : b)
    );
    setEditingBillId(null);
  };

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (grossSalary === 0 && sideIncome === 0) {
    return (
      <main className="min-h-[70vh] py-20 px-4 max-w-2xl mx-auto text-center space-y-6 flex flex-col items-center justify-center">
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 w-full">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Nothing to report yet!</h2>
          <p className="text-slate-500 mb-3 leading-relaxed">
            Go to the <strong>Plan &amp; Edit</strong> page to enter your salary and expenses. Your Summary Report will automatically appear here as you type — no saving required!
          </p>
          <ol className="text-sm text-slate-500 text-left space-y-1 mb-8 bg-slate-50 rounded-xl p-5 border border-slate-200">
            <li><span className="font-bold text-slate-700">1.</span> Enter your monthly salary</li>
            <li><span className="font-bold text-slate-700">2.</span> Add your fixed bills (rent, subscriptions, etc.)</li>
            <li><span className="font-bold text-slate-700">3.</span> Paste your variable expenses in the Dump Box</li>
            <li><span className="font-bold text-slate-700">4.</span> Come back here to see your financial health!</li>
          </ol>
          <Link href="/" className="btn-primary inline-flex items-center gap-2">
            ✏️ Start Planning
          </Link>
        </div>
      </main>
    )
  }


  return (
    <main className="min-h-screen py-10 px-4 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div className="text-center md:text-left space-y-2">
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 pb-1">
            Executive Summary
          </h1>
          <p className="text-slate-500 font-medium tracking-wide">Your monthly financial health at a glance.</p>
        </div>
        <button 
          onClick={openModal} 
          className="flex items-center gap-2 text-sm bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded-xl px-4 py-2.5 text-slate-700 font-semibold transition-all hover:border-slate-300"
        >
             <List size={18} /> View All Expenses
        </button>
      </div>

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

      {/* Expenses Popup Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-[env(safe-area-inset-bottom)]">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-slate-50 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 bg-white border-b border-slate-200 shrink-0">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><List size={20} className="text-blue-500" /> All Expenses</h2>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            {/* Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-8">
              {/* Fixed Bills Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-700 text-lg">Fixed Monthly Bills</h3>
                  <span className="text-sm font-semibold text-slate-500">{fmt(totalFixedAmount)}</span>
                </div>
                {fixedBills.length === 0 ? (
                  <p className="text-sm text-slate-400 italic bg-white p-4 rounded-xl border border-dashed border-slate-300">No fixed bills added.</p>
                ) : (
                  <div className="space-y-2">
                    {fixedBills.map(bill => (
                      <div key={bill.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-sm py-3 px-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-200 transition-colors gap-3">
                        {editingBillId === bill.id ? (
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 w-full items-center">
                            <input type="text" value={editBillName} onChange={e => setEditBillName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEditedBill()} className="premium-input py-1.5 px-3 text-sm" placeholder="Name" />
                            <input type="text" value={editBillAmount} onChange={e => setEditBillAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEditedBill()} className="premium-input py-1.5 px-3 text-sm w-full sm:w-24" placeholder="Amount" />
                            <select value={editBillCategory} onChange={e => setEditBillCategory(e.target.value as ExpenseCategory)} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 outline-none">
                              <option value="needs">Needs</option>
                              <option value="wants">Wants</option>
                              <option value="investments">Invest</option>
                            </select>
                            <button onClick={saveEditedBill} className="text-emerald-600 hover:text-emerald-700 p-1.5 sm:p-2 flex items-center justify-center bg-emerald-50 rounded-lg border border-emerald-100 cursor-pointer">
                              <Check size={18} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800 text-base">{bill.name}</span>
                              <span className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">{bill.category}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-extrabold text-slate-800 text-base">{fmt(bill.amount)}</span>
                              <div className="flex items-center gap-1 border-l border-slate-200 pl-4">
                                <button onClick={() => startEditingBill(bill)} className="text-slate-400 hover:text-blue-500 p-1.5 rounded-md hover:bg-blue-50 transition"><Edit2 size={16} /></button>
                                <button onClick={() => removeBill(bill.id)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition"><X size={16} /></button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Variable Expenses Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-700 text-lg">Variable (Dump Box)</h3>
                  <span className="text-sm font-semibold text-slate-500">{fmt(totalVariableAmount)}</span>
                </div>
                {parsedExpenses.length === 0 ? (
                  <p className="text-sm text-slate-400 italic bg-white p-4 rounded-xl border border-dashed border-slate-300">No variable expenses added.</p>
                ) : (
                  <>
                    <p className="text-xs text-blue-800 bg-blue-100/50 p-3 rounded-xl mb-4 flex gap-2 items-start border border-blue-200">
                      <span className="text-blue-600 text-base">ℹ️</span> 
                      <span>To edit the name or amount of these items, edit your text in the Dump Box on the main Planner page. You can adjust the categories below.</span>
                    </p>
                    <div className="space-y-2">
                       {parsedExpenses.map((exp, i) => (
                         <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between text-sm py-3 px-4 bg-white border border-slate-200 rounded-xl shadow-sm gap-3">
                           <div className="flex flex-col">
                              <span className="font-bold text-slate-800 text-base">{exp.name}</span>
                              <span className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">{exp.category}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-extrabold text-slate-800 text-base shrink-0">{fmt(exp.amount)}</span>
                              <div className="border-l border-slate-200 pl-4 w-full sm:w-auto">
                                <select 
                                  value={exp.category}
                                  onChange={(e) => setCategoryOverrides(prev => ({...prev, [exp.name]: e.target.value as ExpenseCategory}))}
                                  className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[100px]"
                                >
                                  <option value="needs">Needs</option>
                                  <option value="wants">Wants</option>
                                  <option value="investments">Invest</option>
                                  <option value="unknown">Unknown</option>
                                </select>
                              </div>
                            </div>
                         </div>
                       ))}
                    </div>
                  </>
                )}
              </section>
            </div>
            
            {/* Footer */}
            <div className="p-4 bg-white border-t border-slate-200 text-right shrink-0">
              <button justify-end onClick={closeModal} className="btn-primary py-2 px-8 shadow-md">Done</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
