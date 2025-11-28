import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Book, FileText, Link as LinkIcon, UploadSimple, X, CaretDown, Sparkle, MagnifyingGlass, FolderOpen, Globe, TextAa, ArrowsClockwise, Trash } from '@phosphor-icons/react';

import { FadeIn } from '../components/ui/FadeIn';
import AddWebPagesModal from '../components/AddWebPagesModal';
import {
    getKnowledgeBases,
    createKnowledgeBase,
    deleteKnowledgeBase,
    getDocuments,
    createTextDocument,
    createFileDocument,
    deleteDocument,
    KnowledgeBase as KnowledgeBaseType,
    KnowledgeBaseDocument,
} from '../services/knowledgeBaseService';

// Skeleton loader component
const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded ${className}`} {...props} />
);

const KnowledgeBase: React.FC = () => {
    // Data state
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseType[]>([]);
    const [selectedKb, setSelectedKb] = useState<KnowledgeBaseType | null>(null);
    const [selectedKbDocuments, setSelectedKbDocuments] = useState<KnowledgeBaseDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isWebPagesModalOpen, setIsWebPagesModalOpen] = useState(false);
    const [newKbName, setNewKbName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Dropdown & Sub-modals state
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [activeModal, setActiveModal] = useState<'web' | 'text' | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form states for sub-modals
    const [textFileName, setTextFileName] = useState('');
    const [textContent, setTextContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Temporary documents for KB creation flow
    const [tempDocuments, setTempDocuments] = useState<Array<{ id: string; type: 'web' | 'file' | 'text'; name: string; content?: string }>>([]);

    // Load knowledge bases on mount
    useEffect(() => {
        loadKnowledgeBases();
    }, []);

    // Load documents when KB is selected
    useEffect(() => {
        if (selectedKb) {
            loadDocuments(selectedKb.id);
        } else {
            setSelectedKbDocuments([]);
        }
    }, [selectedKb]);

    const loadKnowledgeBases = async () => {
        setIsLoading(true);
        try {
            const kbs = await getKnowledgeBases();
            setKnowledgeBases(kbs);
        } catch (error) {
            console.error('Error loading knowledge bases:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadDocuments = async (kbId: string) => {
        setIsLoadingDocs(true);
        try {
            const docs = await getDocuments(kbId);
            setSelectedKbDocuments(docs);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setIsLoadingDocs(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowAddDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSaveKb = async () => {
        if (!newKbName.trim()) return;
        
        setIsSaving(true);
        try {
            const newKb = await createKnowledgeBase(newKbName.trim());
            if (newKb) {
                await loadKnowledgeBases();
                setSelectedKb(newKb);
                resetMainModal();
            }
        } catch (error) {
            console.error('Error creating knowledge base:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteKb = async (kbId: string) => {
        if (!confirm('Are you sure you want to delete this knowledge base? All documents will be deleted.')) return;
        
        try {
            await deleteKnowledgeBase(kbId);
            if (selectedKb?.id === kbId) {
                setSelectedKb(null);
            }
            await loadKnowledgeBases();
        } catch (error) {
            console.error('Error deleting knowledge base:', error);
        }
    };

    const resetMainModal = () => {
        setIsModalOpen(false);
        setNewKbName('');
        setTempDocuments([]);
        setShowAddDropdown(false);
    };

    const handleWebPagesSuccess = async (documentId: string) => {
        console.log('Web pages added, document ID:', documentId);
        if (selectedKb) {
            await loadDocuments(selectedKb.id);
            await loadKnowledgeBases();
        }
    };

    const handleAddText = async () => {
        if (!textFileName.trim() || !textContent.trim() || !selectedKb) return;

        setIsSaving(true);
        try {
            await createTextDocument({
                knowledge_base_id: selectedKb.id,
                name: textFileName.trim(),
                text_content: textContent.trim(),
            });
            await loadDocuments(selectedKb.id);
            await loadKnowledgeBases();
            setTextFileName('');
            setTextContent('');
            setActiveModal(null);
        } catch (error) {
            console.error('Error adding text document:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedKb) return;

        setIsSaving(true);
        try {
            await createFileDocument({
                knowledge_base_id: selectedKb.id,
                name: file.name,
                file,
            });
            await loadDocuments(selectedKb.id);
            await loadKnowledgeBases();
        } catch (error) {
            console.error('Error uploading file:', error);
        } finally {
            setIsSaving(false);
            setShowAddDropdown(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteDocument = async (docId: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        
        try {
            await deleteDocument(docId);
            if (selectedKb) {
                await loadDocuments(selectedKb.id);
                await loadKnowledgeBases();
            }
        } catch (error) {
            console.error('Error deleting document:', error);
        }
    };

    // Filter knowledge bases based on search
    const filteredKbs = knowledgeBases.filter(kb =>
        kb.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <FadeIn className="flex h-full bg-background">
            {/* Sub-sidebar */}
            <div className="w-72 border-r border-white/5 bg-surface/50 backdrop-blur-xl flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-white/5">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="font-semibold text-textMain">Knowledge Base</h2>
                            <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                                {knowledgeBases.length}
                            </span>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="group p-2 bg-gradient-to-br from-primary to-primary/80 text-white rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5"
                        >
                            <Plus size={18} weight="bold" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative group">
                        <MagnifyingGlass
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted/50 group-focus-within:text-primary transition-colors"
                            size={16}
                            weight="bold"
                        />
                        <input
                            type="text"
                            placeholder="Search knowledge bases..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-textMain placeholder:text-textMuted/40 outline-none focus:border-primary/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                    {isLoading ? (
                        <div className="space-y-2 p-2">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-16 rounded-xl" />
                            ))}
                        </div>
                    ) : knowledgeBases.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center mx-auto mb-4">
                                <Book size={28} weight="duotone" className="text-textMuted/30" />
                            </div>
                            <p className="text-sm font-medium text-textMain mb-1">No knowledge bases</p>
                            <p className="text-xs text-textMuted/60">Create your first one to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredKbs.map((kb) => (
                                <button
                                    key={kb.id}
                                    onClick={() => setSelectedKb(kb)}
                                    className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${selectedKb?.id === kb.id
                                        ? 'bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-l-primary'
                                        : 'hover:bg-white/[0.03] border-l-2 border-l-transparent hover:border-l-white/20'
                                        }`}
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${selectedKb?.id === kb.id
                                        ? 'bg-gradient-to-br from-primary/20 to-primary/10'
                                        : 'bg-gradient-to-br from-white/10 to-white/5 group-hover:from-primary/15 group-hover:to-primary/5'
                                        }`}>
                                        <Book size={18} weight={selectedKb?.id === kb.id ? "fill" : "duotone"} className={selectedKb?.id === kb.id ? 'text-primary' : 'text-textMuted group-hover:text-primary transition-colors'} />
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <p className={`text-sm font-medium truncate ${selectedKb?.id === kb.id ? 'text-textMain' : 'text-textMain/80 group-hover:text-textMain'}`}>
                                            {kb.name}
                                        </p>
                                        <p className="text-xs text-textMuted/60">{kb.total_documents} documents</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center bg-background overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center">
                        <div className="animate-pulse w-16 h-16 rounded-2xl bg-white/5 mb-4" />
                        <Skeleton className="w-40 h-6 mb-2" />
                        <Skeleton className="w-32 h-4" />
                    </div>
                ) : knowledgeBases.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-textMuted">
                        {/* Ambient background */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                            <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl" />
                        </div>

                        <div className="relative">
                            {/* Floating sparkles */}
                            <Sparkle size={16} weight="fill" className="absolute -top-8 -left-6 text-primary/40 animate-pulse" />
                            <Sparkle size={12} weight="fill" className="absolute -top-4 right-0 text-violet-400/40 animate-pulse" style={{ animationDelay: '0.5s' }} />
                            <Sparkle size={14} weight="fill" className="absolute bottom-0 -left-8 text-cyan-400/40 animate-pulse" style={{ animationDelay: '1s' }} />

                            <div className="relative w-20 h-20 mb-6">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-violet-500/20 rounded-2xl blur-xl animate-pulse" />
                                <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-surface to-surface/80 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                                    <Book size={40} weight="duotone" className="text-primary" />
                                </div>
                            </div>
                        </div>

                        <p className="text-xl font-semibold text-textMain mb-2">No knowledge bases yet</p>
                        <p className="text-sm text-textMuted/60 max-w-xs text-center">
                            Create a knowledge base to give your AI assistants access to your documents and data
                        </p>

                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-textMain font-medium rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                        >
                            <Plus size={18} weight="bold" />
                            Create Knowledge Base
                        </button>
                    </div>
                ) : selectedKb ? (
                    <div className="p-8 w-full h-full overflow-y-auto">
                        <div className="max-w-4xl mx-auto">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                            <Book size={24} weight="fill" className="text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-textMain">{selectedKb.name}</h2>
                                            <p className="text-sm text-textMuted">{selectedKbDocuments.length} documents</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative" ref={dropdownRef}>
                                        <button
                                            onClick={() => setShowAddDropdown(!showAddDropdown)}
                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all"
                                        >
                                            <Plus size={16} weight="bold" />
                                            Add Document
                                            <CaretDown size={14} weight="bold" className={`transition-transform ${showAddDropdown ? 'rotate-180' : ''}`} />
                                        </button>

                                        {showAddDropdown && (
                                            <div className="absolute top-full right-0 mt-2 w-72 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-10 overflow-hidden">
                                                <button
                                                    onClick={() => {
                                                        setShowAddDropdown(false);
                                                        setIsWebPagesModalOpen(true);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 text-left transition-all"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center">
                                                        <Globe size={18} weight="duotone" className="text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-textMain">Add Web Pages</p>
                                                        <p className="text-xs text-textMuted/60">Crawl and sync your website</p>
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setShowAddDropdown(false);
                                                        fileInputRef.current?.click();
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 text-left transition-all"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center">
                                                        <UploadSimple size={18} weight="duotone" className="text-violet-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-textMain">Upload Files</p>
                                                        <p className="text-xs text-textMuted/60">PDF, TXT, DOCX up to 100MB</p>
                                                    </div>
                                                </button>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    accept=".txt,.json,.md"
                                                    onChange={handleFileUpload}
                                                />

                                                <button
                                                    onClick={() => {
                                                        setActiveModal('text');
                                                        setShowAddDropdown(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 text-left transition-all"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
                                                        <TextAa size={18} weight="duotone" className="text-emerald-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-textMain">Add Text</p>
                                                        <p className="text-xs text-textMuted/60">Add articles manually</p>
                                                    </div>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteKb(selectedKb.id)}
                                        className="p-2 text-textMuted hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                        title="Delete Knowledge Base"
                                    >
                                        <Trash size={18} weight="bold" />
                                    </button>
                                </div>
                            </div>

                            {/* Documents Grid */}
                            {isLoadingDocs ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[1, 2, 3].map(i => (
                                        <Skeleton key={i} className="h-24 rounded-xl" />
                                    ))}
                                </div>
                            ) : selectedKbDocuments.length === 0 ? (
                                <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-surface border border-white/10 flex items-center justify-center mx-auto mb-4">
                                        <FileText size={28} weight="duotone" className="text-textMuted" />
                                    </div>
                                    <h3 className="text-lg font-medium text-textMain mb-2">No documents yet</h3>
                                    <p className="text-sm text-textMuted mb-4">Add documents to this knowledge base</p>
                                    <button
                                        onClick={() => setIsWebPagesModalOpen(true)}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary font-medium rounded-xl hover:bg-primary/20 transition-all"
                                    >
                                        <Globe size={16} weight="bold" />
                                        Add Web Pages
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {selectedKbDocuments.map((doc) => (
                                        <div key={doc.id} className="group bg-surface/50 border border-white/10 rounded-xl p-4 hover:border-primary/30 hover:bg-white/[0.03] transition-all">
                                            <div className="flex items-start gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${doc.type === 'url' ? 'bg-blue-500/10' :
                                                    doc.type === 'file' ? 'bg-violet-500/10' :
                                                        'bg-emerald-500/10'
                                                    }`}>
                                                    {doc.type === 'url' && <Globe size={20} weight="duotone" className="text-blue-400" />}
                                                    {doc.type === 'file' && <FileText size={20} weight="duotone" className="text-violet-400" />}
                                                    {doc.type === 'text' && <TextAa size={20} weight="duotone" className="text-emerald-400" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-textMain truncate">{doc.name}</p>
                                                    <p className="text-xs text-textMuted capitalize">{doc.type}</p>
                                                    {doc.character_count > 0 && (
                                                        <p className="text-xs text-textMuted/60 mt-1">
                                                            {doc.character_count.toLocaleString()} chars
                                                        </p>
                                                    )}
                                                    {doc.processing_status === 'processing' && (
                                                        <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                                                            <ArrowsClockwise size={12} className="animate-spin" />
                                                            Processing...
                                                        </p>
                                                    )}
                                                    {doc.processing_status === 'failed' && (
                                                        <p className="text-xs text-red-400 mt-1">Failed</p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteDocument(doc.id)}
                                                    className="p-1.5 text-textMuted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                >
                                                    <Trash size={14} weight="bold" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-2xl bg-surface border border-white/10 flex items-center justify-center mx-auto mb-4">
                            <FolderOpen size={32} weight="duotone" className="text-textMuted" />
                        </div>
                        <p className="text-lg font-medium text-textMain mb-1">Select a knowledge base</p>
                        <p className="text-sm text-textMuted/60">Choose one from the sidebar to view details</p>
                    </div>
                )}
            </div>

            {/* Add Web Pages Modal */}
            <AddWebPagesModal
                isOpen={isWebPagesModalOpen}
                onClose={() => setIsWebPagesModalOpen(false)}
                onSuccess={handleWebPagesSuccess}
                knowledgeBaseId={selectedKb?.id || ''}
            />

            {/* Add Knowledge Base Modal */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100]">
                    <div className="bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl w-[480px] shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                    <Book size={22} weight="duotone" className="text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-textMain">Create Knowledge Base</h2>
                                    <p className="text-sm text-textMuted/70">Add a new knowledge base for your assistants</p>
                                </div>
                            </div>
                            <button
                                onClick={resetMainModal}
                                className="p-2.5 hover:bg-white/5 rounded-xl text-textMuted hover:text-textMain transition-all"
                            >
                                <X size={18} weight="bold" />
                            </button>
                        </div>

                        <div className="p-6">
                            <label className="block text-sm font-medium text-textMain mb-2">
                                Knowledge Base Name
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Product Documentation, FAQs..."
                                value={newKbName}
                                onChange={(e) => setNewKbName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && newKbName.trim() && handleSaveKb()}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-textMain placeholder:text-textMuted/40 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                                autoFocus
                            />
                        </div>

                        <div className="p-6 border-t border-white/5 flex justify-end gap-3">
                            <button
                                onClick={resetMainModal}
                                className="px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-textMain hover:bg-white/5 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveKb}
                                disabled={!newKbName.trim() || isSaving}
                                className={`px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 ${!newKbName.trim() || isSaving
                                    ? 'bg-primary/30 text-white/50 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-primary to-primary/80 text-white hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5'
                                    }`}
                            >
                                {isSaving && <ArrowsClockwise size={16} className="animate-spin" />}
                                Create
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Add Web Pages Modal */}
            {/* Add Text Modal */}
            {activeModal === 'text' && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100]">
                    <div className="bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl w-[500px] shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
                                    <TextAa size={22} weight="duotone" className="text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-textMain">Add Text</h2>
                                    <p className="text-sm text-textMuted/70">Add content manually</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveModal(null)}
                                className="p-2.5 hover:bg-white/5 rounded-xl text-textMuted hover:text-textMain transition-all"
                            >
                                <X size={18} weight="bold" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    Document Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter document name"
                                    value={textFileName}
                                    onChange={(e) => setTextFileName(e.target.value)}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-textMain placeholder:text-textMuted/40 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    Text Content
                                    <span className="text-xs text-textMuted/60 ml-2">(max 10,000 characters)</span>
                                </label>
                                <textarea
                                    placeholder="Enter your text content here..."
                                    value={textContent}
                                    onChange={(e) => setTextContent(e.target.value.slice(0, 10000))}
                                    rows={8}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-textMain placeholder:text-textMuted/40 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                                />
                                <p className="text-xs text-textMuted/50 mt-1 text-right">
                                    {textContent.length.toLocaleString()} / 10,000
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/5 flex justify-end gap-3">
                            <button
                                onClick={() => setActiveModal(null)}
                                className="px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-textMain hover:bg-white/5 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddText}
                                disabled={!textFileName.trim() || !textContent.trim() || isSaving}
                                className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${!textFileName.trim() || !textContent.trim() || isSaving
                                    ? 'bg-emerald-500/30 text-white/50 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25'
                                    }`}
                            >
                                {isSaving && <ArrowsClockwise size={16} className="animate-spin" />}
                                Add Text
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </FadeIn>
    );
};

export default KnowledgeBase;
