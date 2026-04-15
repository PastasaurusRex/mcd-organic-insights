'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Post, Filters, DashboardStats, Network, PostType, Language } from '@/types/post';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';

interface DataContextType {
    posts: Post[];
    filteredPosts: Post[];
    filters: Filters;
    setFilters: React.Dispatch<React.SetStateAction<Filters>>;
    stats: DashboardStats;
    allTags: string[];
    allYears: string[];
    allPlacements: string[];
    isLoading: boolean;
    error: string | null;
}

interface PostDBRow {
    id: string;
    network: string;
    published_at: string;
    post_type: string;
    placement: string;
    text: string;
    url: string;
    impressions: number;
    reach: number | null;
    engagement_rate: number;
    shares: number;
    share_ratio: number;
    engagements: number;
    language: string;
    tags: string[] | null;
}

export const BOOSTED_POST_IDS = ['7490691524334816517'];

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<Filters>({
        networks: [],
        postTypes: [],
        placements: [],
        selectedMonths: [],
        selectedYears: [],
        tags: [],
        language: 'ALL',
        searchQuery: '',
        dateRange: undefined,
    });

    useEffect(() => {
        const loadPosts = async () => {
            let allData: PostDBRow[] = [];
            let from = 0;
            const PAGE_SIZE = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await supabase
                    .from('posts')
                    .select('*')
                    .range(from, from + PAGE_SIZE - 1);
                
                if (error) throw error;
                if (data && data.length > 0) {
                    allData = [...allData, ...(data as PostDBRow[])];
                    if (data.length < PAGE_SIZE) hasMore = false;
                    else from += PAGE_SIZE;
                } else {
                    hasMore = false;
                }
            }
            
            const formattedData = allData.map((row): Post => ({
                id: row.id,
                network: row.network as Network,
                publishedAt: dayjs(row.published_at).toDate(),
                postType: row.post_type as PostType,
                placement: row.placement,
                text: row.text,
                url: row.url,
                impressions: Number(row.impressions),
                reach: row.reach !== null ? Number(row.reach) : null,
                engagementRate: Number(row.engagement_rate),
                shares: Number(row.shares),
                shareRatio: Number(row.share_ratio),
                engagements: Number(row.engagements),
                language: row.language as Language,
                tags: row.tags || []
            }));
            
            setPosts(formattedData);
            setIsLoading(false);
        };

        loadPosts().catch((err) => {
            setError(err.message || 'Failed to load social media data');
            setIsLoading(false);
        });
    }, []);

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        posts.forEach((post) => post.tags.forEach((tag) => tags.add(tag)));
        return Array.from(tags).sort();
    }, [posts]);

    const allYears = useMemo(() => {
        const years = new Set<string>();
        posts.forEach((post) => {
            const year = dayjs(post.publishedAt).format('YYYY');
            years.add(year);
        });
        return Array.from(years).sort((a, b) => b.localeCompare(a)); // Descending order
    }, [posts]);

    const allPlacements = useMemo(() => {
        const placements = new Set<string>();
        posts.forEach((post) => {
            if (post.placement) placements.add(post.placement);
        });
        return Array.from(placements).sort();
    }, [posts]);

    const filteredPosts = useMemo(() => {
        return posts.filter((post) => {
            if (filters.networks.length > 0 && !filters.networks.includes(post.network)) return false;
            if (filters.postTypes.length > 0 && !filters.postTypes.includes(post.postType)) return false;
            if (filters.placements.length > 0 && !filters.placements.includes(post.placement)) return false;
            if (filters.tags.length > 0 && !filters.tags.some((tag) => post.tags.includes(tag))) return false;
            if (filters.language !== 'ALL' && post.language !== filters.language) return false;

            if (filters.selectedMonths.length > 0) {
                const postMonth = dayjs(post.publishedAt).format('MMMM');
                if (!filters.selectedMonths.includes(postMonth)) return false;
            }

            if (filters.selectedYears.length > 0) {
                const postYear = dayjs(post.publishedAt).format('YYYY');
                if (!filters.selectedYears.includes(postYear)) return false;
            }

            if (filters.dateRange?.from) {
                const postDate = dayjs(post.publishedAt);
                const from = dayjs(filters.dateRange.from).startOf('day');
                if (postDate.isBefore(from)) return false;

                if (filters.dateRange.to) {
                    const to = dayjs(filters.dateRange.to).endOf('day');
                    if (postDate.isAfter(to)) return false;
                }
            }

            if (filters.searchQuery) {
                const q = filters.searchQuery.toLowerCase();
                const match =
                    post.text.toLowerCase().includes(q) ||
                    post.network.toLowerCase().includes(q) ||
                    post.tags.some(t => t.toLowerCase().includes(q));
                if (!match) return false;
            }

            return true;
        });
    }, [posts, filters]);

    const stats = useMemo<DashboardStats>(() => {
        const totalPosts = filteredPosts.length;
        const totalImpressions = filteredPosts.reduce((acc, post) => acc + post.impressions, 0);
        const totalEngagements = filteredPosts.reduce((acc, post) => acc + post.engagements, 0);
        const totalShares = filteredPosts.reduce((acc, post) => acc + post.shares, 0);

        const avgEngagementRate = totalImpressions > 0 ? (totalEngagements * 100) / totalImpressions : 0;
        const avgShareRatio = totalEngagements > 0 ? (totalShares * 100) / totalEngagements : 0;

        return {
            totalPosts,
            totalImpressions,
            totalEngagements,
            avgEngagementRate,
            avgShareRatio,
        };
    }, [filteredPosts]);

    return (
        <DataContext.Provider
            value={{
                posts,
                filteredPosts,
                filters,
                setFilters,
                stats,
                allTags,
                allYears,
                allPlacements,
                isLoading,
                error,
            }}
        >
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
