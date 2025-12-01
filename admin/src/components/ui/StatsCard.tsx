import React from 'react';
import { TrendUp, TrendDown, Minus } from '@phosphor-icons/react';

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: {
        value: number;
        label: string;
    };
    color?: 'primary' | 'emerald' | 'amber' | 'violet' | 'rose' | 'blue';
    loading?: boolean;
}

const colorMap = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    violet: 'bg-violet-500/10 text-violet-400',
    rose: 'bg-rose-500/10 text-rose-400',
    blue: 'bg-blue-500/10 text-blue-400',
};

const glowMap = {
    primary: 'bg-primary/10',
    emerald: 'bg-emerald-500/10',
    amber: 'bg-amber-500/10',
    violet: 'bg-violet-500/10',
    rose: 'bg-rose-500/10',
    blue: 'bg-blue-500/10',
};

const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    trend,
    color = 'primary',
    loading = false,
}) => {
    const getTrendIcon = () => {
        if (!trend) return null;
        if (trend.value > 0) return <TrendUp size={14} weight="bold" className="text-emerald-400" />;
        if (trend.value < 0) return <TrendDown size={14} weight="bold" className="text-rose-400" />;
        return <Minus size={14} className="text-textMuted" />;
    };

    const getTrendColor = () => {
        if (!trend) return '';
        if (trend.value > 0) return 'text-emerald-400';
        if (trend.value < 0) return 'text-rose-400';
        return 'text-textMuted';
    };

    if (loading) {
        return (
            <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-xl p-4 relative overflow-hidden animate-pulse">
                <div className="h-3 w-20 bg-white/10 rounded mb-3" />
                <div className="h-8 w-32 bg-white/10 rounded mb-2" />
                <div className="h-3 w-24 bg-white/10 rounded" />
            </div>
        );
    }

    return (
        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-xl p-4 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            {/* Ambient glow */}
            <div className={`absolute -top-6 -right-6 w-20 h-20 ${glowMap[color]} blur-2xl opacity-50 group-hover:opacity-70 transition-opacity`} />
            
            <div className="relative flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-textMuted text-xs font-medium mb-1">{title}</p>
                    <p className="text-2xl font-bold text-textMain">{value}</p>
                    
                    <div className="flex items-center gap-2 mt-1">
                        {trend && (
                            <div className={`flex items-center gap-1 text-xs font-medium ${getTrendColor()}`}>
                                {getTrendIcon()}
                                <span>{Math.abs(trend.value)}%</span>
                                <span className="text-textMuted">{trend.label}</span>
                            </div>
                        )}
                        {subtitle && !trend && (
                            <span className="text-xs text-textMuted">{subtitle}</span>
                        )}
                    </div>
                </div>
                
                {icon && (
                    <div className={`w-10 h-10 rounded-xl ${colorMap[color]} flex items-center justify-center flex-shrink-0`}>
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatsCard;
