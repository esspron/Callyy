import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CircleNotch, Phone, PhoneCall, ArrowSquareOut, Check } from '@phosphor-icons/react';
import type { PhoneNumber, SipTrunkCredential } from '../types';
import { createPhoneNumber, getSipTrunkCredentials, importTwilioNumberDirect } from '../services/voicoryService';

interface PhoneNumberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (phoneNumber: PhoneNumber) => void;
}

type ProviderType = 'Voicory' | 'VoicorySIP' | 'Twilio' | 'Vonage' | 'Telnyx' | 'BYOSIP';

const PhoneNumberModal: React.FC<PhoneNumberModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [selectedProvider, setSelectedProvider] = useState<ProviderType>('Voicory');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sipCredentials, setSipCredentials] = useState<SipTrunkCredential[]>([]);
    const [importSuccess, setImportSuccess] = useState(false);

    // Form fields for different providers
    const [areaCode, setAreaCode] = useState('');
    const [sipIdentifier, setSipIdentifier] = useState('');
    const [sipLabel, setSipLabel] = useState('');
    const [sipUsername, setSipUsername] = useState('');
    const [sipPassword, setSipPassword] = useState('');
    const [twilioPhoneNumber, setTwilioPhoneNumber] = useState('');
    const [twilioAccountSid, setTwilioAccountSid] = useState('');
    const [twilioAuthToken, setTwilioAuthToken] = useState('');
    const [smsEnabled, setSmsEnabled] = useState(false);
    const [vonagePhoneNumber, setVonagePhoneNumber] = useState('');
    const [vonageApiKey, setVonageApiKey] = useState('');
    const [vonageApiSecret, setVonageApiSecret] = useState('');
    const [telnyxPhoneNumber, setTelnyxPhoneNumber] = useState('');
    const [telnyxApiKey, setTelnyxApiKey] = useState('');
    const [sipTrunkPhoneNumber, setSipTrunkPhoneNumber] = useState('');
    const [sipTrunkCredentialId, setSipTrunkCredentialId] = useState('');
    const [allowNonE164, setAllowNonE164] = useState(false);
    const [label, setLabel] = useState('');

    useEffect(() => {
        if (isOpen && selectedProvider === 'BYOSIP') {
            loadSipCredentials();
        }
    }, [isOpen, selectedProvider]);

    const loadSipCredentials = async () => {
        try {
            const credentials = await getSipTrunkCredentials();
            setSipCredentials(credentials);
        } catch (err) {
            console.error('Error loading SIP credentials:', err);
        }
    };

    const resetForm = () => {
        setAreaCode('');
        setSipIdentifier('');
        setSipLabel('');
        setSipUsername('');
        setSipPassword('');
        setTwilioPhoneNumber('');
        setTwilioAccountSid('');
        setTwilioAuthToken('');
        setSmsEnabled(false);
        setVonagePhoneNumber('');
        setVonageApiKey('');
        setVonageApiSecret('');
        setTelnyxPhoneNumber('');
        setTelnyxApiKey('');
        setSipTrunkPhoneNumber('');
        setSipTrunkCredentialId('');
        setAllowNonE164(false);
        setLabel('');
        setError(null);
        setImportSuccess(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    // ============================================
    // TWILIO DIRECT IMPORT HANDLER
    // ============================================

    const handleTwilioImport = async () => {
        if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
            setError('Please enter Account SID, Auth Token, and Phone Number');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await importTwilioNumberDirect({
                accountSid: twilioAccountSid,
                authToken: twilioAuthToken,
                phoneNumber: twilioPhoneNumber,
                label: label || 'Twilio Number',
                smsEnabled
            });

            if (result.success && result.phoneNumber) {
                setImportSuccess(true);
                onSuccess(result.phoneNumber);
                // Close after short delay to show success
                setTimeout(() => {
                    handleClose();
                }, 1500);
            } else {
                setError(result.error || 'Failed to import phone number');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to import phone number');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            let phoneNumberData: Omit<PhoneNumber, 'id'>;

            switch (selectedProvider) {
                case 'Voicory':
                    if (!areaCode) {
                        setError('Area code is required');
                        setLoading(false);
                        return;
                    }
                    phoneNumberData = {
                        number: `+1${areaCode}XXXXXXX`, // Placeholder, will be generated by backend
                        provider: 'Voicory',
                        areaCode,
                        label: label || 'Free Voicory Number',
                        inboundEnabled: true,
                        outboundEnabled: false,
                        isActive: true
                    };
                    break;

                case 'VoicorySIP':
                    if (!sipIdentifier) {
                        setError('SIP identifier is required');
                        setLoading(false);
                        return;
                    }
                    phoneNumberData = {
                        number: `sip:${sipIdentifier}@sip.voicory.com`,
                        provider: 'VoicorySIP',
                        sipIdentifier,
                        sipLabel: sipLabel || 'Free Voicory SIP',
                        sipUsername,
                        sipPassword,
                        label: label || sipLabel || 'Free Voicory SIP',
                        inboundEnabled: true,
                        outboundEnabled: false,
                        isActive: true
                    };
                    break;

                case 'Twilio':
                    if (!twilioPhoneNumber || !twilioAccountSid || !twilioAuthToken) {
                        setError('All Twilio fields are required');
                        setLoading(false);
                        return;
                    }
                    phoneNumberData = {
                        number: twilioPhoneNumber,
                        provider: 'Twilio',
                        twilioPhoneNumber,
                        twilioAccountSid,
                        twilioAuthToken,
                        smsEnabled,
                        label: label || 'Twilio Number',
                        inboundEnabled: true,
                        outboundEnabled: true,
                        isActive: true
                    };
                    break;

                case 'Vonage':
                    if (!vonagePhoneNumber || !vonageApiKey || !vonageApiSecret) {
                        setError('All Vonage fields are required');
                        setLoading(false);
                        return;
                    }
                    phoneNumberData = {
                        number: vonagePhoneNumber,
                        provider: 'Vonage',
                        vonagePhoneNumber,
                        vonageApiKey,
                        vonageApiSecret,
                        label: label || 'Vonage Number',
                        inboundEnabled: true,
                        outboundEnabled: true,
                        isActive: true
                    };
                    break;

                case 'Telnyx':
                    if (!telnyxPhoneNumber || !telnyxApiKey) {
                        setError('All Telnyx fields are required');
                        setLoading(false);
                        return;
                    }
                    phoneNumberData = {
                        number: telnyxPhoneNumber,
                        provider: 'Telnyx',
                        telnyxPhoneNumber,
                        telnyxApiKey,
                        label: label || 'Telnyx Number',
                        inboundEnabled: true,
                        outboundEnabled: true,
                        isActive: true
                    };
                    break;

                case 'BYOSIP':
                    if (!sipTrunkPhoneNumber || !sipTrunkCredentialId) {
                        setError('Phone number and SIP trunk credential are required');
                        setLoading(false);
                        return;
                    }
                    phoneNumberData = {
                        number: sipTrunkPhoneNumber,
                        provider: 'BYOSIP',
                        sipTrunkPhoneNumber,
                        sipTrunkCredentialId,
                        allowNonE164,
                        label: label || 'BYO SIP Trunk',
                        inboundEnabled: true,
                        outboundEnabled: true,
                        isActive: true
                    };
                    break;

                default:
                    setError('Invalid provider selected');
                    setLoading(false);
                    return;
            }

            const result = await createPhoneNumber(phoneNumberData);
            
            if (result) {
                onSuccess(result);
                handleClose();
            } else {
                setError('Failed to create phone number. Please try again.');
            }
        } catch (err) {
            console.error('Error creating phone number:', err);
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-surface/95 backdrop-blur-xl border border-border/50 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex shadow-2xl">
                {/* Left Sidebar - Provider Options */}
                <div className="w-80 bg-background/50 border-r border-border/50 p-6 overflow-y-auto">
                    <h3 className="text-sm font-medium text-textMuted mb-4">Phone Number Options</h3>
                    
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={() => setSelectedProvider('Voicory')}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                                selectedProvider === 'Voicory'
                                    ? 'bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary text-primary'
                                    : 'bg-surface/50 border border-border/50 text-textMain hover:bg-surfaceHover hover:border-primary/50'
                            }`}
                        >
                            Free Voicory Number
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedProvider('VoicorySIP')}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                                selectedProvider === 'VoicorySIP'
                                    ? 'bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary text-primary'
                                    : 'bg-surface/50 border border-border/50 text-textMain hover:bg-surfaceHover hover:border-primary/50'
                            }`}
                        >
                            Free Voicory SIP
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedProvider('Twilio')}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                                selectedProvider === 'Twilio'
                                    ? 'bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary text-primary'
                                    : 'bg-surface/50 border border-border/50 text-textMain hover:bg-surfaceHover hover:border-primary/50'
                            }`}
                        >
                            Import Twilio
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedProvider('Vonage')}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 relative ${
                                selectedProvider === 'Vonage'
                                    ? 'bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary text-primary'
                                    : 'bg-surface/50 border border-border/50 text-textMain hover:bg-surfaceHover hover:border-primary/50'
                            }`}
                        >
                            Import Vonage
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-md font-medium">Soon</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedProvider('Telnyx')}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 relative ${
                                selectedProvider === 'Telnyx'
                                    ? 'bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary text-primary'
                                    : 'bg-surface/50 border border-border/50 text-textMain hover:bg-surfaceHover hover:border-primary/50'
                            }`}
                        >
                            Import Telnyx
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-md font-medium">Soon</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedProvider('BYOSIP')}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                                selectedProvider === 'BYOSIP'
                                    ? 'bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary text-primary'
                                    : 'bg-surface/50 border border-border/50 text-textMain hover:bg-surfaceHover hover:border-primary/50'
                            }`}
                        >
                            BYO SIP Trunk Number
                        </button>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-border/50">
                        <h2 className="text-xl font-bold text-textMain flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <PhoneCall size={16} weight="duotone" className="text-primary" />
                            </div>
                            Add Phone Number
                        </h2>
                        <button
                            onClick={handleClose}
                            className="p-2 text-textMuted hover:text-textMain hover:bg-surfaceHover rounded-lg transition-all duration-200"
                        >
                            <X size={20} weight="bold" />
                        </button>
                    </div>

                    {/* Form Content */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                        {error && (
                            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Free Voicory Number Form */}
                        {selectedProvider === 'Voicory' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">
                                        Area Code
                                    </label>
                                    <input
                                        type="text"
                                        value={areaCode}
                                        onChange={(e) => setAreaCode(e.target.value)}
                                        placeholder="e.g. 346, 984, 326"
                                        className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                        maxLength={3}
                                    />
                                    <p className="text-xs text-primary mt-2 flex items-start gap-2">
                                        <span className="text-base">ℹ️</span>
                                        <span>Free US phone numbers • Up to 10 per account<br />
                                        Only US area codes are supported. For international numbers, use the import options above.</span>
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">
                                        Label (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={label}
                                        onChange={(e) => setLabel(e.target.value)}
                                        placeholder="Label for Phone Number"
                                        className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Free Voicory SIP Form */}
                        {selectedProvider === 'VoicorySIP' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">
                                        SIP Identifier
                                    </label>
                                    <input
                                        type="text"
                                        value={sipIdentifier}
                                        onChange={(e) => setSipIdentifier(e.target.value)}
                                        placeholder="my-example-identifier"
                                        className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <p className="text-xs text-textMuted mt-1">
                                        Will be used as: sip:identifier@sip.voicory.com
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">
                                        Label
                                    </label>
                                    <input
                                        type="text"
                                        value={sipLabel}
                                        onChange={(e) => setSipLabel(e.target.value)}
                                        placeholder="Label for SIP URI"
                                        className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>

                                <div className="border-t border-border pt-4">
                                    <h4 className="text-sm font-medium text-textMain mb-3">SIP Authentication (Optional)</h4>
                                    
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm text-textMuted mb-1">Username</label>
                                            <input
                                                type="text"
                                                value={sipUsername}
                                                onChange={(e) => setSipUsername(e.target.value)}
                                                placeholder="SIP Authentication Username"
                                                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-textMuted mb-1">Password</label>
                                            <input
                                                type="password"
                                                value={sipPassword}
                                                onChange={(e) => setSipPassword(e.target.value)}
                                                placeholder="SIP Authentication Password"
                                                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                    </div>

                                    <p className="text-xs text-primary mt-3">
                                        <a href="#" className="hover:underline">Read more about using SIP with Voicory in the documentation</a>
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Twilio Import Form - Simple Direct Import */}
                        {selectedProvider === 'Twilio' && (
                            <div className="space-y-4">
                                {importSuccess ? (
                                    <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
                                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                                            <Check size={24} weight="bold" className="text-green-400" />
                                        </div>
                                        <h4 className="text-lg font-medium text-textMain mb-1">Import Successful!</h4>
                                        <p className="text-sm text-textMuted">
                                            Your phone number has been imported and configured.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-4 bg-gradient-to-r from-red-500/10 to-red-500/5 border border-red-500/20 rounded-xl">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                                    <Phone size={16} weight="fill" className="text-red-400" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-medium text-textMain mb-1">Import from Twilio</h4>
                                                    <p className="text-xs text-textMuted">
                                                        Enter your Twilio credentials and phone number. We'll validate and configure webhooks automatically.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-textMain mb-2">
                                                Phone Number
                                            </label>
                                            <input
                                                type="text"
                                                value={twilioPhoneNumber}
                                                onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                                                placeholder="+1234567890"
                                                className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                                            />
                                            <p className="text-xs text-textMuted mt-1.5">
                                                Enter the phone number you own in Twilio (E.164 format)
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-textMain mb-2">
                                                Account SID
                                            </label>
                                            <input
                                                type="text"
                                                value={twilioAccountSid}
                                                onChange={(e) => setTwilioAccountSid(e.target.value)}
                                                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                                className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                                            />
                                            <p className="text-xs text-textMuted mt-1.5">
                                                Find this in your{' '}
                                                <a 
                                                    href="https://console.twilio.com" 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline inline-flex items-center gap-1"
                                                >
                                                    Twilio Console <ArrowSquareOut size={12} />
                                                </a>
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-textMain mb-2">
                                                Auth Token
                                            </label>
                                            <input
                                                type="password"
                                                value={twilioAuthToken}
                                                onChange={(e) => setTwilioAuthToken(e.target.value)}
                                                placeholder="Your Twilio Auth Token"
                                                className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-textMain mb-2">
                                                Label (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={label}
                                                onChange={(e) => setLabel(e.target.value)}
                                                placeholder="My Twilio Number"
                                                className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleTwilioImport}
                                            disabled={loading || !twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber}
                                            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? (
                                                <>
                                                    <CircleNotch size={18} weight="bold" className="animate-spin" />
                                                    Importing...
                                                </>
                                            ) : (
                                                'Import Phone Number'
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Vonage Import Form */}
                        {selectedProvider === 'Vonage' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">
                                        Vonage Phone Number
                                    </label>
                                    <div className="flex gap-2">
                                        <select className="px-3 py-2 bg-surface border border-border rounded-lg text-textMain">
                                            <option>🇺🇸</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={vonagePhoneNumber}
                                            onChange={(e) => setVonagePhoneNumber(e.target.value)}
                                            placeholder="+14156021922"
                                            className="flex-1 px-4 py-2 bg-surface border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">
                                        API Key
                                    </label>
                                    <input
                                        type="text"
                                        value={vonageApiKey}
                                        onChange={(e) => setVonageApiKey(e.target.value)}
                                        placeholder="Enter API Key"
                                        className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">
                                        API Secret
                                    </label>
                                    <input
                                        type="password"
                                        value={vonageApiSecret}
                                        onChange={(e) => setVonageApiSecret(e.target.value)}
                                        placeholder="Enter API Secret"
                                        className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">
                                        Label
                                    </label>
                                    <input
                                        type="text"
                                        value={label}
                                        onChange={(e) => setLabel(e.target.value)}
                                        placeholder="Label for Phone Number"
                                        className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Telnyx Import Form */}
                        {selectedProvider === 'Telnyx' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">
                                        Telnyx Phone Number
                                    </label>
                                    <div className="flex gap-2">
                                        <select className="px-3 py-2 bg-surface border border-border rounded-lg text-textMain">
                                            <option>🇺🇸</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={telnyxPhoneNumber}
                                            onChange={(e) => setTelnyxPhoneNumber(e.target.value)}
                                            placeholder="+14156021922"
                                            className="flex-1 px-4 py-2 bg-surface border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">
                                        API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={telnyxApiKey}
                                        onChange={(e) => setTelnyxApiKey(e.target.value)}
                                        placeholder="Enter API Key"
                                        className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">
                                        Label
                                    </label>
                                    <input
                                        type="text"
                                        value={label}
                                        onChange={(e) => setLabel(e.target.value)}
                                        placeholder="Label for Phone Number"
                                        className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>
                        )}

                        {/* BYO SIP Trunk Form */}
                        {selectedProvider === 'BYOSIP' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">
                                        Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        value={sipTrunkPhoneNumber}
                                        onChange={(e) => setSipTrunkPhoneNumber(e.target.value)}
                                        placeholder="+14155551234"
                                        className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-surface rounded-lg">
                                    <label className="relative inline-flex items-center cursor-pointer flex-1">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-textMain">Allow non-E164 phone numbers</div>
                                            <div className="text-xs text-textMuted">Check this box to disable E164 format validation and use custom phone number formats</div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={allowNonE164}
                                            onChange={(e) => setAllowNonE164(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-surface border-2 border-border rounded-full peer peer-checked:bg-primary peer-checked:border-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:right-[22px] after:bg-textMuted after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:bg-background"></div>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">
                                        SIP Trunk Credential
                                    </label>
                                    <select
                                        value={sipTrunkCredentialId}
                                        onChange={(e) => setSipTrunkCredentialId(e.target.value)}
                                        className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="">Select a SIP trunk credential</option>
                                        {sipCredentials.map((cred) => (
                                            <option key={cred.id} value={cred.id}>
                                                {cred.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-textMain mb-2">
                                        Label
                                    </label>
                                    <input
                                        type="text"
                                        value={label}
                                        onChange={(e) => setLabel(e.target.value)}
                                        placeholder="Label for Phone Number"
                                        className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>

                                <p className="text-xs text-primary">
                                    <a href="#" className="hover:underline">Read more about SIP trunking in the documentation</a>
                                </p>
                            </div>
                        )}
                    </form>

                    {/* Footer - Hide for Twilio multi-step flow */}
                    {!(selectedProvider === 'Twilio') && (
                        <div className="flex justify-end gap-3 p-6 border-t border-border/50 bg-surface/30">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-5 py-2.5 bg-transparent border border-border/50 rounded-xl text-textMain hover:bg-surfaceHover transition-all duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                                    loading
                                        ? 'bg-primary/50 text-black/50 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-primary to-primary/80 text-black hover:shadow-lg hover:shadow-primary/25'
                                }`}
                            >
                                {loading && <CircleNotch size={16} weight="bold" className="animate-spin" />}
                                {loading ? 'Creating...' : 
                                    selectedProvider === 'Voicory' ? 'Create' : 
                                    selectedProvider === 'VoicorySIP' ? 'Import SIP URI' :
                                    selectedProvider === 'BYOSIP' ? 'Import SIP Phone Number' :
                                    `Import from ${selectedProvider}`
                                }
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PhoneNumberModal;
