
import { Voice, Assistant, PhoneNumber, ApiKey, CallLog, Customer } from '../types';

// Mock Data for India-First Dashboard

export const MOCK_VOICES: Voice[] = [
    {
        id: 'v1',
        name: 'Aditi',
        provider: '11labs',
        language: 'Hindi',
        accent: 'Indian',
        gender: 'Female',
        costPerMin: 4.5,
        previewUrl: 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav', // Placeholder
        tags: ['Conversational', 'News']
    },
    {
        id: 'v2',
        name: 'Raj',
        provider: 'vapi',
        language: 'English (India)',
        accent: 'Indian',
        gender: 'Male',
        costPerMin: 3.0,
        previewUrl: 'https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand60.wav', // Placeholder
        tags: ['Formal', 'Support']
    },
    {
        id: 'v3',
        name: 'Priya',
        provider: 'azure',
        language: 'Tamil',
        accent: 'South Indian',
        gender: 'Female',
        costPerMin: 2.0,
        previewUrl: 'https://www2.cs.uic.edu/~i101/SoundFiles/TaDa.wav', // Placeholder
        tags: ['Narrative']
    },
    {
        id: 'v4',
        name: 'Arjun',
        provider: 'playht',
        language: 'English (India)',
        accent: 'Neutral',
        gender: 'Male',
        costPerMin: 5.0,
        previewUrl: 'https://www2.cs.uic.edu/~i101/SoundFiles/StarWars60.wav', // Placeholder
        tags: ['Energetic']
    }
];

export const MOCK_ASSISTANTS: Assistant[] = [
    { id: 'a1', name: 'Customer Support - Hindi', model: 'gpt-4o', voiceId: 'v1', transcriber: 'Deepgram', createdAt: '2024-05-10', status: 'active' },
    { id: 'a2', name: 'Sales Outbound', model: 'claude-3.5-sonnet', voiceId: 'v2', transcriber: 'Nova-2', createdAt: '2024-05-12', status: 'active' },
    { id: 'a3', name: 'Appointment Booker', model: 'gpt-3.5-turbo', voiceId: 'v4', transcriber: 'Deepgram', createdAt: '2024-05-15', status: 'inactive' },
];

export const MOCK_NUMBERS: PhoneNumber[] = [
    { id: 'p1', number: '+91 98765 43210', provider: 'Vapi', assistantId: 'a1', label: 'Support Line' },
    { id: 'p2', number: '+1 415 555 0123', provider: 'Twilio', assistantId: 'a2', label: 'US Sales' },
];

export const MOCK_API_KEYS: ApiKey[] = [
    { id: 'k1', label: 'Production Key', key: 'vapi_live_7d9...2x1', type: 'private', createdAt: '2024-01-01' },
    { id: 'k2', label: 'Frontend Client', key: 'vapi_pub_9a2...8z9', type: 'public', createdAt: '2024-01-05' },
];

export const MOCK_CALL_LOGS: CallLog[] = [
    { id: 'c1', assistantName: 'Customer Support - Hindi', phoneNumber: '+91 99887 76655', duration: '4m 32s', cost: 12.5, status: 'completed', date: 'Just now' },
    { id: 'c2', assistantName: 'Sales Outbound', phoneNumber: '+91 88776 65544', duration: '0m 45s', cost: 2.1, status: 'failed', date: '2 mins ago' },
    { id: 'c3', assistantName: 'Customer Support - Hindi', phoneNumber: '+91 77665 54433', duration: '12m 10s', cost: 35.0, status: 'completed', date: '1 hour ago' },
    { id: 'c4', assistantName: 'Appointment Booker', phoneNumber: '+91 66554 43322', duration: '2m 05s', cost: 6.2, status: 'completed', date: '3 hours ago' },
];

export const MOCK_CUSTOMERS: Customer[] = [
    { 
        id: 'cust_1', 
        name: 'Rahul Sharma', 
        email: 'rahul.s@example.com', 
        phoneNumber: '+91 98765 12345', 
        variables: { plan: 'Premium', last_order_status: 'Delivered', location: 'Mumbai' }, 
        createdAt: '2024-02-15' 
    },
    { 
        id: 'cust_2', 
        name: 'Sneha Patel', 
        email: 'sneha.p@example.com', 
        phoneNumber: '+91 99887 11223', 
        variables: { plan: 'Basic', preferred_language: 'Hindi', interest: 'Loans' }, 
        createdAt: '2024-03-10' 
    },
    { 
        id: 'cust_3', 
        name: 'Amit Verma', 
        email: 'amit.v@example.com', 
        phoneNumber: '+91 88776 33445', 
        variables: { plan: 'Enterprise', account_manager: 'Priya' }, 
        createdAt: '2024-03-12' 
    },
];

export const getVoices = async (): Promise<Voice[]> => {
    return new Promise(resolve => setTimeout(() => resolve(MOCK_VOICES), 500));
};

export const getAssistant = async (id: string): Promise<Assistant | undefined> => {
    return new Promise(resolve => {
        setTimeout(() => resolve(MOCK_ASSISTANTS.find(a => a.id === id)), 300);
    });
};

export const getCustomers = async (): Promise<Customer[]> => {
    return new Promise(resolve => setTimeout(() => resolve(MOCK_CUSTOMERS), 400));
};
