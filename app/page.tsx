'use client';

import { useState, useMemo, useEffect } from 'react';
import { calculateNetSalary, calculateMonthlyTax, calculateSSO } from '@/lib/utils/thaiTax';
import { parseExpenseDump, ExpenseCategory } from '@/lib/utils/categorizer';
import { generateSmartInsights } from '@/lib/utils/budgetEngine';
import { Wallet, PieChart, Sparkles, TrendingUp, Settings2, CalendarPlus, X, Plus, Lightbulb, CheckSquare, Dices, Edit2, Check, List } from 'lucide-react';
import { BudgetBar } from './components/BudgetBar';

interface FixedBill {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
}

export default function Dashboard() {
  const [grossSalaryStr, setGrossSalaryStr] = useState<string>('');
  const [sideIncomeStr, setSideIncomeStr] = useState<string>('');
  const [expenseDump, setExpenseDump] = useState<string>('');
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, ExpenseCategory>>({});

  // Fixed Recurring Bills
  const [fixedBills, setFixedBills] = useState<FixedBill[]>([]);
  const [newBillName, setNewBillName] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');
  const [newBillCategory, setNewBillCategory] = useState<ExpenseCategory>('needs');

  // Editing State for Fixed Bills
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [editBillName, setEditBillName] = useState('');
  const [editBillAmount, setEditBillAmount] = useState('');
  const [editBillCategory, setEditBillCategory] = useState<ExpenseCategory>('needs');

  // Custom Budget Percentages
  const [needsPct, setNeedsPct] = useState<number>(50);
  const [wantsPct, setWantsPct] = useState<number>(30);
  const [investPct, setInvestPct] = useState<number>(20);

  const [checklistSeed, setChecklistSeed] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load all state from local storage on mount
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

  // Save to local storage whenever core state changes
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('salaryPlannerFixedBills', JSON.stringify(fixedBills));
    const data = { grossSalaryStr, sideIncomeStr, expenseDump, needsPct, wantsPct, investPct, categoryOverrides };
    localStorage.setItem('salaryPlannerState', JSON.stringify(data));
  }, [fixedBills, grossSalaryStr, sideIncomeStr, expenseDump, needsPct, wantsPct, investPct, categoryOverrides, isLoaded]);

  // 1. Calculate the Income Side (Thai Tax & SSO)
  const grossSalary = parseFloat(grossSalaryStr.replace(/,/g, '')) || 0;
  const sideIncome = parseFloat(sideIncomeStr.replace(/,/g, '')) || 0;
  const netSalary = calculateNetSalary(grossSalary, sideIncome);
  const tax = calculateMonthlyTax(grossSalary, sideIncome);
  const sso = calculateSSO(grossSalary);

  // 2. Parse Expenses (The Lazy Dump Box)
  const parsedExpenses = useMemo(() => {
    const baseParsed = parseExpenseDump(expenseDump);
    return baseParsed.map(exp => ({
      ...exp,
      category: categoryOverrides[exp.name] || exp.category
    }));
  }, [expenseDump, categoryOverrides]);

  // 3. Dynamic Budget Targets
  const budgetTargets = {
    needs: netSalary * (needsPct / 100),
    wants: netSalary * (wantsPct / 100),
    investments: netSalary * (investPct / 100)
  };

  // 4. Calculate Actual Spending per Category (Dump Box + Fixed Bills)
  const actualSpending = useMemo(() => {
    const totals = { needs: 0, wants: 0, investments: 0, unknown: 0 };
    
    // Sum from variable dump box
    parsedExpenses.forEach(exp => {
      totals[exp.category] += exp.amount;
    });

    // Sum from fixed bills
    fixedBills.forEach(bill => {
      totals[bill.category] += bill.amount;
    });

    return totals;
  }, [parsedExpenses, fixedBills]);

  // Total Expenses
  const totalExpenses = parsedExpenses.reduce((sum, e) => sum + e.amount, 0) + fixedBills.reduce((sum, b) => sum + b.amount, 0);
  const remainingCash = netSalary - totalExpenses;

  // Formatting helpers
  const fmt = (num: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);

  // Unified, Sorted Expenses for the Right Panel
  const unifiedExpenses = useMemo(() => {
    const list = [
      ...fixedBills.map(b => ({ ...b, type: 'fixed' as const })),
      ...parsedExpenses.map(e => ({ ...e, id: `dump-${e.name}`, type: 'variable' as const }))
    ];
    
    // Sort High to Low
    list.sort((a, b) => b.amount - a.amount);
    
    return {
      needs: list.filter(e => e.category === 'needs'),
      wants: list.filter(e => e.category === 'wants'),
      investments: list.filter(e => e.category === 'investments'),
      unknown: list.filter(e => e.category === 'unknown')
    };
  }, [fixedBills, parsedExpenses]);

  // Handle slider changes ensuring total is always 100%
  const handleNeedsChange = (val: number) => {
    setNeedsPct(val);
    const remaining = 100 - val;
    // Keep ratio between wants and invest the same, or default to split
    const currentWantsRatio = wantsPct / (wantsPct + investPct || 1);
    setWantsPct(Math.round(remaining * currentWantsRatio));
    setInvestPct(Math.round(remaining * (1 - currentWantsRatio)));
  };

  const handleAddBill = () => {
    if (!newBillName || !newBillAmount) return;
    const amount = parseFloat(newBillAmount.replace(/,/g, ''));
    if (isNaN(amount)) return;

    setFixedBills(prev => [
      ...prev,
      { id: Date.now().toString(), name: newBillName, amount, category: newBillCategory }
    ]);
    setNewBillName('');
    setNewBillAmount('');
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

  const isTotal100 = needsPct + wantsPct + investPct === 100;

  // 5. Generate Smart Insights using the budget engine
  const insights = useMemo(() => {
    return generateSmartInsights(netSalary, budgetTargets, actualSpending);
  }, [netSalary, budgetTargets, actualSpending]);

  const checklistPresets = useMemo(() => {
    const defaultPresets = [
      { name: 'Netflix / Spotify', amt: 400, cat: 'wants' as ExpenseCategory, keywords: ['netflix', 'spotify', 'youtube', 'disney', 'prime'] },
      { name: 'Phone Bill', amt: 500, cat: 'needs' as ExpenseCategory, keywords: ['phone', 'โทรศัพท์', 'มือถือ', 'รายเดือน', 'ais', 'true', 'dtac'] },
      { name: 'Parent Allowance', amt: 5000, cat: 'needs' as ExpenseCategory, keywords: ['parent', 'แม่', 'พ่อ'] },
      { name: 'Pet Care', amt: 1500, cat: 'needs' as ExpenseCategory, keywords: ['pet', 'หมา', 'แมว', 'สัตว์', 'อาหารเม็ด', 'ทรายแมว'] },
      { name: 'Gym / Fitness', amt: 1500, cat: 'wants' as ExpenseCategory, keywords: ['gym', 'fitness', 'ฟิตเนส', 'ยิม'] },
      { name: 'Car Insurance', amt: 2000, cat: 'needs' as ExpenseCategory, keywords: ['insurance', 'ประกัน', 'รถ'] },
      { name: 'Vitamins / Supplements', amt: 1000, cat: 'needs' as ExpenseCategory, keywords: ['vitamin', 'วิตามิน', 'อาหารเสริม'] },
      { name: 'Coffee Beans', amt: 600, cat: 'wants' as ExpenseCategory, keywords: ['coffee bean', 'เมล็ดกาแฟ'] },
      { name: 'Game Sub', amt: 300, cat: 'wants' as ExpenseCategory, keywords: ['game', 'psn', 'xbox', 'nintendo', 'steam'] },
      { name: 'House Supplies', amt: 1000, cat: 'needs' as ExpenseCategory, keywords: ['house', 'ของใช้ในบ้าน', 'ทิชชู่', 'น้ำยา', 'ซักผ้า'] },
      { name: 'Credit Card Fee', amt: 2000, cat: 'needs' as ExpenseCategory, keywords: ['credit card', 'fee', 'บัตรเครดิต', 'ค่าธรรมเนียม'] },
      { name: 'Skincare', amt: 1500, cat: 'wants' as ExpenseCategory, keywords: ['skin', 'cosmetic', 'สกินแคร์', 'เครื่องสำอาง'] },
      { name: 'Haircut', amt: 500, cat: 'needs' as ExpenseCategory, keywords: ['hair', 'ตัดผม'] },
      { name: 'Monthly Merit', amt: 500, cat: 'wants' as ExpenseCategory, keywords: ['merit', 'ทำบุญ', 'บริจาค'] },
      { name: 'Software Subs', amt: 500, cat: 'needs' as ExpenseCategory, keywords: ['software', 'adobe', 'icloud', 'google one', 'dropbox'] },
      { name: 'Condo Fee', amt: 1500, cat: 'needs' as ExpenseCategory, keywords: ['condo', 'ค่าส่วนกลาง'] },
      { name: 'Tollway', amt: 1000, cat: 'needs' as ExpenseCategory, keywords: ['toll', 'easy pass', 'ทางด่วน'] },
      { name: 'Drinking Water', amt: 300, cat: 'needs' as ExpenseCategory, keywords: ['water', 'น้ำดื่ม', 'น้ำเปล่า'] },
      { name: 'Snacks / 7-11', amt: 1000, cat: 'wants' as ExpenseCategory, keywords: ['snack', '7-11', 'ขนม', 'เซเว่น'] },
      { name: 'Gifts / Bday', amt: 1000, cat: 'wants' as ExpenseCategory, keywords: ['gift', 'ของขวัญ', 'วันเกิด'] }
    ];

    // Get all current input names to lowercase
    const currentEntryNames = [
      ...fixedBills.map(b => b.name.toLowerCase()),
      ...parsedExpenses.map(e => e.name.toLowerCase())
    ];

    const remainingPresets = defaultPresets.filter(preset => {
      // Keep if NO current entry includes ANY of this preset's keywords
      return !currentEntryNames.some(entry => 
        preset.keywords.some(kw => entry.includes(kw))
      );
    });

    if (remainingPresets.length === 0) return [];
    
    const count = Math.min(6, remainingPresets.length);
    const subset = [];
    const startIdx = (checklistSeed * count) % remainingPresets.length;
    
    for (let i = 0; i < count; i++) {
        subset.push(remainingPresets[(startIdx + i) % remainingPresets.length]);
    }
    
    return subset;
  }, [fixedBills, parsedExpenses, checklistSeed]);

  const addPresetToDump = (name: string, amt: number) => {
    const entry = `\n${name} ${amt}`;
    setExpenseDump(prev => prev + entry);
  };

  const handleSaveLocally = undefined; // Auto-saves via useEffect

  return (
    <main className="min-h-screen py-10 px-4 max-w-5xl mx-auto space-y-8 relative">
      <header className="text-center space-y-2 mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          Smart Salary Planner
        </h1>
        <p className="text-slate-500 font-medium">The lazy way to manage Thai taxes and split your budget.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-8">

        {/* Left Column: Inputs */}
        <section className="space-y-6">

          {/* Income Box */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center space-x-3 text-blue-600 mb-2">
              <Wallet size={24} />
              <h2 className="text-xl font-bold text-slate-800">1. Income (รายได้)</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Monthly Gross Salary (เงินเดือน)</label>
                <input
                  type="text"
                  placeholder="e.g. 50000"
                  value={grossSalaryStr}
                  onChange={(e) => setGrossSalaryStr(e.target.value)}
                  className="premium-input text-2xl font-semibold bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Side Income - Freelance/Online (รายได้เสริม)</label>
                <input
                  type="text"
                  placeholder="e.g. 15000"
                  value={sideIncomeStr}
                  onChange={(e) => setSideIncomeStr(e.target.value)}
                  className="premium-input text-xl font-semibold bg-white text-slate-800"
                />
              </div>
            </div>

            {/* Auto Deductions Info */}
            {(grossSalary > 0 || sideIncome > 0) && (
              <div className="pt-4 border-t border-slate-200 space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Standard Withholding Tax:</span>
                  <span className="text-red-500 font-medium">-{fmt(tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Social Security (SSO 5%):</span>
                  <span className="text-red-500 font-medium">-{fmt(sso)}</span>
                </div>
              </div>
            )}

            {/* Prominent Net Take-Home Card */}
            {netSalary > 0 && (
              <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">✅ True Take-Home Pay</p>
                  <p className="text-xs text-emerald-600 mt-0.5">After SSO &amp; estimated tax</p>
                </div>
                <span className="text-2xl font-extrabold text-emerald-700">{fmt(netSalary)}</span>
              </div>
            )}
          </div>

          {/* Fixed Monthly Bills */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center space-x-3 text-amber-600 mb-2">
              <CalendarPlus size={24} />
              <h2 className="text-xl font-bold text-slate-800">2. Fixed Monthly Bills (บิลจำเจ)</h2>
            </div>
            <p className="text-sm font-medium text-slate-500">Rent, Subscriptions, Car Payments - add them once and they stick.</p>

            {/* Add New Bill Form — responsive grid, stacks on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2">
              <input
                type="text"
                placeholder="Name (e.g. Netflix)"
                value={newBillName}
                onChange={e => setNewBillName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddBill()}
                className="premium-input py-2 px-3 text-sm"
              />
              <input
                type="text"
                placeholder="Amount"
                value={newBillAmount}
                onChange={e => setNewBillAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddBill()}
                className="premium-input py-2 px-3 text-sm"
              />
              <select
                value={newBillCategory}
                onChange={e => setNewBillCategory(e.target.value as ExpenseCategory)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="needs">Needs</option>
                <option value="wants">Wants</option>
                <option value="investments">Invest</option>
              </select>
              <button 
                onClick={handleAddBill}
                className="bg-slate-800 text-white rounded-lg p-2 hover:bg-slate-700 transition flex items-center justify-center"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* List of Bills removed from here — unified onto right panel */}
          </div>

          {/* Context Dump Box */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center space-x-3 text-purple-600 mb-2">
              <Sparkles size={24} />
              <h2 className="text-xl font-bold text-slate-800">3. Variable Dump Box (ใช้จิปาถะ)</h2>
            </div>
            <p className="text-sm font-medium text-slate-500">Just type everything here. We will auto-categorize it.</p>
            <textarea
              rows={6}
              placeholder={'ค่าบ้าน 8000\nค่ากิน 6000\nดูหนัง 1000\nซื้อกองทุน 5000'}
              value={expenseDump}
              onChange={(e) => setExpenseDump(e.target.value)}
              className="premium-input resize-none"
            />
          </div>

          {/* Don't Forget Checklist */}
          {checklistPresets.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2 text-indigo-600">
                  <CheckSquare size={20} />
                  <h3 className="font-bold text-slate-800">Don't Forget! 📝</h3>
                </div>
                <button 
                  onClick={() => setChecklistSeed(s => s + 1)}
                  className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 rounded font-medium transition-colors"
                >
                  <Dices size={14} /> Show More
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                Commonly forgotten expenses. Tap any to instantly copy it to your Dump Box.
              </p>
              <div className="flex flex-wrap gap-2">
                {checklistPresets.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => addPresetToDump(item.name, item.amt)}
                    className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-full transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} /> {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Dashboard & Visualization */}
        <section className="space-y-6">
          <div className="glass-panel p-6 space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-3 text-emerald-600">
                <PieChart size={24} />
                <h2 className="text-xl font-bold text-slate-800">Custom Plan</h2>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-slate-500 block">Remaining Cash</span>
                <span className={`text-2xl font-extrabold ${remainingCash >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {fmt(remainingCash)}
                </span>
              </div>
            </div>

            {/* Customizer */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold text-sm">
                <Settings2 size={16} /> Budget Ratios
                {!isTotal100 && <span className="text-red-500 text-xs ml-auto">Must total 100% (Current: {needsPct + wantsPct + investPct}%)</span>}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-600 w-12 cursor-help" title="Needs">จำเป็น</span>
                  <input type="range" min="0" max="100" value={needsPct} onChange={(e) => handleNeedsChange(parseInt(e.target.value))} className="w-full accent-blue-500" />
                  <span className="text-xs font-bold w-10 text-right text-slate-700">{needsPct}%</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-600 w-12 cursor-help" title="Wants">ความสุข</span>
                  <input type="range" min="0" max="100" value={wantsPct} onChange={(e) => setWantsPct(parseInt(e.target.value))} className="w-full accent-purple-500" />
                  <span className="text-xs font-bold w-10 text-right text-slate-700">{wantsPct}%</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-600 w-12 cursor-help" title="Invest">อนาคต</span>
                  <input type="range" min="0" max="100" value={investPct} onChange={(e) => setInvestPct(parseInt(e.target.value))} className="w-full accent-emerald-500" />
                  <span className="text-xs font-bold w-10 text-right text-slate-700">{investPct}%</span>
                </div>
              </div>
            </div>

            {/* Budget Categories */}
            <div className="flex-1 space-y-6">
              <BudgetBar
                label={`Needs (จำเป็น) - ${needsPct}%`}
                target={budgetTargets.needs}
                actual={actualSpending.needs}
                color="bg-blue-500"
              />
              <BudgetBar
                label={`Wants (ซื้อความสุข) - ${wantsPct}%`}
                target={budgetTargets.wants}
                actual={actualSpending.wants}
                color="bg-purple-500"
              />
              <BudgetBar
                label={`Invest/Save (อนาคต) - ${investPct}%`}
                target={budgetTargets.investments}
                actual={actualSpending.investments}
                color="bg-emerald-500"
              />
            </div>

            {/* Unified Categorized Expense List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2 text-sm font-bold text-slate-800">
                <List size={18} className="text-slate-500" />
                All Expenses (Sorted High to Low)
              </div>
              
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {/* Helper for rendering a unified section */}
                {[
                  { title: "Needs (จำเป็น)", data: unifiedExpenses.needs, color: "text-blue-600", bg: "bg-blue-50" },
                  { title: "Wants (ซื้อความสุข)", data: unifiedExpenses.wants, color: "text-purple-600", bg: "bg-purple-50" },
                  { title: "Investments (อนาคต)", data: unifiedExpenses.investments, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { title: "Uncategorized (อื่นๆ)", data: unifiedExpenses.unknown, color: "text-slate-600", bg: "bg-slate-100" },
                ].map((section, idx) => section.data.length > 0 && (
                  <div key={idx} className="pb-2">
                    <div className={`text-xs font-bold uppercase tracking-wider py-2 px-4 ${section.bg} ${section.color} sticky top-0 z-10 backdrop-blur-md opacity-90`}>
                      {section.title}
                    </div>
                    <div>
                      {section.data.map(exp => (
                        <div key={exp.id} className="group relative flex items-center justify-between px-4 py-2 hover:bg-slate-50 transition-colors">
                          {exp.type === 'fixed' && editingBillId === exp.id ? (
                            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 w-full items-center p-1">
                              <input type="text" value={editBillName} onChange={e => setEditBillName(e.target.value)} className="bg-white border border-slate-200 rounded px-2 py-1 text-xs" />
                              <input type="text" value={editBillAmount} onChange={e => setEditBillAmount(e.target.value)} className="bg-white border border-slate-200 rounded px-2 py-1 text-xs w-20" />
                              <select value={editBillCategory} onChange={e => setEditBillCategory(e.target.value as ExpenseCategory)} className="bg-white border border-slate-200 rounded px-2 py-1 text-xs">
                                <option value="needs">Needs</option><option value="wants">Wants</option><option value="investments">Invest</option>
                              </select>
                              <button onClick={saveEditedBill} className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 border border-emerald-100 p-1 rounded"><Check size={14}/></button>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-800">{exp.name}</span>
                                {exp.type === 'variable' && (
                                  <div className="flex gap-2 items-center mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] text-slate-400 uppercase">Change to:</span>
                                    <select 
                                      value={exp.category}
                                      onChange={(e) => setCategoryOverrides(prev => ({...prev, [exp.name]: e.target.value as ExpenseCategory}))}
                                      className="text-[10px] bg-transparent font-medium text-slate-500 hover:text-blue-600 cursor-pointer outline-none p-0 border-0"
                                    >
                                      <option value="needs">Needs</option>
                                      <option value="wants">Wants</option>
                                      <option value="investments">Invest</option>
                                      <option value="unknown">Uncategorized</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-800 text-sm">{fmt(exp.amount)}</span>
                                {exp.type === 'fixed' && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2 border-l border-slate-200">
                                    <button onClick={() => startEditingBill(exp as FixedBill)} className="text-slate-300 hover:text-blue-500 p-1"><Edit2 size={14} /></button>
                                    <button onClick={() => removeBill(exp.id)} className="text-slate-300 hover:text-red-500 p-1"><X size={14} /></button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {unifiedExpenses.needs.length === 0 && unifiedExpenses.wants.length === 0 && unifiedExpenses.investments.length === 0 && unifiedExpenses.unknown.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-400 italic">No expenses added yet.</div>
                )}
              </div>
            </div>

            {/* Smart Insights Panel */}
            <div className="mt-2 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm p-4 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Lightbulb size={64} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Lightbulb size={18} className="text-amber-500" />
                Smart Insights & Recommendations
              </h3>
              
              <div className="space-y-3 relative z-10">
                {insights.map(insight => (
                  <div 
                    key={insight.id} 
                    className={`text-xs p-3 rounded-lg border leading-relaxed ${
                      insight.type === 'warning' ? 'bg-red-50 text-red-800 border-red-100' :
                      insight.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                      'bg-blue-50 text-blue-800 border-blue-100'
                    }`}
                  >
                    {insight.message}
                  </div>
                ))}
              </div>
            </div>

            {/* Auto-save indicator */}
            {isLoaded && (
              <p className="text-xs text-center text-slate-400 mt-4 flex items-center justify-center gap-1">
                <CheckSquare size={12} className="text-emerald-400" /> Auto-saved to your browser
              </p>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
