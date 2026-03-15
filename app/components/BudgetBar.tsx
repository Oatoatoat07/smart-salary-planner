export function BudgetBar({ label, target, actual, color }: { label: string, target: number, actual: number, color: string }) {
  const isOver = actual > target;
  
  // Calculate relative percentages to the container width based on what is largest (actual or target)
  const maxValue = Math.max(target, actual, 1);
  const targetLinePct = (target / maxValue) * 100;
  const safeActualAmount = Math.min(actual, target);
  const overActualAmount = Math.max(0, actual - target);
  const safeFillPct = (safeActualAmount / maxValue) * 100;
  const overFillPct = (overActualAmount / maxValue) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-500">
          <span className={isOver ? 'text-red-500 font-bold' : 'text-slate-800 font-bold'}>
            {new Intl.NumberFormat('th-TH').format(actual)}
          </span>
          {' / '}{new Intl.NumberFormat('th-TH').format(target)}
        </span>
      </div>
      
      <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/60 relative flex">
        <div 
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${safeFillPct}%` }}
        />
        {isOver && (
          <div 
            className="h-full bg-red-500 transition-all duration-500 opacity-90"
            style={{ width: `${overFillPct}%` }}
          />
        )}
        {target > 0 && (
          <div 
            className="absolute top-0 bottom-0 bg-slate-800 w-[2px] z-10 opacity-60"
            style={{ left: `${targetLinePct}%` }}
          />
        )}
      </div>
    </div>
  );
}
