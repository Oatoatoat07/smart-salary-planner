'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PenSquare, PieChart, LogOut, User as UserIcon, Cloud } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AuthOverlay } from './AuthOverlay';

export default function NavBar() {
  const pathname = usePathname();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setIsAuthOpen(false); // Close modal on successful login
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo Left */}
        <Link href="/" className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity">
          SP
        </Link>

        <div className="flex space-x-1 sm:space-x-2 bg-slate-100 p-1 rounded-xl absolute left-1/2 -translate-x-1/2">
          <Link
            href="/"
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-bold transition-all ${
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
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-bold transition-all ${
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

        {/* Auth Right */}
        <div className="flex items-center">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Cloud size={12} className="text-emerald-500" /> Synced
                </span>
                <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{user.email}</span>
              </div>
              <button 
                onClick={handleSignOut}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-full transition-colors"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthOpen(true)}
              className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 px-3 sm:px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              <UserIcon size={16} /> <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </div>
      
      <AuthOverlay isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </nav>
  );
}
