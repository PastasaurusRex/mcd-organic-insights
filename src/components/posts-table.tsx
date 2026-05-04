'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useData, BOOSTED_POST_IDS } from '@/lib/data-context';
import { Post } from '@/types/post';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    InstagramIcon,
    Facebook01Icon,
    NewTwitterRectangleIcon,
    TiktokIcon,
    Sorting01Icon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    LinkSquare02Icon,
    Cancel01Icon
} from '@hugeicons/core-free-icons';
import dayjs from 'dayjs';

interface SortConfig {
    key: keyof Post;
    direction: 'asc' | 'desc';
}

function percentileRank(data: Post[], columnKey: keyof Post) {
    const sorted = [...data].sort((a, b) => {
        const aVal = a[columnKey];
        const bVal = b[columnKey];
        if (aVal === null) return -1;
        if (bVal === null) return 1;
        return (aVal ?? 0) > (bVal ?? 0) ? 1 : (aVal ?? 0) < (bVal ?? 0) ? -1 : 0;
    });
    const totalRows = sorted.length;
    const rankMap = new Map<string, number>();

    let i = 0;
    while (i < totalRows) {
        let j = i;
        // find the end of the tie group
        while (j < totalRows && sorted[j][columnKey] === sorted[i][columnKey]) {
            j++;
        }
        // average rank for the tie group
        const avgRank = (i + j + 1) / 2; // +1 because ranks are 1-based
        for (let k = i; k < j; k++) {
            rankMap.set(sorted[k].id, avgRank / totalRows);
        }
        i = j;
    }

    return rankMap;
}

