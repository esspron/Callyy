import React, { useState, useEffect } from 'react';
import {
    FileText,
    Warning,
    Info,
    Bug,
    CheckCircle,
    ArrowsClockwise,
    Funnel,
    CalendarBlank,
    Clock,
    HardDrives,
    WebhooksLogo,
    Phone,
    WhatsappLogo,
    CreditCard,
    Key,
    Export,
    Code
} from '@phosphor-icons/react';
import { supabase } from '../services/supabase';
import { DataTable, StatsCard, Badge, Button, Tabs } from '../components/ui';

interface LogEntry {
    id: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    service: string;
    message: string;
    metadata?: Record<string, any>;
    user_id?: string;
    created_at: string;
}

const SystemLogs: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [page, setPage] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);
    const [filterLevel, setFilterLevel] = useState<string>('all');

    const limit = 30;

    // Generate mock logs for demo (in production, these would come from a logging service)
    useEffect(() => {
        generateMockLogs();
    }, [page, filterLevel, activeTab]);

    const generateMockLogs = async () => {
        setLoading(true);

        // Simulate loading
        await new Promise(resolve => setTimeout(resolve, 500));

        const mockLogs: LogEntry[] = [
            {
                id: '1',
                level: 'info',
                service: 'api',
                message: 'Incoming request: POST /api/assistants',
                metadata: { method: 'POST', path: '/api/assistants', statusCode: 201 },
                created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
            },
            {
                id: '2',
                level: 'info',
                service: 'webhook',
                message: 'WhatsApp webhook received: text message',
                metadata: { type: 'text', from: '+919876543210' },
                created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            },
            {
                id: '3',
                level: 'warn',
                service: 'payment',
                message: 'Payment retry initiated for failed transaction',
                metadata: { transaction_id: 'pay_xyz123', attempt: 2 },
                created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
            },
            {
                id: '4',
                level: 'error',
                service: 'call',
                message: 'Call connection failed: SIP timeout',
                metadata: { call_id: 'call_abc123', error_code: 'SIP_TIMEOUT' },
                user_id: 'user_123',
                created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            },
            {
                id: '5',
                level: 'info',
                service: 'auth',
                message: 'User logged in successfully',
                metadata: { email: 'user@example.com', method: 'email' },
                user_id: 'user_456',
                created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
            },
            {
                id: '6',
                level: 'debug',
                service: 'api',
                message: 'Redis cache hit for assistant config',
                metadata: { key: 'assistant:abc123', ttl: 280 },
                created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
            },
            {
                id: '7',
                level: 'error',
                service: 'whatsapp',
                message: 'Failed to send template message: rate limited',
                metadata: { template_name: 'order_confirmation', error_code: 131056 },
                user_id: 'user_789',
                created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            },
            {
                id: '8',
                level: 'info',
                service: 'payment',
                message: 'Payment successful: credits added',
                metadata: { amount: 500, credits: 500, provider: 'razorpay' },
                user_id: 'user_101',
                created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            },
            {
                id: '9',
                level: 'warn',
                service: 'call',
                message: 'High latency detected on call server',
                metadata: { latency_ms: 450, server: 'call-server-1' },
                created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            },
            {
                id: '10',
                level: 'info',
                service: 'webhook',
                message: 'Call ended webhook processed',
                metadata: { call_id: 'call_def456', duration: 120 },
                created_at: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
            },
        ];

        // Filter by level
        let filtered = mockLogs;
        if (filterLevel !== 'all') {
            filtered = mockLogs.filter(l => l.level === filterLevel);
        }

        // Filter by service (tab)
        if (activeTab !== 'all') {
            filtered = filtered.filter(l => l.service === activeTab);
        }

        setLogs(filtered);
        setTotalLogs(filtered.length);
        setLoading(false);
    };

    const getLevelBadge = (level: string) => {
        const config: Record<string, { variant: 'success' | 'warning' | 'error' | 'info' | 'default'; icon: React.ReactNode }> = {
            info: { variant: 'info', icon: <Info size={12} /> },
            warn: { variant: 'warning', icon: <Warning size={12} /> },
            error: { variant: 'error', icon: <Warning size={12} /> },
            debug: { variant: 'default', icon: <Bug size={12} /> },
        };
        const { variant, icon } = config[level] || config.info;
        return <Badge variant={variant} icon={icon}>{level.toUpperCase()}</Badge>;
    };

    const getServiceIcon = (service: string) => {
        const icons: Record<string, React.ReactNode> = {
            api: <HardDrives size={16} className="text-primary" />,
            webhook: <WebhooksLogo size={16} className="text-violet-400" />,
            call: <Phone size={16} className="text-blue-400" />,
            whatsapp: <WhatsappLogo size={16} className="text-emerald-400" />,
            payment: <CreditCard size={16} className="text-amber-400" />,
            auth: <Key size={16} className="text-rose-400" />,
        };
        return icons[service] || <Code size={16} className="text-textMuted" />;
    };

    const columns = [
        {
            key: 'created_at',
            header: 'Time',
            width: '150px',
            render: (value: string) => (
                <div className="flex items-center gap-2">
                    <Clock size={14} className="text-textMuted" />
                    <span className="text-textMuted text-sm font-mono">
                        {new Date(value).toLocaleTimeString()}
                    </span>
                </div>
            ),
        },
        {
            key: 'level',
            header: 'Level',
            width: '100px',
            render: (value: string) => getLevelBadge(value),
        },
        {
            key: 'service',
            header: 'Service',
            width: '120px',
            render: (value: string) => (
                <div className="flex items-center gap-2">
                    {getServiceIcon(value)}
                    <span className="text-textMain capitalize">{value}</span>
                </div>
            ),
        },
        {
            key: 'message',
            header: 'Message',
            render: (value: string, row: LogEntry) => (
                <div>
                    <p className="text-textMain text-sm">{value}</p>
                    {row.metadata && (
                        <code className="text-xs text-textMuted bg-white/5 px-2 py-0.5 rounded mt-1 inline-block">
                            {JSON.stringify(row.metadata)}
                        </code>
                    )}
                </div>
            ),
        },
    ];

    const tabs = [
        { id: 'all', label: 'All Logs', icon: <FileText size={18} /> },
        { id: 'api', label: 'API', icon: <HardDrives size={18} /> },
        { id: 'webhook', label: 'Webhooks', icon: <WebhooksLogo size={18} /> },
        { id: 'call', label: 'Calls', icon: <Phone size={18} /> },
        { id: 'whatsapp', label: 'WhatsApp', icon: <WhatsappLogo size={18} /> },
        { id: 'payment', label: 'Payments', icon: <CreditCard size={18} /> },
    ];

    const errorCount = logs.filter(l => l.level === 'error').length;
    const warnCount = logs.filter(l => l.level === 'warn').length;

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center border border-white/10">
                        <FileText size={28} weight="duotone" className="text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textMain">System Logs</h1>
                        <p className="text-textMuted text-sm mt-0.5">
                            Monitor API calls, webhooks, and system events
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" icon={<Export size={18} />}>
                        Export
                    </Button>
                    <Button variant="secondary" icon={<ArrowsClockwise size={18} />} onClick={generateMockLogs}>
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatsCard
                    title="Total Logs"
                    value={totalLogs.toLocaleString()}
                    icon={<FileText size={20} weight="bold" />}
                    color="blue"
                    loading={loading}
                />
                <StatsCard
                    title="Errors"
                    value={errorCount.toString()}
                    icon={<Warning size={20} weight="bold" />}
                    color="rose"
                    loading={loading}
                />
                <StatsCard
                    title="Warnings"
                    value={warnCount.toString()}
                    icon={<Warning size={20} weight="bold" />}
                    color="amber"
                    loading={loading}
                />
                <StatsCard
                    title="Health"
                    value={errorCount === 0 ? 'Good' : 'Issues'}
                    icon={<CheckCircle size={20} weight="bold" />}
                    color={errorCount === 0 ? 'emerald' : 'rose'}
                    loading={loading}
                />
            </div>

            {/* Tabs */}
            <Tabs tabs={tabs} activeTab={activeTab} onChange={(tab) => { setActiveTab(tab); setPage(1); }} />

            {/* Filters */}
            <div className="flex items-center gap-3">
                {['all', 'info', 'warn', 'error', 'debug'].map((level) => (
                    <button
                        key={level}
                        onClick={() => {
                            setFilterLevel(level);
                            setPage(1);
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            filterLevel === level
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'text-textMuted hover:text-textMain hover:bg-white/5 border border-transparent'
                        }`}
                    >
                        {level === 'all' ? 'All' : level.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Logs Table */}
            <DataTable
                columns={columns}
                data={logs}
                loading={loading}
                rowKey="id"
                pagination={{
                    page,
                    limit,
                    total: totalLogs,
                    onPageChange: setPage,
                }}
                emptyMessage="No logs found"
                emptyIcon={<FileText size={32} className="text-textMuted/50" />}
            />

            {/* Info Box */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
                <Info size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm text-textMain font-medium">Demo Mode</p>
                    <p className="text-xs text-textMuted mt-1">
                        Logs shown are mock data for demonstration. In production, connect to your logging service
                        (e.g., Supabase Edge Function logs, Railway logs, or a dedicated logging service like Logflare/Logtail).
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SystemLogs;
