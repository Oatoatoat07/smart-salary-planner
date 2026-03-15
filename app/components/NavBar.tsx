import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PenSquare, PieChart } from 'lucide-react';

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 tracking-tight flex items-center gap-2">
          <span>SP</span>
        </div>
        
        <div className="flex space-x-1 sm:space-x-2 bg-slate-100 p-1 rounded-xl">
          <Link
            href="/"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              pathname === '/' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <PenSquare size={16} /> 
            <span className="hidden sm:inline">Plan & Edit</span>
            <span className="sm:hidden">Edit</span>
          </Link>
          
          <Link
            href="/report"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              pathname === '/report' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <PieChart size={16} /> 
            <span className="hidden sm:inline">Summary Report</span>
            <span className="sm:hidden">Report</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
