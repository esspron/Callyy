import { Plus, Phone, Globe, Trash, Gear, Sparkle, CircleNotch, PhoneCall, ArrowsClockwise } from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';

import PhoneNumberModal from '../components/PhoneNumberModal';
import PhoneNumberConfigModal from '../components/PhoneNumberConfigModal';
import { FadeIn } from '../components/ui/FadeIn';
import { getPhoneNumbers, deletePhoneNumber } from '../services/voicoryService';
import type { PhoneNumber } from '../types';

const PhoneNumbers: React.FC = () => {
    const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [configuringPhoneNumber, setConfiguringPhoneNumber] = useState<PhoneNumber | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await getPhoneNumbers();
            setPhoneNumbers(data);
        } catch (error) {
            console.error('Error loading phone numbers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this phone number?')) return;

        try {
            setDeletingId(id);
            const success = await deletePhoneNumber(id);
            if (success) {
                setPhoneNumbers(prev => prev.filter(num => num.id !== id));
            } else {
                alert('Failed to delete phone number');
            }
        } catch (error) {
            console.error('Error deleting phone number:', error);
            alert('Error deleting phone number');
        } finally {
            setDeletingId(null);
        }
    };

    const handleModalSuccess = (newPhoneNumber: PhoneNumber) => {
        setPhoneNumbers(prev => [newPhoneNumber, ...prev]);
    };

    const handleConfigureSuccess = (updatedPhoneNumber: PhoneNumber) => {
        setPhoneNumbers(prev => prev.map(num => 
            num.id === updatedPhoneNumber.id ? updatedPhoneNumber : num
        ));
    };

    const getProviderBadgeColor = (provider: PhoneNumber['provider']) => {
        switch (provider) {
            case 'Callyy':
            case 'CallyySIP':
                return 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-primary/30';
            case 'Twilio':
                return 'bg-gradient-to-r from-red-500/20 to-red-500/10 text-red-400 border-red-500/30';
            case 'Vonage':
                return 'bg-gradient-to-r from-blue-500/20 to-blue-500/10 text-blue-400 border-blue-500/30';
            case 'Telnyx':
                return 'bg-gradient-to-r from-purple-500/20 to-purple-500/10 text-purple-400 border-purple-500/30';
            case 'BYOSIP':
                return 'bg-gradient-to-r from-green-500/20 to-green-500/10 text-green-400 border-green-500/30';
            default:
                return 'bg-background border-border text-textMuted';
        }
    };

    // Skeleton Loading Card
    const SkeletonCard = () => (
        <div className="bg-surface/50 border border-border/50 rounded-xl p-5 animate-pulse">
            <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-surfaceHover" />
                <div className="w-16 h-5 rounded bg-surfaceHover" />
            </div>
            <div className="h-6 bg-surfaceHover rounded w-3/4 mb-2" />
            <div className="h-4 bg-surfaceHover rounded w-1/2 mb-6" />
            <div className="pt-4 border-t border-border/50 space-y-3">
                <div className="h-4 bg-surfaceHover rounded w-2/3" />
                <div className="flex gap-2">
                    <div className="flex-1 h-8 bg-surfaceHover rounded" />
                    <div className="w-20 h-8 bg-surfaceHover rounded" />
                </div>
            </div>
        </div>
    );

    return (
        <FadeIn className="p-8 max-w-7xl mx-auto relative min-h-screen">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-textMain flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <PhoneCall size={20} weight="duotone" className="text-primary" />
                            </div>
                            Phone Numbers
                        </h1>
                        <p className="text-textMuted text-sm mt-2 ml-13">Connect assistants to inbound and outbound lines.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="p-2.5 bg-surface/80 backdrop-blur-sm border border-border/50 text-textMuted rounded-xl hover:text-primary hover:border-primary/50 transition-all duration-300 disabled:opacity-50"
                            title="Refresh"
                        >
                            <ArrowsClockwise size={18} weight="bold" className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] transition-all duration-300"
                        >
                            <Plus size={18} weight="bold" />
                            Add Phone Number
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <>
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonCard />
                        </>
                    ) : phoneNumbers.length === 0 ? (
                        <div className="col-span-full">
                            <div className="relative bg-surface/30 backdrop-blur-xl border border-border/50 rounded-2xl p-12 text-center overflow-hidden">
                                {/* Decorative elements */}
                                <div className="absolute top-4 right-4 text-primary/20">
                                    <Sparkle size={24} weight="fill" />
                                </div>
                                <div className="absolute bottom-4 left-4 text-primary/20">
                                    <Sparkle size={16} weight="fill" />
                                </div>

                                <div className="relative">
                                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/10 flex items-center justify-center">
                                        <Phone size={40} weight="duotone" className="text-primary" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-textMain mb-2">No phone numbers yet</h3>
                                    <p className="text-sm text-textMuted mb-6 max-w-md mx-auto">
                                        Add a phone number to start receiving and making calls with your AI assistants.
                                    </p>
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] transition-all duration-300"
                                    >
                                        <Plus size={18} weight="bold" />
                                        Add Your First Phone Number
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {phoneNumbers.map(num => (
                                <div
                                    key={num.id}
                                    className="group relative bg-surface/50 backdrop-blur-sm border border-border/50 rounded-xl p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                                >
                                    {/* Hover glow effect */}
                                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                                    <div className="relative">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                                                <Phone size={22} weight="duotone" />
                                            </div>
                                            <div className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getProviderBadgeColor(num.provider)}`}>
                                                {num.provider}
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-mono text-textMain mb-1 break-all group-hover:text-primary transition-colors">{num.number}</h3>
                                        <p className="text-sm text-textMuted mb-6">{num.label || 'No label'}</p>

                                        <div className="pt-4 border-t border-border/50 space-y-3">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2 text-textMuted">
                                                    <Globe size={14} weight="duotone" />
                                                    <span>Inbound {num.inboundEnabled ? (
                                                        <span className="text-green-400">Enabled</span>
                                                    ) : (
                                                        <span className="text-red-400">Disabled</span>
                                                    )}</span>
                                                </div>
                                                {num.smsEnabled && (
                                                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-medium">SMS</span>
                                                )}
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setConfiguringPhoneNumber(num)}
                                                    className="flex-1 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200"
                                                >
                                                    <Gear size={14} weight="duotone" />
                                                    Configure
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(num.id)}
                                                    disabled={deletingId === num.id}
                                                    className="px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50"
                                                >
                                                    {deletingId === num.id ? (
                                                        <CircleNotch size={14} weight="bold" className="animate-spin" />
                                                    ) : (
                                                        <Trash size={14} weight="duotone" />
                                                    )}
                                                    {deletingId === num.id ? 'Deleting...' : 'Delete'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Add New Card */}
                            <div
                                onClick={() => setIsModalOpen(true)}
                                className="group border-2 border-dashed border-border/50 rounded-xl p-5 flex flex-col items-center justify-center text-center hover:border-primary/50 hover:bg-surface/30 transition-all duration-300 cursor-pointer min-h-[200px]"
                            >
                                <div className="w-14 h-14 rounded-xl bg-surfaceHover flex items-center justify-center text-textMuted mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300 group-hover:scale-110">
                                    <Plus size={28} weight="bold" />
                                </div>
                                <h3 className="font-semibold text-textMain group-hover:text-primary transition-colors">Add New Number</h3>
                                <p className="text-xs text-textMuted mt-2 max-w-[200px]">
                                    Get a free Voicory number or import from Twilio, Vonage, Telnyx, or your own SIP trunk.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <PhoneNumberModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
            />

            {configuringPhoneNumber && (
                <PhoneNumberConfigModal
                    isOpen={true}
                    phoneNumber={configuringPhoneNumber}
                    onClose={() => setConfiguringPhoneNumber(null)}
                    onSuccess={handleConfigureSuccess}
                />
            )}
        </FadeIn>
    );
};

export default PhoneNumbers;
