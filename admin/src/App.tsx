import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PasskeyGate from './components/PasskeyGate';
import AdminDashboard from './pages/AdminDashboard';
import CouponManager from './pages/CouponManager';
import UserManager from './pages/UserManager';

// Admin passkey - Change this to your secure passkey
const ADMIN_PASSKEY = 'voicory2024admin';

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if already authenticated in this session
        const authStatus = sessionStorage.getItem('admin_authenticated');
        if (authStatus === 'true') {
            setIsAuthenticated(true);
        }
        setIsLoading(false);
    }, []);

    const handleAuthenticate = (passkey: string): boolean => {
        if (passkey === ADMIN_PASSKEY) {
            setIsAuthenticated(true);
            sessionStorage.setItem('admin_authenticated', 'true');
            return true;
        }
        return false;
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_authenticated');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <PasskeyGate onAuthenticate={handleAuthenticate} />;
    }

    return (
        <Router>
            <Routes>
                <Route path="/" element={<AdminDashboard onLogout={handleLogout} />}>
                    <Route index element={<Navigate to="/coupons" replace />} />
                    <Route path="coupons" element={<CouponManager />} />
                    <Route path="users" element={<UserManager />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
};

export default App;
