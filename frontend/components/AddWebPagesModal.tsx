import { 
    X, 
    Globe, 
    MagnifyingGlass, 
    CaretRight, 
    CaretDown, 
    CircleNotch, 
    Check, 
    Warning,
    ArrowsClockwise,
    CheckSquare,
    Square,
    MinusSquare
} from '@phosphor-icons/react';
import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

import { 
    discoverWebPages, 
    crawlWebPages, 
    DiscoveredPage 
} from '../services/knowledgeBaseService';

interface AddWebPagesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (documentId: string) => void;
    knowledgeBaseId: string;
}

type DiscoveryState = 'idle' | 'discovering' | 'discovered' | 'crawling' | 'error';

interface GroupedPages {
    [domain: string]: {
        expanded: boolean;
        pages: DiscoveredPage[];
        selectedCount: number;
    };
}

const AddWebPagesModal: React.FC<AddWebPagesModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    knowledgeBaseId,
}) => {
    // URL input state
    const [url, setUrl] = useState('');
    const [discoveryState, setDiscoveryState] = useState<DiscoveryState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Discovered pages state
    const [discoveredDomain, setDiscoveredDomain] = useState<string>('');
    const [discoveredPages, setDiscoveredPages] = useState<DiscoveredPage[]>([]);
    const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
    const [sitemapFound, setSitemapFound] = useState(false);

    // UI state
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
    const [autoAddFuture, setAutoAddFuture] = useState(false);

    // Filter pages based on search
    const filteredPages = useMemo(() => {
        if (!searchQuery.trim()) return discoveredPages;
        const query = searchQuery.toLowerCase();
        return discoveredPages.filter(page => 
            page.url.toLowerCase().includes(query) ||
            page.title?.toLowerCase().includes(query)
        );
    }, [discoveredPages, searchQuery]);

    // Group pages by path structure for tree view
    const groupedPages = useMemo((): GroupedPages => {
        const groups: GroupedPages = {};
        
        for (const page of filteredPages) {
            const domain = discoveredDomain || 'Pages';
            if (!groups[domain]) {
                groups[domain] = {
                    expanded: expandedDomains.has(domain),
                    pages: [],
                    selectedCount: 0,
                };
            }
            groups[domain].pages.push(page);
            if (selectedUrls.has(page.url)) {
                groups[domain].selectedCount++;
            }
        }

        return groups;
    }, [filteredPages, discoveredDomain, selectedUrls, expandedDomains]);

    // Handle URL discovery
    const handleDiscover = async () => {
        if (!url.trim()) return;

        setDiscoveryState('discovering');
        setErrorMessage(null);
        setDiscoveredPages([]);
        setSelectedUrls(new Set());

        try {
            const result = await discoverWebPages(url.trim());
            
            setDiscoveredDomain(result.domain);
            setDiscoveredPages(result.pages);
            setSitemapFound(result.sitemapFound);
            setExpandedDomains(new Set([result.domain]));
            setDiscoveryState('discovered');

            // Auto-select all pages by default
            // setSelectedUrls(new Set(result.pages.map(p => p.url)));
        } catch (error) {
            console.error('Discovery error:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Failed to discover pages');
            setDiscoveryState('error');
        }
    };

    // Handle page selection
    const togglePageSelection = useCallback((pageUrl: string) => {
        setSelectedUrls(prev => {
            const newSet = new Set(prev);
            if (newSet.has(pageUrl)) {
                newSet.delete(pageUrl);
            } else {
                newSet.add(pageUrl);
            }
            return newSet;
        });
    }, []);

    // Handle select all / deselect all
    const toggleSelectAll = useCallback(() => {
        if (selectedUrls.size === filteredPages.length) {
            setSelectedUrls(new Set());
        } else {
            setSelectedUrls(new Set(filteredPages.map(p => p.url)));
        }
    }, [selectedUrls.size, filteredPages]);

    // Toggle domain expansion
    const toggleDomainExpansion = useCallback((domain: string) => {
        setExpandedDomains(prev => {
            const newSet = new Set(prev);
            if (newSet.has(domain)) {
                newSet.delete(domain);
            } else {
                newSet.add(domain);
            }
            return newSet;
        });
    }, []);

    // Handle crawl
    const handleCrawl = async () => {
        if (selectedUrls.size === 0) return;

        setDiscoveryState('crawling');
        setErrorMessage(null);

        try {
            const selectedPages = discoveredPages.filter(p => selectedUrls.has(p.url));
            const result = await crawlWebPages(
                selectedPages,
                knowledgeBaseId,
                discoveredDomain,
                autoAddFuture
            );

            if (result.success && result.document) {
                onSuccess(result.document.id);
                handleClose();
            } else {
                throw new Error('Crawl completed but no document was created');
            }
        } catch (error) {
            console.error('Crawl error:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Failed to crawl pages');
            setDiscoveryState('error');
        }
    };

    // Reset and close
    const handleClose = () => {
        setUrl('');
        setDiscoveryState('idle');
        setErrorMessage(null);
        setDiscoveredPages([]);
        setSelectedUrls(new Set());
        setSearchQuery('');
        setAutoAddFuture(false);
        onClose();
    };

    // Invert selection
    const invertSelection = useCallback(() => {
        const newSelected = new Set<string>();
        filteredPages.forEach(page => {
            if (!selectedUrls.has(page.url)) {
                newSelected.add(page.url);
            }
        });
        setSelectedUrls(newSelected);
    }, [filteredPages, selectedUrls]);

    // Clear selection
    const clearSelection = useCallback(() => {
        setSelectedUrls(new Set());
    }, []);

    if (!isOpen) return null;

    const isAllSelected = selectedUrls.size === filteredPages.length && filteredPages.length > 0;
    const isSomeSelected = selectedUrls.size > 0 && selectedUrls.size < filteredPages.length;

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100]">
            <div className="bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl w-[700px] max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center">
                            <Globe size={22} weight="duotone" className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-textMain">Add Web Pages</h2>
                            <p className="text-sm text-textMuted/70">
                                {discoveryState === 'idle' && 'Enter a URL to discover pages'}
                                {discoveryState === 'discovering' && 'Discovering pages...'}
                                {discoveryState === 'discovered' && `Found ${discoveredPages.length} pages`}
                                {discoveryState === 'crawling' && `Crawling ${selectedUrls.size} pages...`}
                                {discoveryState === 'error' && 'Error occurred'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2.5 hover:bg-white/5 rounded-xl text-textMuted hover:text-textMain transition-all"
                    >
                        <X size={18} weight="bold" />
                    </button>
                </div>

                {/* URL Input Section */}
                {(discoveryState === 'idle' || discoveryState === 'error') && (
                    <div className="p-6 border-b border-white/5">
                        <label className="block text-sm font-medium text-textMain mb-2">
                            Website URL
                        </label>
                        <div className="flex gap-3">
                            <div className="flex-1 relative">
                                <Globe 
                                    size={18} 
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted/50" 
                                />
                                <input
                                    type="text"
                                    placeholder="https://example.com"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleDiscover()}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-textMain placeholder:text-textMuted/40 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                                />
                            </div>
                            <button
                                onClick={handleDiscover}
                                disabled={!url.trim()}
                                className={`px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                                    !url.trim()
                                        ? 'bg-blue-500/30 text-white/50 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg hover:shadow-blue-500/25'
                                }`}
                            >
                                <MagnifyingGlass size={18} weight="bold" />
                                Discover
                            </button>
                        </div>

                        {errorMessage && (
                            <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                <Warning size={18} weight="fill" />
                                {errorMessage}
                            </div>
                        )}
                    </div>
                )}

                {/* Discovering State */}
                {discoveryState === 'discovering' && (
                    <div className="flex-1 flex flex-col items-center justify-center py-16">
                        <CircleNotch size={48} weight="bold" className="text-blue-400 animate-spin mb-4" />
                        <p className="text-textMain font-medium">Discovering pages...</p>
                        <p className="text-sm text-textMuted mt-1">Checking sitemaps and crawling links</p>
                    </div>
                )}

                {/* Crawling State */}
                {discoveryState === 'crawling' && (
                    <div className="flex-1 flex flex-col items-center justify-center py-16">
                        <CircleNotch size={48} weight="bold" className="text-primary animate-spin mb-4" />
                        <p className="text-textMain font-medium">Crawling {selectedUrls.size} pages...</p>
                        <p className="text-sm text-textMuted mt-1">Extracting content from selected pages</p>
                    </div>
                )}

                {/* Pages Selection */}
                {discoveryState === 'discovered' && (
                    <>
                        {/* Search and controls */}
                        <div className="p-4 border-b border-white/5 space-y-3">
                            <div className="relative">
                                <MagnifyingGlass 
                                    size={16} 
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted/50" 
                                />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-textMain placeholder:text-textMuted/40 outline-none focus:border-primary/50 transition-all"
                                />
                            </div>

                            {/* Select All / Domain header */}
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={toggleSelectAll}
                                    className="flex items-center gap-2 text-sm text-textMuted hover:text-textMain transition-colors"
                                >
                                    {isAllSelected ? (
                                        <CheckSquare size={18} weight="fill" className="text-primary" />
                                    ) : isSomeSelected ? (
                                        <MinusSquare size={18} weight="fill" className="text-primary" />
                                    ) : (
                                        <Square size={18} weight="regular" />
                                    )}
                                    Select All ({filteredPages.length})
                                </button>

                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-textMuted">
                                        {sitemapFound ? '✓ Sitemap found' : 'No sitemap, crawled links'}
                                    </span>
                                    
                                    {/* Auto add future toggle */}
                                    <button
                                        onClick={() => setAutoAddFuture(!autoAddFuture)}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                                            autoAddFuture 
                                                ? 'bg-primary/10 text-primary border border-primary/20' 
                                                : 'text-textMuted hover:text-textMain hover:bg-white/5'
                                        }`}
                                    >
                                        <ArrowsClockwise size={14} />
                                        Auto add future page: {autoAddFuture ? 'Yes' : 'No'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Pages List */}
                        <div className="flex-1 overflow-y-auto p-2 min-h-0">
                            {(Object.entries(groupedPages)).map(([domain, group]) => (
                                <div key={domain} className="mb-2">
                                    {/* Domain Header */}
                                    <button
                                        onClick={() => toggleDomainExpansion(domain)}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.03] rounded-lg text-left transition-all"
                                    >
                                        {expandedDomains.has(domain) ? (
                                            <CaretDown size={14} weight="bold" className="text-textMuted" />
                                        ) : (
                                            <CaretRight size={14} weight="bold" className="text-textMuted" />
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Toggle all pages in this domain
                                                const domainUrls = group.pages.map(p => p.url);
                                                const allSelected = domainUrls.every(url => selectedUrls.has(url));
                                                
                                                setSelectedUrls(prev => {
                                                    const newSet = new Set(prev);
                                                    if (allSelected) {
                                                        domainUrls.forEach(url => newSet.delete(url));
                                                    } else {
                                                        domainUrls.forEach(url => newSet.add(url));
                                                    }
                                                    return newSet;
                                                });
                                            }}
                                            className="flex items-center"
                                        >
                                            {group.selectedCount === group.pages.length ? (
                                                <CheckSquare size={16} weight="fill" className="text-primary" />
                                            ) : group.selectedCount > 0 ? (
                                                <MinusSquare size={16} weight="fill" className="text-primary" />
                                            ) : (
                                                <Square size={16} weight="regular" className="text-textMuted" />
                                            )}
                                        </button>
                                        <span className="text-sm font-medium text-textMain ml-1">{domain}</span>
                                        <span className="text-xs text-textMuted">({group.pages.length})</span>
                                    </button>

                                    {/* Pages */}
                                    {expandedDomains.has(domain) && (
                                        <div className="ml-6 space-y-0.5">
                                            {group.pages.map((page) => (
                                                <button
                                                    key={page.url}
                                                    onClick={() => togglePageSelection(page.url)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.03] rounded-lg text-left transition-all group"
                                                >
                                                    {selectedUrls.has(page.url) ? (
                                                        <CheckSquare size={16} weight="fill" className="text-primary flex-shrink-0" />
                                                    ) : (
                                                        <Square size={16} weight="regular" className="text-textMuted group-hover:text-textMain flex-shrink-0" />
                                                    )}
                                                    <span className="text-sm text-textMuted truncate flex-1">
                                                        {page.url.replace(/^https?:\/\/[^\/]+/, '')}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Selection Summary & Actions */}
                        <div className="p-4 border-t border-white/5 bg-surface/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-textMain font-medium">
                                        {selectedUrls.size} items selected
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-textMuted">
                                        <button 
                                            onClick={invertSelection}
                                            className="hover:text-primary transition-colors"
                                        >
                                            Invert Selection
                                        </button>
                                        <span>|</span>
                                        <button 
                                            onClick={clearSelection}
                                            className="hover:text-primary transition-colors"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleClose}
                                        className="px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-textMain hover:bg-white/5 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCrawl}
                                        disabled={selectedUrls.size === 0}
                                        className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                                            selectedUrls.size === 0
                                                ? 'bg-primary/30 text-white/50 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-primary to-primary/80 text-white hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5'
                                        }`}
                                    >
                                        <Check size={18} weight="bold" />
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Idle State Footer */}
                {discoveryState === 'idle' && (
                    <div className="p-6 border-t border-white/5 flex justify-end gap-3">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-textMain hover:bg-white/5 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default AddWebPagesModal;
