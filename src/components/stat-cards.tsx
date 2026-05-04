'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '@/lib/data-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CountUp from 'react-countup';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    Note01Icon,
    CursorPointer01Icon,
    Comment01Icon,
    PercentIcon,
    Share01Icon,
    UserGroupIcon,
    Facebook01Icon,
    InstagramIcon,
    TiktokIcon,
    NewTwitterIcon
} from '@hugeicons/core-free-icons';
import dayjs from 'dayjs';

interface FollowerRow {
    Date: string;
    'FB followers': string;
    'IGEN followers': string;
    'IGFR followers': string;
    'TTEN followers': string;
    'TTFR followers': string;
    'XEN followers': string;
    'XFR followers': string;
}

interface FollowerDBRow {
    date: string;
    fb: number;
    ig_en: number;
    ig_fr: number;
    tt_en: number;
    tt_fr: number;
    x_en: number;
    x_fr: number;
}

export const StatCards: React.FC = () => {
    const { stats, filters } = useData();
    const [followerData, setFollowerData] = useState<FollowerRow[]>([]);

    useEffect(() => {
        const loadFollowers = async () => {
            const { supabase } = await import('@/lib/supabase');

            let allData: FollowerDBRow[] = [];
            let from = 0;
            const PAGE_SIZE = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await supabase
                    .from('followers_history')
                    .select('*')
                    .range(from, from + PAGE_SIZE - 1);

                if (error) throw error;
                if (data && data.length > 0) {
                    allData = [...allData, ...(data as FollowerDBRow[])];
                    if (data.length < PAGE_SIZE) hasMore = false;
                    else from += PAGE_SIZE;
                } else {
                    hasMore = false;
                }
            }

            const mappedData: FollowerRow[] = allData.map((row) => ({
                Date: row.date,
                'FB followers': String(row.fb),
                'IGEN followers': String(row.ig_en),
                'IGFR followers': String(row.ig_fr),
                'TTEN followers': String(row.tt_en),
                'TTFR followers': String(row.tt_fr),
                'XEN followers': String(row.x_en),
                'XFR followers': String(row.x_fr),
            }));

            // Exclude December 2024 data
            const filteredData = mappedData.filter(row => {
                const d = dayjs(row.Date);
                return !(d.month() === 11 && d.year() === 2024);
            });
            setFollowerData(filteredData);
        };

        loadFollowers().catch(err => {
            console.error('Failed to load followers data:', err);
        });
    }, []);

    const followerStats = useMemo(() => {
        if (followerData.length === 0) return { value: 0, label: '...', icon: UserGroupIcon };

        // Sort by date ascending so the last element is the most recent
        const sorted = [...followerData].sort((a, b) => dayjs(a.Date).valueOf() - dayjs(b.Date).valueOf());

        // Filter candidates by selected years and months
        let candidates = sorted;
        if (filters.selectedYears.length > 0) {
            candidates = candidates.filter(row => filters.selectedYears.includes(dayjs(row.Date).format('YYYY')));
        }
        if (filters.selectedMonths.length > 0) {
            candidates = candidates.filter(row => filters.selectedMonths.includes(dayjs(row.Date).format('MMMM')));
        }

        // Pick the most recent matching row, or fall back to the most recent overall
        const targetRow = candidates.length > 0 ? candidates[candidates.length - 1] : sorted[sorted.length - 1];

        if (!targetRow) return { value: 0, label: '...', icon: UserGroupIcon };

        const monthLabel = dayjs(targetRow.Date).format('MMMM YYYY');

        // Calculate total based on network filters
        let total = 0;
        const selectedNetworks = filters.networks;
        const noFilter = selectedNetworks.length === 0;

        if (noFilter || selectedNetworks.includes('FACEBOOK')) {
            total += parseInt(targetRow['FB followers']) || 0;
        }
        if (noFilter || selectedNetworks.includes('INSTAGRAM')) {
            total += (parseInt(targetRow['IGEN followers']) || 0) + (parseInt(targetRow['IGFR followers']) || 0);
        }
        if (noFilter || selectedNetworks.includes('TIKTOK')) {
            total += (parseInt(targetRow['TTEN followers']) || 0) + (parseInt(targetRow['TTFR followers']) || 0);
        }
        if (noFilter || selectedNetworks.includes('TWITTER')) {
            total += (parseInt(targetRow['XEN followers']) || 0) + (parseInt(targetRow['XFR followers']) || 0);
        }

        // Determine icon
        let icon = UserGroupIcon;
        if (selectedNetworks.length === 1) {
            if (selectedNetworks[0] === 'FACEBOOK') icon = Facebook01Icon;
            else if (selectedNetworks[0] === 'INSTAGRAM') icon = InstagramIcon;
            else if (selectedNetworks[0] === 'TIKTOK') icon = TiktokIcon;
            else if (selectedNetworks[0] === 'TWITTER') icon = NewTwitterIcon;
        }

        return { value: total, label: `as of ${monthLabel}`, icon };
    }, [followerData, filters.selectedMonths, filters.selectedYears, filters.networks]);

    const cards = [
        {
            title: 'Total Followers',
            value: followerStats.value,
            icon: followerStats.icon,
            color: 'text-primary',
            bg: 'bg-primary/10',
            isPercentage: false,
            subcopy: followerStats.label,
        },
        {
            title: 'Total Posts',
            value: stats.totalPosts,
            icon: Note01Icon,
            color: 'text-primary',
            bg: 'bg-primary/10',
            isPercentage: false,
        },
        {
            title: 'Total Impressions',
            value: stats.totalImpressions,
            icon: CursorPointer01Icon,
            color: 'text-primary',
            bg: 'bg-primary/10',
            isPercentage: false,
        },
        {
            title: 'Total Engagements',
            value: stats.totalEngagements,
            icon: Comment01Icon,
            color: 'text-primary',
            bg: 'bg-primary/10',
            isPercentage: false,
        },
        {
            title: 'Avg. Engagement Rate',
            value: stats.avgEngagementRate,
            icon: PercentIcon,
            color: 'text-primary',
            bg: 'bg-primary/10',
            isPercentage: true,
        },
        {
            title: 'Avg. Share Ratio',
            value: stats.avgShareRatio,
            icon: Share01Icon,
            color: 'text-primary',
            bg: 'bg-primary/10',
            isPercentage: true,
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {cards.map((card, i) => (
                <Card key={card.title} className="card-hover border-border/50 animate-in" style={{ animationDelay: `${i * 100}ms` }}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {card.title}
                        </CardTitle>
                        <div className={`p-2 rounded-lg ${card.bg}`}>
                            <HugeiconsIcon icon={card.icon} size={16} className={card.color} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold tracking-tight">
                            <CountUp
                                end={card.value}
                                duration={2}
                                separator=","
                                decimals={card.isPercentage ? 2 : 0}
                                suffix={card.isPercentage ? '%' : ''}
                            />
                        </div>
                        {card.subcopy && (
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-70">
                                {card.subcopy}
                            </p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