export const PostsTable: React.FC = () => {
    const { filteredPosts } = useData();
    const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Reset to page 1 when filters or page size changes
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentPage(1);
    }, [filteredPosts, itemsPerPage]);

    const handleSort = (e: React.MouseEvent, key: keyof Post) => {
        const isShift = e.shiftKey;
        setSortConfigs((prev) => {
            const existingIndex = prev.findIndex(c => c.key === key);
            if (isShift) {
                if (existingIndex >= 0) {
                    const config = prev[existingIndex];
                    if (config.direction === 'desc') {
                        const newConfigs = [...prev];
                        newConfigs[existingIndex] = { ...config, direction: 'asc' };
                        return newConfigs;
                    } else {
                        return prev.filter(c => c.key !== key);
                    }
                } else {
                    return [...prev, { key, direction: 'desc' }];
                }
            } else {
                if (existingIndex >= 0 && prev.length === 1) {
                    return [{ key, direction: prev[0].direction === 'desc' ? 'asc' : 'desc' }];
                }
                return [{ key, direction: 'desc' }];
            }
        });
    };

    // calculate Percentile Ranks when configs change (specifically the keys added/removed)
    const rankMaps = useMemo(() => {
        if (sortConfigs.length <= 1) return new Map();
        const map = new Map<keyof Post, Map<string, number>>();
        for (const config of sortConfigs) {
            // Only numeric columns should theoretically be composite sorted, but this works generally
            map.set(config.key, percentileRank(filteredPosts, config.key));
        }
        return map;
    }, [filteredPosts, sortConfigs]);

    const sortedPosts = useMemo(() => {
        const sortableItems = [...filteredPosts];
        if (sortConfigs.length === 0) return sortableItems;

        if (sortConfigs.length === 1) {
            const config = sortConfigs[0];
            sortableItems.sort((a, b) => {
                const aVal = a[config.key];
                const bVal = b[config.key];

                if (aVal === null) return config.direction === 'asc' ? -1 : 1;
                if (bVal === null) return config.direction === 'asc' ? 1 : -1;

                if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
                return 0;
            });
            return sortableItems;
        }

        // Composite scoring sorting
        sortableItems.sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;

            for (const config of sortConfigs) {
                const rankMap = rankMaps.get(config.key);
                if (rankMap) {
                    const isAsc = config.direction === 'asc';
                    const rA = rankMap.get(a.id) || 0;
                    const rB = rankMap.get(b.id) || 0;
                    scoreA += isAsc ? (1 - rA) : rA;
                    scoreB += isAsc ? (1 - rB) : rB;
                }
            }

            return scoreB - scoreA; // descending by the composite score
        });

        return sortableItems;
    }, [filteredPosts, sortConfigs, rankMaps]);

    const paginatedPosts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedPosts.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedPosts, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedPosts.length / itemsPerPage);

    const getNetworkIcon = (network: string) => {
        switch (network) {
            case 'TIKTOK': return <HugeiconsIcon icon={TiktokIcon} size={20} className="text-[#000000]" />;
            case 'INSTAGRAM': return <HugeiconsIcon icon={InstagramIcon} size={20} className="text-[#E4405F]" />;
            case 'FACEBOOK': return <HugeiconsIcon icon={Facebook01Icon} size={20} className="text-[#1877F2]" />;
            case 'TWITTER': return <HugeiconsIcon icon={NewTwitterRectangleIcon} size={20} className="text-[#1DA1F2]" />;
            default: return null;
        }
    };

    const getSortIcon = (key: keyof Post) => {
        const index = sortConfigs.findIndex(c => c.key === key);
        if (index === -1) return <HugeiconsIcon icon={Sorting01Icon} size={12} className="ml-1 inline opacity-40 duration-200 transition-all" />;
        const config = sortConfigs[index];
        return (
            <span className="inline-flex items-center ml-1 align-middle gap-1 pb-0.5">
                {sortConfigs.length > 1 && (
                    <span className="bg-primary text-primary-foreground rounded-full w-3.5 h-3.5 text-[8px] flex items-center justify-center -mr-0.5 mt-0.5">
                        {index + 1}
                    </span>
                )}
                <HugeiconsIcon icon={Sorting01Icon} size={12} className={`opacity-100 mt-0.5 ${config.direction === 'asc' ? '-scale-y-100' : ''}`} />
            </span>
        );
    };

    return (
        <div className="space-y-6 animate-in" style={{ animationDelay: '800ms' }}>
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-xl font-bold tracking-tight">Content Inventory</h3>
                    <p className="flex items-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">
                        Analysis of individual post performance
                        {sortConfigs.length > 1 && (
                            <Badge variant="secondary" className="ml-2 text-[8px] bg-primary/10 text-primary uppercase h-4 px-1.5 border-none flex items-center gap-1.5 hover:bg-primary/20 transition-colors cursor-default pr-1 pt-0.5">
                                Composite Sort Active
                                <button
                                    onClick={() => setSortConfigs([])}
                                    className="hover:scale-125 transition-transform p-0.5 -mr-0.5 bg-primary/20 rounded-sm hover:bg-primary/40 hover:text-foreground"
                                    title="Clear All Sorting"
                                >
                                    <HugeiconsIcon icon={Cancel01Icon} size={10} />
                                </button>
                            </Badge>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">Show</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(parseInt(v))}>
                        <SelectTrigger className="h-8 w-[130px] text-xs font-bold border-border/50 bg-muted/30">
                            <SelectValue placeholder="Entries" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10 entries</SelectItem>
                            <SelectItem value="25">25 entries</SelectItem>
                            <SelectItem value="50">50 entries</SelectItem>
                            <SelectItem value="100">100 entries</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden text-sm">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-border/40">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40 select-none">
                                <TableHead className="w-[60px] pl-6 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80">Platform</TableHead>
                                <TableHead onClick={(e) => handleSort(e, 'publishedAt')} className="w-[100px] cursor-pointer hover:text-primary transition-colors text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80 whitespace-nowrap">
                                    Date {getSortIcon('publishedAt')}
                                </TableHead>
                                <TableHead className="min-w-[300px] max-w-md text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80">Caption</TableHead>
                                <TableHead className="w-[80px] text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80">URL</TableHead>
                                <TableHead className="w-[90px] text-center text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80">Type</TableHead>
                                <TableHead onClick={(e) => handleSort(e, 'impressions')} className="w-[100px] cursor-pointer hover:text-primary text-right whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80">
                                    Impr. {getSortIcon('impressions')}
                                </TableHead>
                                <TableHead onClick={(e) => handleSort(e, 'engagements')} className="w-[100px] cursor-pointer hover:text-primary text-right whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80">
                                    Eng. {getSortIcon('engagements')}
                                </TableHead>
                                <TableHead onClick={(e) => handleSort(e, 'engagementRate')} className="w-[80px] cursor-pointer hover:text-primary text-right whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80">
                                    ER% {getSortIcon('engagementRate')}
                                </TableHead>
                                <TableHead onClick={(e) => handleSort(e, 'shareRatio')} className="w-[90px] cursor-pointer hover:text-primary text-right whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80 pr-6">
                                    Share% {getSortIcon('shareRatio')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedPosts.length > 0 ? (
                                paginatedPosts.map((post) => {
                                    const isBoosted = BOOSTED_POST_IDS.includes(post.id);
                                    return (
                                        <TableRow
                                            key={post.id}
                                            className={`group transition-colors border-b border-border/30 last:border-0 ${isBoosted ? 'bg-rose-500/10 hover:bg-rose-500/20' : 'hover:bg-muted/10'}`}
                                        >
                                            <TableCell className="pl-6">
                                                {getNetworkIcon(post.network)}
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                                {dayjs(post.publishedAt).format('MMM DD, YYYY')}
                                            </TableCell>
                                            <TableCell className="max-w-[400px]">
                                                <p className="text-sm font-medium leading-relaxed line-clamp-1 group-hover:text-foreground transition-colors overflow-hidden text-ellipsis flex items-center gap-2">
                                                    {isBoosted && (
                                                        <Badge className="bg-rose-500 hover:bg-rose-600 text-white border-none text-[9px] px-1.5 py-0 h-4 font-bold uppercase shrink-0">
                                                            Boosted
                                                        </Badge>
                                                    )}
                                                    {post.text}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                {post.url && (
                                                    <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors inline-block" title="View Source Post">
                                                        <HugeiconsIcon icon={LinkSquare02Icon} size={18} />
                                                    </a>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="text-[9px] px-2 py-0.5 font-bold uppercase tracking-tighter bg-muted/20 border-border/30 text-muted-foreground/70">
                                                    {post.postType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm font-bold tabular-nums text-foreground">
                                                {post.impressions.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm font-bold tabular-nums text-foreground">
                                                {post.engagements.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm font-bold tabular-nums text-foreground">
                                                {(post.engagementRate * 100).toFixed(2)}%
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm font-bold tabular-nums text-foreground pr-6">
                                                {(post.shareRatio * 100).toFixed(2)}%
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">
                                        No posts found matching the current filters.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="flex items-center justify-between pt-2">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Showing {Math.min(paginatedPosts.length + (currentPage - 1) * itemsPerPage, sortedPosts.length)} of {sortedPosts.length} Results • Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="h-8 px-4 font-bold text-[10px] uppercase tracking-widest border-border/50 bg-muted/20 hover:bg-primary hover:text-primary-foreground transition-all shadow-none"
                    >
                        <HugeiconsIcon icon={ArrowLeft01Icon} size={12} className="mr-1.5" /> Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="h-8 px-4 font-bold text-[10px] uppercase tracking-widest border-border/50 bg-muted/20 hover:bg-primary hover:text-primary-foreground transition-all shadow-none"
                    >
                        Next <HugeiconsIcon icon={ArrowRight01Icon} size={12} className="ml-1.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
