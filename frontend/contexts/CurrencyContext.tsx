import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

import { getUserProfile, updateUserProfile } from '../services/voicoryService';

import { useAuth } from './AuthContext';

// Exchange rate: 1 USD = 83 INR (approximate)
const USD_TO_INR_RATE = 83;

interface CurrencyContextType {
    country: string;
    currency: string;
    currencySymbol: string;
    isLoading: boolean;
    // Format amount in user's currency
    formatAmount: (amountInINR: number) => string;
    // Get raw converted amount
    convertFromINR: (amountInINR: number) => number;
    // Update user's currency preference
    updateCurrency: (country: string) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
    children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
    const { user } = useAuth();
    const [country, setCountry] = useState<string>('IN');
    const [currency, setCurrency] = useState<string>('INR');
    const [currencySymbol, setCurrencySymbol] = useState<string>('₹');
    const [isLoading, setIsLoading] = useState(true);

    // Load user's currency preference
    useEffect(() => {
        const loadCurrencyPreference = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }

            try {
                const profile = await getUserProfile();
                if (profile) {
                    setCountry(profile.country || 'IN');
                    setCurrency(profile.currency || 'INR');
                    setCurrencySymbol(profile.currencySymbol || '₹');
                }
            } catch (error) {
                console.error('Error loading currency preference:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadCurrencyPreference();
    }, [user]);

    // Convert amount from INR to user's currency
    const convertFromINR = useCallback((amountInINR: number): number => {
        if (currency === 'INR') {
            return amountInINR;
        }
        // Convert to USD
        return amountInINR / USD_TO_INR_RATE;
    }, [currency]);

    // Format amount with currency symbol
    const formatAmount = useCallback((amountInINR: number): string => {
        const convertedAmount = convertFromINR(amountInINR);
        
        if (currency === 'INR') {
            // Indian format: ₹1,23,456.78
            return `₹${convertedAmount.toLocaleString('en-IN', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            })}`;
        }
        
        // USD format: $1,234.56
        return `$${convertedAmount.toLocaleString('en-US', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        })}`;
    }, [currency, convertFromINR]);

    // Update user's currency preference
    const updateCurrency = useCallback(async (newCountry: string): Promise<void> => {
        const isIndia = newCountry === 'IN' || newCountry.toLowerCase() === 'india';
        
        const newCurrency = isIndia ? 'INR' : 'USD';
        const newSymbol = isIndia ? '₹' : '$';
        const countryCode = isIndia ? 'IN' : newCountry;

        // Update local state immediately
        setCountry(countryCode);
        setCurrency(newCurrency);
        setCurrencySymbol(newSymbol);

        // Persist to database
        try {
            await updateUserProfile({
                country: countryCode,
                currency: newCurrency,
                currencySymbol: newSymbol
            } as any);
        } catch (error) {
            console.error('Error updating currency preference:', error);
            // Revert on error
            setCountry(country);
            setCurrency(currency);
            setCurrencySymbol(currencySymbol);
        }
    }, [country, currency, currencySymbol]);

    const value: CurrencyContextType = {
        country,
        currency,
        currencySymbol,
        isLoading,
        formatAmount,
        convertFromINR,
        updateCurrency
    };

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = (): CurrencyContextType => {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};

export default CurrencyContext;
