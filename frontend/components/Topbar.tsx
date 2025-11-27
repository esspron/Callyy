
import React, { useState, useEffect } from 'react';
import { Search, Bell, HelpCircle, Globe, Loader2 } from 'lucide-react';
import { getUserProfile } from '../services/voicoryService';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';

const Topbar: React.FC = () => {
    const [language, setLanguage] = useState('English (IN)');
    const [creditsBalance, setCreditsBalance] = useState<number | null>(null);
    const [planType, setPlanType] = useState<string>('PAYG');
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { formatAmount } = useCurrency();

    // Fetch user profile for credits balance
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const profile = await getUserProfile();
                if (profile) {
                    setCreditsBalance(profile.creditsBalance);
                    setPlanType(profile.planType);
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);

    // Refresh balance periodically (every 30 seconds)
    useEffect(() => {
        if (!user) return;
        
        const interval = setInterval(async () => {
            try {
                const profile = await getUserProfile();
                if (profile) {
                    setCreditsBalance(profile.creditsBalance);
                }
            } catch (error) {
                console.error('Error refreshing balance:', error);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [user]);

    return (
        <header className="h-16 bg-background border-b border-border sticky top-0 z-40 flex items-center justify-between px-6">
            {/* Search Bar */}
            <div className="flex items-center bg-surface border border-border rounded-lg px-3 py-1.5 w-96 focus-within:border-primary transition-colors">
                <Search size={16} className="text-textMuted" />
                <input 
                    type="text" 
                    placeholder="Search assistants, logs, or docs..." 
                    className="bg-transparent border-none outline-none text-sm text-textMain ml-2 w-full placeholder:text-gray-600"
                />
                <span className="text-xs text-gray-600 border border-gray-700 rounded px-1.5 py-0.5">⌘K</span>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                {/* Language Selector (India Context) */}
                <div className="relative group">
                    <button className="flex items-center gap-2 text-sm text-textMuted hover:text-textMain transition-colors">
                        <Globe size={16} />
                        <span>{language}</span>
                    </button>
                    {/* Dropdown Mock */}
                    <div className="absolute right-0 mt-2 w-40 bg-surface border border-border rounded-md shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity p-1">
                        {['English (IN)', 'Hindi', 'Bengali', 'Tamil'].map(lang => (
                            <button 
                                key={lang}
                                onClick={() => setLanguage(lang)}
                                className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-surfaceHover ${language === lang ? 'text-primary' : 'text-textMain'}`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                </div>

                <button className="text-textMuted hover:text-textMain transition-colors">
                    <HelpCircle size={20} />
                </button>
                
                <div className="relative">
                    <button className="text-textMuted hover:text-textMain transition-colors">
                        <Bell size={20} />
                    </button>
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background"></span>
                </div>

                <div className="h-6 w-px bg-border mx-2"></div>

                <div className="flex items-center gap-2">
                   <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                       {planType}
                   </span>
                   {loading ? (
                       <span className="text-xs text-textMuted flex items-center gap-1">
                           <Loader2 size={12} className="animate-spin" />
                           Loading...
                       </span>
                   ) : (
                       <span className="text-xs text-textMuted">
                           {formatAmount(creditsBalance ?? 0)} Credits
                       </span>
                   )}
                </div>
            </div>
        </header>
    );
};

export default Topbar;
