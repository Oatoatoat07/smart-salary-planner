import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase/client';
import { X, Cloud } from 'lucide-react';

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthOverlay({ isOpen, onClose }: AuthOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Cloud className="text-blue-500" size={24} /> Cloud Sync
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-slate-500 mb-6 font-medium">
            Sign in to securely sync your salary plan across all your devices.
          </p>
          
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#2563eb',
                    brandAccent: '#1d4ed8',
                  },
                },
              },
              className: {
                button: 'font-semibold rounded-xl',
                input: 'rounded-xl bg-slate-50 border-slate-200',
              }
            }}
            providers={['google']}
            redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/`}
          />
        </div>
      </div>
    </div>
  );
}
