import React, { useState, useEffect } from 'react';
import {
    Gear,
    Bell,
    Shield,
    Key,
    Database,
    Palette,
    Globe,
    Envelope,
    Lightning,
    CheckCircle,
    ToggleLeft,
    ToggleRight,
    Info,
    ArrowsClockwise,
    Warning
} from '@phosphor-icons/react';
import { supabase } from '../services/supabase';
import { Button, Input, Switch } from '../components/ui';

interface SettingSection {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}

interface FeatureFlag {
    id: string;
    key: string;
    name: string;
    description: string;
    enabled: boolean;
    category: 'beta' | 'core' | 'experimental';
}

interface AdminSetting {
    id: string;
    key: string;
    value: any;
    description: string;
    category: string;
}

const SettingsPage: React.FC = () => {
    const [activeSection, setActiveSection] = useState('general');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // General Settings
    const [siteName, setSiteName] = useState('Voicory Admin');
    const [supportEmail, setSupportEmail] = useState('support@voicory.com');
    const [maintenanceMode, setMaintenanceMode] = useState(false);

    // Notification Settings
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [slackNotifications, setSlackNotifications] = useState(false);
    const [slackWebhookUrl, setSlackWebhookUrl] = useState('');

    // Feature Flags
    const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);

    // Load settings on mount
    useEffect(() => {
        fetchSettings();
        fetchFeatureFlags();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('admin_settings')
                .select('*');

            if (error) throw error;

            data?.forEach((setting: AdminSetting) => {
                const value = typeof setting.value === 'string' 
                    ? JSON.parse(setting.value) 
                    : setting.value;
                
                switch (setting.key) {
                    case 'site_name':
                        setSiteName(value);
                        break;
                    case 'support_email':
                        setSupportEmail(value);
                        break;
                    case 'maintenance_mode':
                        setMaintenanceMode(value);
                        break;
                    case 'email_notifications':
                        setEmailNotifications(value);
                        break;
                    case 'slack_notifications':
                        setSlackNotifications(value);
                        break;
                    case 'slack_webhook_url':
                        setSlackWebhookUrl(value);
                        break;
                }
            });
        } catch (err) {
            console.error('Error fetching settings:', err);
            setError('Failed to load settings');
        }
    };

    const fetchFeatureFlags = async () => {
        try {
            const { data, error } = await supabase
                .from('feature_flags')
                .select('*')
                .order('category', { ascending: true });

            if (error) throw error;

            setFeatureFlags(data?.map(f => ({
                id: f.id,
                key: f.key,
                name: f.name,
                description: f.description || '',
                enabled: f.enabled,
                category: f.category as 'beta' | 'core' | 'experimental',
            })) || []);
        } catch (err) {
            console.error('Error fetching feature flags:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key: string, value: any) => {
        try {
            const { error } = await supabase
                .from('admin_settings')
                .update({ value: JSON.stringify(value), updated_at: new Date().toISOString() })
                .eq('key', key);

            if (error) throw error;
        } catch (err) {
            console.error('Error updating setting:', err);
            setError('Failed to save setting');
        }
    };

    const sections: SettingSection[] = [
        {
            id: 'general',
            title: 'General',
            description: 'Basic system settings',
            icon: <Gear size={20} weight="bold" />,
            color: 'primary',
        },
        {
            id: 'notifications',
            title: 'Notifications',
            description: 'Alerts and notification channels',
            icon: <Bell size={20} weight="bold" />,
            color: 'amber',
        },
        {
            id: 'features',
            title: 'Feature Flags',
            description: 'Enable/disable platform features',
            icon: <Lightning size={20} weight="bold" />,
            color: 'violet',
        },
        {
            id: 'security',
            title: 'Security',
            description: 'Access and authentication',
            icon: <Shield size={20} weight="bold" />,
            color: 'rose',
        },
    ];

    const toggleFeatureFlag = async (id: string) => {
        const flag = featureFlags.find(f => f.id === id);
        if (!flag) return;

        try {
            const { error } = await supabase
                .from('feature_flags')
                .update({ enabled: !flag.enabled, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            setFeatureFlags(flags =>
                flags.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f)
            );
        } catch (err) {
            console.error('Error toggling feature flag:', err);
            setError('Failed to toggle feature flag');
        }
    };

    const getCategoryBadge = (category: string) => {
        const colors: Record<string, string> = {
            core: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            beta: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            experimental: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
        };
        return (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[category]}`}>
                {category}
            </span>
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        
        try {
            // Save all settings
            await Promise.all([
                updateSetting('site_name', siteName),
                updateSetting('support_email', supportEmail),
                updateSetting('maintenance_mode', maintenanceMode),
                updateSetting('email_notifications', emailNotifications),
                updateSetting('slack_notifications', slackNotifications),
                updateSetting('slack_webhook_url', slackWebhookUrl),
            ]);
            
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Error saving settings:', err);
            setError('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    // Clear error after delay
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-white/10">
                        <Gear size={28} weight="duotone" className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textMain">Admin Settings</h1>
                        <p className="text-textMuted text-sm mt-0.5">
                            Configure platform settings and feature flags
                        </p>
                    </div>
                </div>
                <Button
                    variant="primary"
                    onClick={handleSave}
                    loading={isSaving}
                    icon={saved ? <CheckCircle size={18} /> : undefined}
                >
                    {saved ? 'Saved!' : 'Save Changes'}
                </Button>
            </div>

            {/* Error Notification */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <Warning size={18} />
                    {error}
                </div>
            )}

            <div className="flex gap-6">
                {/* Sidebar */}
                <div className="w-64 shrink-0">
                    <nav className="space-y-1">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                                    activeSection === section.id
                                        ? 'bg-primary/15 text-primary border border-primary/20'
                                        : 'text-textMuted hover:text-textMain hover:bg-white/5'
                                }`}
                            >
                                <span className={activeSection === section.id ? 'text-primary' : 'text-textMuted'}>
                                    {section.icon}
                                </span>
                                <div>
                                    <p className="font-medium text-sm">{section.title}</p>
                                    <p className="text-xs text-textMuted">{section.description}</p>
                                </div>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 bg-surface/50 border border-white/10 rounded-2xl p-6">
                    {activeSection === 'general' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold text-textMain mb-1">General Settings</h2>
                                <p className="text-sm text-textMuted">Basic configuration for the admin panel</p>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    label="Site Name"
                                    value={siteName}
                                    onChange={(e) => setSiteName(e.target.value)}
                                    placeholder="Voicory Admin"
                                />
                                <Input
                                    label="Support Email"
                                    type="email"
                                    value={supportEmail}
                                    onChange={(e) => setSupportEmail(e.target.value)}
                                    placeholder="support@example.com"
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                                        <Shield size={20} className="text-rose-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-textMain">Maintenance Mode</p>
                                        <p className="text-xs text-textMuted">Users will see a maintenance page</p>
                                    </div>
                                </div>
                                <Switch checked={maintenanceMode} onChange={setMaintenanceMode} />
                            </div>
                        </div>
                    )}

                    {activeSection === 'notifications' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold text-textMain mb-1">Notification Settings</h2>
                                <p className="text-sm text-textMuted">Configure how you receive system alerts</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <Envelope size={20} className="text-blue-400" />
                                        <div>
                                            <p className="font-medium text-textMain">Email Notifications</p>
                                            <p className="text-xs text-textMuted">Receive alerts via email</p>
                                        </div>
                                    </div>
                                    <Switch checked={emailNotifications} onChange={setEmailNotifications} />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <Bell size={20} className="text-violet-400" />
                                        <div>
                                            <p className="font-medium text-textMain">Slack Notifications</p>
                                            <p className="text-xs text-textMuted">Send alerts to Slack channel</p>
                                        </div>
                                    </div>
                                    <Switch checked={slackNotifications} onChange={setSlackNotifications} />
                                </div>

                                {slackNotifications && (
                                    <Input
                                        label="Slack Webhook URL"
                                        value={slackWebhookUrl}
                                        onChange={(e) => setSlackWebhookUrl(e.target.value)}
                                        placeholder="https://hooks.slack.com/services/..."
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {activeSection === 'features' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-textMain mb-1">Feature Flags</h2>
                                    <p className="text-sm text-textMuted">Enable or disable platform features globally</p>
                                </div>
                                <button
                                    onClick={fetchFeatureFlags}
                                    className="p-2 text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors"
                                    title="Refresh"
                                >
                                    <ArrowsClockwise size={18} className={loading ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            {loading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="animate-pulse p-4 bg-surface rounded-xl border border-white/10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white/10 rounded" />
                                                <div className="flex-1">
                                                    <div className="h-4 bg-white/10 rounded w-32 mb-2" />
                                                    <div className="h-3 bg-white/10 rounded w-48" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {featureFlags.map((flag) => (
                                        <div
                                            key={flag.id}
                                            className="flex items-center justify-between p-4 bg-surface rounded-xl border border-white/10 hover:border-white/20 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => toggleFeatureFlag(flag.id)}
                                                    className="text-2xl transition-colors"
                                                >
                                                    {flag.enabled ? (
                                                        <ToggleRight size={32} weight="fill" className="text-primary" />
                                                    ) : (
                                                        <ToggleLeft size={32} weight="fill" className="text-textMuted/50" />
                                                    )}
                                                </button>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className={`font-medium ${flag.enabled ? 'text-textMain' : 'text-textMuted'}`}>
                                                            {flag.name}
                                                        </p>
                                                        {getCategoryBadge(flag.category)}
                                                    </div>
                                                    <p className="text-xs text-textMuted mt-0.5">{flag.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
                                <Info size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-textMain font-medium">Feature Flag Categories</p>
                                    <p className="text-xs text-textMuted mt-1">
                                        <strong>Core</strong>: Stable features. <strong>Beta</strong>: Opt-in testing features.{' '}
                                        <strong>Experimental</strong>: May be unstable or change.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'security' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold text-textMain mb-1">Security Settings</h2>
                                <p className="text-sm text-textMuted">Access control and authentication options</p>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-surface rounded-xl border border-white/10">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Key size={20} className="text-amber-400" />
                                        <div>
                                            <p className="font-medium text-textMain">Admin Passkey</p>
                                            <p className="text-xs text-textMuted">Change the admin panel access passkey</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Input
                                            type="password"
                                            value="••••••••••"
                                            onChange={() => {}}
                                            placeholder="Current passkey"
                                            className="flex-1"
                                        />
                                        <Button variant="secondary">Change</Button>
                                    </div>
                                </div>

                                <div className="p-4 bg-surface rounded-xl border border-white/10">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Database size={20} className="text-emerald-400" />
                                        <div>
                                            <p className="font-medium text-textMain">Supabase Connection</p>
                                            <p className="text-xs text-textMuted">Database connection status</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-sm text-emerald-400">Connected</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                                    <Shield size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-textMain font-medium">Security Recommendation</p>
                                        <p className="text-xs text-textMuted mt-1">
                                            Consider implementing IP whitelisting and 2FA for admin panel access in production.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
