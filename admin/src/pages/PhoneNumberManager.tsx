import React, { useState, useEffect } from 'react';
import {
    Phone,
    PhoneCall,
    CheckCircle,
    Warning,
    XCircle,
    Clock,
    ArrowsClockwise,
    Eye,
    Robot,
    User,
    Globe,
    MapPin,
    CalendarBlank,
    Copy
} from '@phosphor-icons/react';
import { supabase } from '../services/supabase';
import { DataTable, StatsCard, Badge, Button, Modal, Avatar } from '../components/ui';

interface AdminPhoneNumber {
    id: string;
    user_id: string;
    user_email: string;
    phone_number: string;
    name: string;
    provider: string;
    country: string;
    status: string;
    assigned_assistant_id?: string;
    assistant_name?: string;
    total_calls: number;
    total_minutes: number;
    created_at: string;
}

const PhoneNumberManager: React.FC = () => {
    const [phoneNumbers, setPhoneNumbers] = useState<AdminPhoneNumber[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNumber, setSelectedNumber] = useState<AdminPhoneNumber | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [page, setPage] = useState(1);
    const [totalNumbers, setTotalNumbers] = useState(0);
    const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

    const limit = 20;

    useEffect(() => {
        fetchPhoneNumbers();
    }, [page]);

    const fetchPhoneNumbers = async () => {
        try {
            setLoading(true);

            const { data, count, error } = await supabase
                .from('phone_numbers')
                .select(`
                    *,
                    user_profiles!phone_numbers_user_id_fkey(organization_email),
                    assistants!phone_numbers_assigned_assistant_id_fkey(name)
                `, { count: 'exact' })
                .order('created_at', { ascending: false })
                .range((page - 1) * limit, page * limit - 1);

            if (error) throw error;

            // Get call stats per phone number
            const phoneNumberIds = data?.map(p => p.id) || [];
            const { data: callsData } = await supabase
                .from('call_logs')
                .select('phone_number_id, duration')
                .in('phone_number_id', phoneNumberIds);

            const callStats = new Map<string, { calls: number; minutes: number }>();
            callsData?.forEach(c => {
                const stats = callStats.get(c.phone_number_id) || { calls: 0, minutes: 0 };
                stats.calls += 1;
                stats.minutes += Math.ceil((c.duration || 0) / 60);
                callStats.set(c.phone_number_id, stats);
            });

            setPhoneNumbers(data?.map(p => ({
                id: p.id,
                user_id: p.user_id,
                user_email: p.user_profiles?.organization_email || 'Unknown',
                phone_number: p.phone_number,
                name: p.name || 'Unnamed',
                provider: p.provider || 'vapi',
                country: p.country || 'IN',
                status: p.status || 'active',
                assigned_assistant_id: p.assigned_assistant_id,
                assistant_name: p.assistants?.name,
                total_calls: callStats.get(p.id)?.calls || 0,
                total_minutes: callStats.get(p.id)?.minutes || 0,
                created_at: p.created_at,
            })) || []);

            setTotalNumbers(count || 0);
        } catch (error) {
            console.error('Error fetching phone numbers:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyNumber = async (number: string) => {
        await navigator.clipboard.writeText(number);
        setCopiedNumber(number);
        setTimeout(() => setCopiedNumber(null), 2000);
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: 'success' | 'warning' | 'error' | 'default'; icon: React.ReactNode }> = {
            active: { variant: 'success', icon: <CheckCircle size={12} /> },
            pending: { variant: 'warning', icon: <Clock size={12} /> },
            suspended: { variant: 'error', icon: <XCircle size={12} /> },
            inactive: { variant: 'default', icon: <XCircle size={12} /> },
        };
        const { variant, icon } = variants[status] || variants.pending;
        return <Badge variant={variant} icon={icon}>{status}</Badge>;
    };

    const getCountryFlag = (country: string) => {
        const flags: Record<string, string> = {
            IN: '🇮🇳',
            US: '🇺🇸',
            UK: '🇬🇧',
            CA: '🇨🇦',
            AU: '🇦🇺',
            SG: '🇸🇬',
            AE: '🇦🇪',
        };
        return flags[country] || '🌐';
    };

    const columns = [
        {
            key: 'phone_number',
            header: 'Phone Number',
            sortable: true,
            render: (value: string, row: AdminPhoneNumber) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center text-lg">
                        {getCountryFlag(row.country)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <code className="font-mono text-sm text-textMain">{value}</code>
                            <button
                                onClick={() => copyNumber(value)}
                                className="p-1 text-textMuted hover:text-primary transition-colors"
                            >
                                {copiedNumber === value ? (
                                    <CheckCircle size={14} className="text-emerald-400" />
                                ) : (
                                    <Copy size={14} />
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-textMuted">{row.name}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'user_email',
            header: 'Owner',
            render: (value: string) => (
                <div className="flex items-center gap-2">
                    <Avatar email={value} size="sm" />
                    <span className="text-textMain text-sm">{value}</span>
                </div>
            ),
        },
        {
            key: 'assistant_name',
            header: 'Assistant',
            render: (value: string | undefined) => (
                value ? (
                    <div className="flex items-center gap-2">
                        <Robot size={16} className="text-primary" />
                        <span className="text-textMain text-sm">{value}</span>
                    </div>
                ) : (
                    <span className="text-textMuted text-sm">Not assigned</span>
                )
            ),
        },
        {
            key: 'provider',
            header: 'Provider',
            render: (value: string) => (
                <Badge variant="default" size="sm">{value}</Badge>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (value: string) => getStatusBadge(value),
        },
        {
            key: 'total_calls',
            header: 'Calls',
            sortable: true,
            render: (value: number) => (
                <div className="flex items-center gap-2">
                    <PhoneCall size={14} className="text-primary" />
                    <span className="text-textMain">{value.toLocaleString()}</span>
                </div>
            ),
        },
        {
            key: 'total_minutes',
            header: 'Minutes',
            sortable: true,
            render: (value: number) => (
                <span className="text-textMain">{value.toLocaleString()}</span>
            ),
        },
        {
            key: 'actions',
            header: '',
            width: '60px',
            render: (_: any, row: AdminPhoneNumber) => (
                <button
                    onClick={() => {
                        setSelectedNumber(row);
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

    const activeNumbers = phoneNumbers.filter(p => p.status === 'active').length;
    const totalCalls = phoneNumbers.reduce((sum, p) => sum + p.total_calls, 0);
    const totalMinutes = phoneNumbers.reduce((sum, p) => sum + p.total_minutes, 0);

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center border border-white/10">
                        <Phone size={28} weight="duotone" className="text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textMain">Phone Numbers</h1>
                        <p className="text-textMuted text-sm mt-0.5">
                            Manage {totalNumbers} phone numbers across users
                        </p>
                    </div>
                </div>
                <Button variant="secondary" icon={<ArrowsClockwise size={18} />} onClick={fetchPhoneNumbers}>
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatsCard
                    title="Total Numbers"
                    value={totalNumbers.toLocaleString()}
                    icon={<Phone size={20} weight="bold" />}
                    color="blue"
                    loading={loading}
                />
                <StatsCard
                    title="Active"
                    value={activeNumbers.toLocaleString()}
                    icon={<CheckCircle size={20} weight="bold" />}
                    color="emerald"
                    loading={loading}
                />
                <StatsCard
                    title="Total Calls"
                    value={totalCalls.toLocaleString()}
                    icon={<PhoneCall size={20} weight="bold" />}
                    color="primary"
                    loading={loading}
                />
                <StatsCard
                    title="Total Minutes"
                    value={totalMinutes.toLocaleString()}
                    icon={<Clock size={20} weight="bold" />}
                    color="violet"
                    loading={loading}
                />
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={phoneNumbers}
                loading={loading}
                rowKey="id"
                searchable
                searchPlaceholder="Search by number or owner..."
                pagination={{
                    page,
                    limit,
                    total: totalNumbers,
                    onPageChange: setPage,
                }}
                emptyMessage="No phone numbers found"
                emptyIcon={<Phone size={32} className="text-textMuted/50" />}
            />

            {/* Detail Modal */}
            <Modal
                isOpen={showDetail}
                onClose={() => setShowDetail(false)}
                title={selectedNumber?.name || 'Phone Number'}
                subtitle={selectedNumber?.phone_number}
                icon={<Phone size={24} weight="fill" className="text-blue-400" />}
                glowColor="blue"
                size="lg"
            >
                {selectedNumber && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">Status</p>
                                {getStatusBadge(selectedNumber.status)}
                            </div>
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">Provider</p>
                                <Badge variant="default">{selectedNumber.provider}</Badge>
                            </div>
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">Country</p>
                                <span className="text-2xl">{getCountryFlag(selectedNumber.country)}</span>
                                <span className="ml-2 text-textMain">{selectedNumber.country}</span>
                            </div>
                            <div className="p-4 bg-surface rounded-xl border border-white/10">
                                <p className="text-xs text-textMuted mb-1">Created</p>
                                <span className="text-textMain text-sm">
                                    {new Date(selectedNumber.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 text-center">
                                <PhoneCall size={24} className="text-primary mx-auto mb-2" />
                                <p className="text-2xl font-bold text-textMain">{selectedNumber.total_calls.toLocaleString()}</p>
                                <p className="text-xs text-textMuted">Total Calls</p>
                            </div>
                            <div className="p-4 bg-violet-500/10 rounded-xl border border-violet-500/20 text-center">
                                <Clock size={24} className="text-violet-400 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-textMain">{selectedNumber.total_minutes.toLocaleString()}</p>
                                <p className="text-xs text-textMuted">Minutes</p>
                            </div>
                            <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center">
                                <Robot size={24} className="text-blue-400 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-textMain truncate">
                                    {selectedNumber.assistant_name || 'None'}
                                </p>
                                <p className="text-xs text-textMuted">Assistant</p>
                            </div>
                        </div>

                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-xs text-textMuted mb-2">Owner</p>
                            <div className="flex items-center gap-3">
                                <Avatar email={selectedNumber.user_email} size="md" />
                                <div>
                                    <p className="text-sm text-textMain">{selectedNumber.user_email}</p>
                                    <p className="text-xs text-textMuted font-mono">{selectedNumber.user_id}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default PhoneNumberManager;
