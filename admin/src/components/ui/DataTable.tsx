import React, { useState } from 'react';
import { 
    CaretUp, 
    CaretDown, 
    CaretLeft, 
    CaretRight,
    MagnifyingGlass,
    Funnel,
    Export,
    ArrowsClockwise
} from '@phosphor-icons/react';

interface Column<T> {
    key: keyof T | string;
    header: string;
    sortable?: boolean;
    width?: string;
    render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    searchable?: boolean;
    searchPlaceholder?: string;
    onSearch?: (query: string) => void;
    onRefresh?: () => void;
    onExport?: () => void;
    emptyMessage?: string;
    emptyIcon?: React.ReactNode;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        onPageChange: (page: number) => void;
    };
    filters?: React.ReactNode;
    actions?: React.ReactNode;
    rowKey?: keyof T;
    onRowClick?: (row: T) => void;
}

function DataTable<T extends Record<string, any>>({
    columns,
    data,
    loading = false,
    searchable = false,
    searchPlaceholder = 'Search...',
    onSearch,
    onRefresh,
    onExport,
    emptyMessage = 'No data found',
    emptyIcon,
    pagination,
    filters,
    actions,
    rowKey = 'id' as keyof T,
    onRowClick,
}: DataTableProps<T>) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const handleSort = (columnKey: string) => {
        if (sortBy === columnKey) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(columnKey);
            setSortOrder('desc');
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        onSearch?.(e.target.value);
    };

    const getValue = (row: T, key: string) => {
        const keys = key.split('.');
        let value: any = row;
        for (const k of keys) {
            value = value?.[k];
        }
        return value;
    };

    const sortedData = React.useMemo(() => {
        if (!sortBy) return data;
        return [...data].sort((a, b) => {
            const aVal = getValue(a, sortBy);
            const bVal = getValue(b, sortBy);
            if (aVal === bVal) return 0;
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;
            const comparison = aVal < bVal ? -1 : 1;
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [data, sortBy, sortOrder]);

    const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;

    return (
        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
            {/* Toolbar */}
            {(searchable || filters || actions || onRefresh || onExport) && (
                <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        {searchable && (
                            <div className="relative max-w-sm flex-1">
                                <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                                <input
                                    type="text"
                                    placeholder={searchPlaceholder}
                                    value={searchQuery}
                                    onChange={handleSearch}
                                    className="w-full pl-10 pr-4 py-2 bg-surface border border-white/10 rounded-xl text-textMain placeholder:text-textMuted/50 focus:outline-none focus:border-primary/50 text-sm"
                                />
                            </div>
                        )}
                        {filters}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {actions}
                        {onExport && (
                            <button
                                onClick={onExport}
                                className="p-2 text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors"
                                title="Export"
                            >
                                <Export size={18} />
                            </button>
                        )}
                        {onRefresh && (
                            <button
                                onClick={onRefresh}
                                className="p-2 text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors"
                                title="Refresh"
                            >
                                <ArrowsClockwise size={18} className={loading ? 'animate-spin' : ''} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            {columns.map((column) => (
                                <th
                                    key={String(column.key)}
                                    className={`text-left px-6 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider ${
                                        column.sortable ? 'cursor-pointer hover:text-textMain transition-colors' : ''
                                    }`}
                                    style={{ width: column.width }}
                                    onClick={() => column.sortable && handleSort(String(column.key))}
                                >
                                    <span className="flex items-center gap-1">
                                        {column.header}
                                        {column.sortable && sortBy === column.key && (
                                            sortOrder === 'asc' ? <CaretUp size={12} /> : <CaretDown size={12} />
                                        )}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            // Loading skeleton
                            Array.from({ length: 5 }).map((_, idx) => (
                                <tr key={idx}>
                                    {columns.map((col, colIdx) => (
                                        <td key={colIdx} className="px-6 py-4">
                                            <div className="h-4 bg-white/5 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        {emptyIcon || (
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                                                <Funnel size={32} className="text-textMuted/50" />
                                            </div>
                                        )}
                                        <p className="text-textMuted">{emptyMessage}</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((row, idx) => (
                                <tr
                                    key={String(row[rowKey]) || idx}
                                    className={`hover:bg-white/[0.02] transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                                    onClick={() => onRowClick?.(row)}
                                >
                                    {columns.map((column) => (
                                        <td key={String(column.key)} className="px-6 py-4">
                                            {column.render
                                                ? column.render(getValue(row, String(column.key)), row)
                                                : getValue(row, String(column.key)) ?? '-'
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.total > 0 && (
                <div className="p-4 border-t border-white/5 flex items-center justify-between">
                    <p className="text-sm text-textMuted">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                        {pagination.total} results
                    </p>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => pagination.onPageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="p-2 text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <CaretLeft size={18} />
                        </button>
                        
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                    pageNum = idx + 1;
                                } else if (pagination.page <= 3) {
                                    pageNum = idx + 1;
                                } else if (pagination.page >= totalPages - 2) {
                                    pageNum = totalPages - 4 + idx;
                                } else {
                                    pageNum = pagination.page - 2 + idx;
                                }
                                
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => pagination.onPageChange(pageNum)}
                                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                            pagination.page === pageNum
                                                ? 'bg-primary/20 text-primary border border-primary/30'
                                                : 'text-textMuted hover:text-textMain hover:bg-white/5'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        
                        <button
                            onClick={() => pagination.onPageChange(pagination.page + 1)}
                            disabled={pagination.page === totalPages}
                            className="p-2 text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <CaretRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DataTable;
