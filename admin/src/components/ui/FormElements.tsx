import React from 'react';
import { Check, X, Warning, Info } from '@phosphor-icons/react';

// ============ Badge ============
interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary';
    size?: 'sm' | 'md';
    icon?: React.ReactNode;
}

const badgeVariants = {
    default: 'bg-white/10 text-textMuted border-white/10',
    success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    error: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    primary: 'bg-primary/20 text-primary border-primary/30',
};

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    size = 'md',
    icon,
}) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badgeVariants[variant]} ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : ''}`}>
        {icon}
        {children}
    </span>
);

// ============ Button ============
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    disabled,
    className = '',
    ...props
}) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
        primary: 'bg-gradient-to-r from-primary to-primary/80 text-black hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5',
        secondary: 'bg-surface border border-white/10 text-textMain hover:bg-surfaceHover',
        ghost: 'text-textMuted hover:text-textMain hover:bg-white/5',
        danger: 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30',
    };
    
    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : icon}
            {children}
        </button>
    );
};

// ============ Input ============
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    icon,
    className = '',
    ...props
}) => (
    <div className="space-y-2">
        {label && (
            <label className="block text-sm font-medium text-textMain">{label}</label>
        )}
        <div className="relative">
            {icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted">
                    {icon}
                </div>
            )}
            <input
                className={`w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-textMain placeholder:text-textMuted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-sm transition-colors ${icon ? 'pl-10' : ''} ${error ? 'border-rose-500/50' : ''} ${className}`}
                {...props}
            />
        </div>
        {error && (
            <p className="text-xs text-rose-400">{error}</p>
        )}
    </div>
);

// ============ Select ============
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { value: string; label: string }[];
    error?: string;
}

export const Select: React.FC<SelectProps> = ({
    label,
    options,
    error,
    className = '',
    ...props
}) => (
    <div className="space-y-2">
        {label && (
            <label className="block text-sm font-medium text-textMain">{label}</label>
        )}
        <select
            className={`w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-textMain focus:outline-none focus:border-primary/50 text-sm ${error ? 'border-rose-500/50' : ''} ${className}`}
            {...props}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
        {error && (
            <p className="text-xs text-rose-400">{error}</p>
        )}
    </div>
);

// ============ Toggle ============
interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
    checked,
    onChange,
    label,
    disabled = false,
}) => (
    <label className={`flex items-center gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
        <div
            className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-white/10'}`}
            onClick={() => !disabled && onChange(!checked)}
        >
            <div
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`}
            />
        </div>
        {label && <span className="text-sm text-textMain">{label}</span>}
    </label>
);

// ============ Alert ============
interface AlertProps {
    variant?: 'info' | 'success' | 'warning' | 'error';
    title?: string;
    children: React.ReactNode;
    onClose?: () => void;
}

const alertVariants = {
    info: { bg: 'bg-blue-500/10 border-blue-500/20', icon: <Info size={20} className="text-blue-400" /> },
    success: { bg: 'bg-emerald-500/10 border-emerald-500/20', icon: <Check size={20} className="text-emerald-400" /> },
    warning: { bg: 'bg-amber-500/10 border-amber-500/20', icon: <Warning size={20} className="text-amber-400" /> },
    error: { bg: 'bg-rose-500/10 border-rose-500/20', icon: <X size={20} className="text-rose-400" /> },
};

export const Alert: React.FC<AlertProps> = ({
    variant = 'info',
    title,
    children,
    onClose,
}) => (
    <div className={`p-4 rounded-xl border ${alertVariants[variant].bg} flex items-start gap-3`}>
        {alertVariants[variant].icon}
        <div className="flex-1">
            {title && <p className="font-medium text-textMain mb-1">{title}</p>}
            <div className="text-sm text-textMuted">{children}</div>
        </div>
        {onClose && (
            <button onClick={onClose} className="text-textMuted hover:text-textMain">
                <X size={18} />
            </button>
        )}
    </div>
);

// ============ Tabs ============
interface TabsProps {
    tabs: { id: string; label: string; icon?: React.ReactNode; count?: number }[];
    activeTab: string;
    onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => (
    <div className="flex gap-1 border-b border-white/5 px-1">
        {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all duration-200 ${
                        isActive
                            ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-textMain border border-primary/20 border-b-0 shadow-lg shadow-primary/5'
                            : 'text-textMuted hover:text-textMain hover:bg-white/[0.03] border border-transparent'
                    }`}
                >
                    {isActive && (
                        <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-1 bg-primary rounded-full animate-pulse" />
                    )}
                    {tab.icon}
                    {tab.label}
                    {tab.count !== undefined && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${isActive ? 'bg-primary/20 text-primary' : 'bg-white/10 text-textMuted'}`}>
                            {tab.count}
                        </span>
                    )}
                </button>
            );
        })}
    </div>
);

// ============ Empty State ============
interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
}) => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        {icon && (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-4">
                {icon}
            </div>
        )}
        <h3 className="text-lg font-semibold text-textMain mb-2">{title}</h3>
        {description && (
            <p className="text-textMuted text-sm max-w-sm mb-4">{description}</p>
        )}
        {action}
    </div>
);

// ============ Skeleton ============
interface SkeletonProps {
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded ${className}`} />
);

// ============ Switch ============
interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
    checked,
    onChange,
    disabled = false,
}) => (
    <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            checked ? 'bg-primary' : 'bg-white/20'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                checked ? 'translate-x-5' : 'translate-x-0'
            }`}
        />
    </button>
);

// ============ Avatar ============
interface AvatarProps {
    name?: string;
    email?: string;
    src?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({
    name,
    email,
    src,
    size = 'md',
}) => {
    const sizes = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
    };
    
    const initials = name
        ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : email
            ? email.slice(0, 2).toUpperCase()
            : '?';

    return src ? (
        <img src={src} alt={name || email} className={`${sizes[size]} rounded-full object-cover`} />
    ) : (
        <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center font-semibold text-primary`}>
            {initials}
        </div>
    );
};
