import React, { useState, useEffect } from 'react';
import {
    WhatsappLogo,
    Phone,
    ChatsCircle,
    CheckCircle,
    Warning,
    XCircle,
    Clock,
    ArrowsClockwise,
    Eye,
    Robot,
    Users,
    TrendUp,
    MagnifyingGlass
} from '@phosphor-icons/react';
import { supabase } from '../services/supabase';
import { DataTable, StatsCard, Badge, Button, Modal, Avatar } from '../components/ui';
import type { AdminWhatsAppConfig } from '../types/admin.types';

const WhatsAppManager: React.FC = () => {
    const [configs, setConfigs] = useState<AdminWhatsAppConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedConfig, setSelectedConfig] = useState<AdminWhatsAppConfig | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [page, setPage] = useState(1);
    const [totalConfigs, setTotalConfigs] = useState(0);

    const limit = 20;

    useEffect(() => {
        fetchConfigs();
    }, [page]);

    const fetchConfigs = async () => {
        try {
            setLoading(true);

            const { data, count, error } = await supabase
                .from('whatsapp_configs')
                .select(`
                    *,
                    user_profiles!whatsapp_configs_user_id_fkey(organization_email)
                `, { count: 'exact' })
                .order('created_at', { ascending: false })
                .range((page - 1) * limit, page * limit - 1);

            if (error) throw error;

            // Get message counts per config
            const configIds = data?.map(c => c.id) || [];
            const { data: messagesData } = await supabase
                .from('whatsapp_messages')
                .select('config_id')
                .in('config_id', configIds);

            const messageCounts = new Map<string, number>();
            messagesData?.forEach(m => {
                const count = messageCounts.get(m.config_id) || 0;
                messageCounts.set(m.config_id, count + 1);
            });

            // Get call counts per config
            const { data: callsData } = await supabase
                .from('whatsapp_calls')
                .select('config_id')
                .in('config_id', configIds);

            const callCounts = new Map<string, number>();
            callsData?.forEach(c => {
                const count = callCounts.get(c.config_id) || 0;
                callCounts.set(c.config_id, count + 1);
            });

            setConfigs(data?.map(c => ({
                id: c.id,
                user_id: c.user_id,
                user_email: c.user_profiles?.organization_email || 'Unknown',
                waba_id: c.waba_id,
                phone_number_id: c.phone_number_id,
                display_phone_number: c.display_phone_number,
                display_name: c.display_name,
                status: c.status,
                quality_rating: c.quality_rating,
                messaging_limit: c.messaging_limit,
                chatbot_enabled: c.chatbot_enabled,
                calling_enabled: c.calling_enabled,
                total_messages: messageCounts.get(c.id) || 0,
                total_calls: callCounts.get(c.id) || 0,
                created_at: c.created_at,
            })) || []);

            setTotalConfigs(count || 0);
        } catch (error) {
            console.error('Error fetching WhatsApp configs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: 'success' | 'warning' | 'error' | 'default'; icon: React.ReactNode }> = {
            connected: { variant: 'success', icon: <CheckCircle size={12} /> },
            pending: { variant: 'warning', icon: <Clock size={12} /> },
            disconnected: { variant: 'default', icon: <XCircle size={12} /> },
            error: { variant: 'error', icon: <Warning size={12} /> },
        };
        const { variant, icon } = variants[status] || variants.pending;
        return <Badge variant={variant} icon={icon}>{status}</Badge>;
    };

    const getQualityBadge = (rating?: string) => {
        if (!rating) return null;
        const variants: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
            GREEN: 'success',
            YELLOW: 'warning',
            RED: 'error',
            UNKNOWN: 'default',
        };
        return <Badge variant={variants[rating] || 'default'}>{rating}</Badge>;
    };

    const columns = [
        {
            key: 'display_name',
            header: 'Account',
            sortable: true,
            render: (value: string, row: AdminWhatsAppConfig) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
                        <WhatsappLogo size={20} weight="fill" className="text-emerald-400" />
                    </div>
                    <div>
                        <p className="font-medium text-textMain">{value || row.display_phone_number}</p>
                        <p className="text-xs text-textMuted">{row.user_email}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'display_phone_number',
            header: 'Phone Number',
            render: (value: string) => (
                <code className="text-sm text-textMain font-mono">{value}</code>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (value: string) => getStatusBadge(value),
        },
        {
            key: 'quality_rating',
            header: 'Quality',
            render: (value: string) => getQualityBadge(value) || <span className="text-textMuted">-</span>,
        },
        {
            key: 'total_messages',
            header: 'Messages',
            sortable: true,
            render: (value: number) => (
                <div className="flex items-center gap-2">
                    <ChatsCircle size={16} className="text-primary" />
                    <span className="text-textMain">{value.toLocaleString()}</span>
                </div>
            ),
        },
        {
            key: 'total_calls',
            header: 'Calls',
            sortable: true,
            render: (value: number) => (
                <div className="flex items-center gap-2">
                    <Phone size={16} className="text-blue-400" />
                    <span className="text-textMain">{value.toLocaleString()}</span>
                </div>
            ),
        },
        {
            key: 'chatbot_enabled',
            header: 'Bot',
            render: (value: boolean) => (
                <Badge variant={value ? 'success' : 'default'} size="sm">
                    <Robot size={12} /> {value ? 'On' : 'Off'}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: '',
            width: '60px',
            render: (_: any, row: AdminWhatsAppConfig) => (
                <button
                    onClick={() => {
                        setSelectedConfig(row);
                        setShowDetail(true);
                    }}
                    className="p-2 text-textMuted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="View Details"
                >
                    <Eye size={16} />
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center border border-white/10">
                        <WhatsappLogo size={28} weight="fill" className="text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textMain">WhatsApp Manager</h1>
                        <p className="text-textMuted text-sm mt-0.5">
                            Manage {totalConfigs} WhatsApp Business accounts
                        </p>
                    </div>
                </div>
                <Button variant="secondary" icon={<ArrowsClockwise size={18} />} onClick={fetchConfigs}>
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatsCard
                    title="Total Accounts"
                    value={totalConfigs.toLocaleString()}
                    icon={<WhatsappLogo size={20} weight="fill" />}
                    color="emerald"
                    loading={loading}
                />
                <StatsCard
                    title="Connected"
                    value={configs.filter(c => c.status === 'connected').length.toLocaleString()}
                    icon={<CheckCircle size={20} weight="bold" />}
                    color="primary"
                    loading={loading}
                />
                <StatsCard
                    title="Total Messages"
                    value={configs.reduce((sum, c) => sum + c.total_messages, 0).toLocaleString()}
                    icon={<ChatsCircle size={20} weight="bold" />}
                    color="blue"
                    loading={loading}
                />
                <StatsCard
                    title="Bot Enabled"
                    value={configs.filter(c => c.chatbot_enabled).length.toLocaleString()}
                    icon={<Robot size={20} weight="bold" />}
                    color="violet"
                    loading={loading}
                />
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={configs}
                loading={loading}
                rowKey="id"
                searchable
                searchPlaceholder="Search by name or number..."
                pagination={{
                    page,
                    limit,
                    total: totalConfigs,
                    onPageChange: setPage,
                }}
                emptyMessage="No WhatsApp accounts found"
                emptyIcon={<WhatsappLogo size={32} className="text-textMuted/50" />}
            />

            {/* Detail Modal */}
            <Modal
                isOpen={showDetail}
                onClose={() => setShowDetail(false)}
                title={selectedConfig?.display_name || 'WhatsApp Account'}
                subtitle={selectedConfig?.display_phone_number}
                icon={<WhatsappLogo size={24} weight="fill" className="text-emerald-400" />}
                glowColor="emerald"
                size="lg"
            >
                {selectedConfig && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">Status</p>
                                {getStatusBadge(selectedConfig.status)}
                            </div>
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">Quality Rating</p>
                                {getQualityBadge(selectedConfig.quality_rating) || <span className="text-textMuted">Not rated</span>}
                            </div>
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">WABA ID</p>
                                <code className="text-sm text-textMain font-mono">{selectedConfig.waba_id}</code>
                            </div>
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">Phone Number ID</p>
                                <code className="text-sm text-textMain font-mono">{selectedConfig.phone_number_id}</code>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 text-center">
                                <ChatsCircle size={24} className="text-primary mx-auto mb-2" />
                                <p className="text-2xl font-bold text-textMain">{selectedConfig.total_messages.toLocaleString()}</p>
                                <p className="text-xs text-textMuted">Messages</p>
                            </div>
                            <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center">
                                <Phone size={24} className="text-blue-400 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-textMain">{selectedConfig.total_calls.toLocaleString()}</p>
                                <p className="text-xs text-textMuted">Calls</p>
                            </div>
                            <div className="p-4 bg-violet-500/10 rounded-xl border border-violet-500/20 text-center">
                                <Robot size={24} className="text-violet-400 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-textMain">{selectedConfig.chatbot_enabled ? 'Yes' : 'No'}</p>
                                <p className="text-xs text-textMuted">Bot Enabled</p>
                            </div>
                        </div>

                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-xs text-textMuted mb-2">Owner</p>
                            <div className="flex items-center gap-3">
                                <Avatar email={selectedConfig.user_email} size="md" />
                                <div>
                                    <p className="text-sm text-textMain">{selectedConfig.user_email}</p>
                                    <p className="text-xs text-textMuted font-mono">{selectedConfig.user_id}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default WhatsAppManager;
