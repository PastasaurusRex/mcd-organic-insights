'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';
import { HugeiconsIcon } from '@hugeicons/react';
import { UserGroupIcon } from '@hugeicons/core-free-icons';
import { useData } from '@/lib/data-context';

const PLATFORM_COLORS: Record<string, string> = {
    FACEBOOK: '#1d4ed8',  // blue-700
    INSTAGRAM: '#db2777', // pink-600
    TIKTOK: '#06b6d4',    // cyan-500
    X: '#27272a',         // zinc-800
};

const CSV_PREFIX: Record<Platform, string> = {
    FACEBOOK: 'FB',
    INSTAGRAM: 'IG',
    TIKTOK: 'TT',
    X: 'X',
};

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

interface RawFollowerRow {
    Date: string;
    'FB followers': string;
    'IGEN followers': string;
    'IGFR followers': string;
    'TTEN followers': string;
    'TTFR followers': string;
    'XEN followers': string;
    'XFR followers': string;
    [key: string]: string;
}

type LanguageFilter = 'EN' | 'FR' | 'ALL';
type Platform = 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'X';

export const FollowersChart: React.FC = () => {
    const { filters } = useData();
    const [rawData, setRawData] = useState<RawFollowerRow[]>([]);
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>('FACEBOOK');
    const [languageFilter, setLanguageFilter] = useState<LanguageFilter>('ALL');
    const [isLoading, setIsLoading] = useState(true);

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

            const mappedData: RawFollowerRow[] = allData.map((row) => ({
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
            setRawData(filteredData);
            setIsLoading(false);
        };
        
        loadFollowers().catch(err => {
            console.error('Failed to load followers data:', err);
            setIsLoading(false);
        });
    }, []);

    const isFacebookOnly = selectedPlatform === 'FACEBOOK';

    // Normalize value to 0-100 based on its min/max in the dataset
    const normalize = (value: number, min: number, max: number) => {
        if (max === min) return 50;
        return ((value - min) / (max - min)) * 100;
    };

    const { processedData, bounds } = useMemo(() => {
        if (rawData.length === 0) return { processedData: [], bounds: {} as Record<string, { min: number, max: number }> };

        const platforms = ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'X'] as Platform[];

        // Type for the absolute data row
        type AbsoluteDataRow = { [key in Platform]: number } & { month: string, timestamp: number };

        // First, calculate absolute values for each month/platform based on language filter
        const absoluteData: AbsoluteDataRow[] = rawData.map(row => {
            const date = dayjs(row.Date);
            const vals: Record<string, number | string> = {
                month: date.format('MMM YYYY'),
                timestamp: date.toDate().getTime()
            };

            platforms.forEach(p => {
                if (p === 'FACEBOOK') {
                    vals[p] = parseInt(row['FB followers']) || 0;
                } else {
                    const prefix = CSV_PREFIX[p];
                    const en = parseInt(row[`${prefix}EN followers`]) || 0;
                    const fr = parseInt(row[`${prefix}FR followers`]) || 0;

                    if (languageFilter === 'EN') vals[p] = en;
                    else if (languageFilter === 'FR') vals[p] = fr;
                    else vals[p] = en + fr;
                }
            });

            return vals as AbsoluteDataRow;
        }).sort((a, b) => a.timestamp - b.timestamp);

        // Filter by selected years
        const filteredAbsoluteData = filters.selectedYears.length > 0
            ? absoluteData.filter(d => filters.selectedYears.includes(dayjs(d.timestamp).format('YYYY')))
            : absoluteData;

        // Find min/max for each platform to normalize
        const bounds: Record<string, { min: number, max: number }> = {};
        platforms.forEach(p => {
            const platformValues = filteredAbsoluteData.map(d => d[p]);
            bounds[p] = {
                min: Math.min(...platformValues),
                max: Math.max(...platformValues)
            };
        });

        // Create normalized data and store absolute values for tooltip
        const processed = filteredAbsoluteData.map(d => {
            const normalized: Record<string, number | string> = {
                month: d.month,
                timestamp: d.timestamp
            };
            platforms.forEach(p => {
                const val = d[p];
                normalized[`${p}_norm`] = normalize(val, bounds[p].min, bounds[p].max);
                normalized[`${p}_abs`] = val;
            });
            return normalized;
        });

        return { processedData: processed, bounds };
    }, [rawData, languageFilter, filters.selectedYears]);

    const togglePlatform = (p: Platform) => {
        setSelectedPlatform(p);
    };

    if (isLoading) {
        return (
            <Card className="w-full border-border/50 h-[450px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading trends...</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="w-full border-border/50 animate-in" style={{ animationDelay: '400ms' }}>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2">
                <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <HugeiconsIcon icon={UserGroupIcon} size={20} className="text-primary" />
                        Follower Trends
                    </CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
                        Relative growth comparison across platforms
                    </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Language Toggle */}
                    <div className={`flex bg-muted/50 rounded-lg p-1 border border-border/50 ${isFacebookOnly ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                        {(['ALL', 'EN', 'FR'] as LanguageFilter[]).map(lang => (
                            <Button
                                key={lang}
                                variant={languageFilter === lang ? 'secondary' : 'ghost'}
                                size="sm"
                                className={`h-7 px-3 text-[10px] font-bold uppercase tracking-wider transition-all ${languageFilter === lang ? 'bg-background shadow-sm border border-border/50' : 'text-muted-foreground'}`}
                                onClick={() => setLanguageFilter(lang)}
                            >
                                {lang}
                            </Button>
                        ))}
                    </div>

                    {/* Platform Selection */}
                    <div className="flex bg-muted/50 rounded-lg p-1 border border-border/50">
                        {(['Facebook', 'Instagram', 'TikTok', 'X'] as const).map(p => {
                            const platform = p.toUpperCase() as Platform;
                            const isActive = selectedPlatform === platform;
                            return (
                                <Button
                                    key={p}
                                    variant={isActive ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className={`h-7 px-3 text-[10px] font-bold uppercase transition-all ${isActive ? 'bg-background shadow-sm border border-border/50' : 'text-muted-foreground'}`}
                                    onClick={() => togglePlatform(platform)}
                                >
                                    <div
                                        className="w-1.5 h-1.5 rounded-full mr-1.5"
                                        style={{ backgroundColor: isActive ? PLATFORM_COLORS[platform] : 'transparent', border: !isActive ? '1px solid currentColor' : 'none' }}
                                    />
                                    {p}
                                </Button>
                            );
                        })}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis
                                hide={false}
                                domain={[bounds[selectedPlatform]?.min || 0, bounds[selectedPlatform]?.max || 100]}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                                }}
                                labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                                formatter={(value: number, name: string) => {
                                    const platform = name.split('_')[0];
                                    return [
                                        <span key={name} className="font-bold">{value.toLocaleString()}</span>,
                                        <span key={`${name}-label`} className="uppercase text-[9px] opacity-70 ml-1">{platform}</span>
                                    ];
                                }}
                                labelFormatter={(label) => <span className="font-bold">{label}</span>}
                                // Custom tooltip to show absolute values
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-background border border-border p-3 rounded-xl shadow-xl">
                                                <p className="font-bold text-xs mb-2 border-b border-border pb-1">{label}</p>
                                                <div className="space-y-1.5">
                                                    {payload.map((entry) => {
                                                        const p = String(entry.dataKey).split('_')[0];
                                                        const abs = (entry.payload as Record<string, number>)[`${p}_abs`];
                                                        return (
                                                            <div key={p} className="flex items-center justify-between gap-4">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                                                    <span className="text-[10px] font-bold uppercase tracking-tight opacity-70">{p === 'X' ? 'X' : p.charAt(0) + p.slice(1).toLowerCase()}</span>
                                                                </div>
                                                                <span className="text-[11px] font-bold tabular-nums">{abs.toLocaleString()}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <p className="mt-2 pt-1 border-t border-border text-[8px] uppercase tracking-widest font-bold text-muted-foreground">Follower Count</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey={`${selectedPlatform}_abs`}
                                stroke={PLATFORM_COLORS[selectedPlatform]}
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 0 }}
                                animationDuration={1500}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};
