'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Upload01Icon, LockKeyIcon, CheckmarkCircle01Icon, Alert01Icon, Delete01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

interface FollowerCSVRow {
    Date: string;
    'FB followers': string;
    'IGEN followers': string;
    'IGFR followers': string;
    'TTEN followers': string;
    'TTFR followers': string;
    'XEN followers': string;
    'XFR followers': string;
}

interface PostCSVRow {
    'Post ID': string;
    'Network': string;
    'Published time (America/Toronto)': string;
    'Post Type': string;
    'Placement': string;
    'Post text': string;
    'Post URL': string;
    'Impressions': string;
    'Reach': string;
    'Engagement rate avg.': string;
    'Shares': string;
    'Share Ratio': string;
    'Engagements': string;
    'French?': string;
    [key: string]: string;
}

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');

    const [followersStatus, setFollowersStatus] = useState<{ loading: boolean; success?: string; error?: string }>({ loading: false });
    const [postsStatus, setPostsStatus] = useState<{ loading: boolean; success?: string; error?: string }>({ loading: false });
    const [wipeStatus, setWipeStatus] = useState<{ loading: boolean; success?: string; error?: string }>({ loading: false });

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setAuthError('');
        const res = await fetch('/api/auth', {
            method: 'POST',
            body: JSON.stringify({ password }),
            headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
            setIsAuthenticated(true);
        } else {
            setAuthError('Invalid password');
        }
    }

    const parseNumber = (val: string): number => {
        if (!val || val === '-') return 0;
        const parsed = parseFloat(val.replace(/,/g, '').replace('%', ''));
        return isNaN(parsed) ? 0 : parsed;
    };
    
    // Normalize percentages to 0-1 range to handle CSV "%" symbol if we were doing it,
    // though the DB can store 0.04 or 4. `parseNumber` just returns float.
    const parsePercentage = (val: string): number => {
        if (!val) return 0;
        const parsed = parseFloat(val.replace('%', ''));
        return isNaN(parsed) ? 0 : parsed / 100;
    };

    const [followersDragging, setFollowersDragging] = useState(false);
    const [postsDragging, setPostsDragging] = useState(false);
 
    const handleFollowersUpload = (file?: File) => {
        if (!file) return;
        setFollowersStatus({ loading: true, error: undefined, success: undefined });
 
        Papa.parse<FollowerCSVRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const mappedData = results.data.map((row) => ({
                        date: row.Date,
                        fb: parseNumber(row['FB followers']),
                        ig_en: parseNumber(row['IGEN followers']),
                        ig_fr: parseNumber(row['IGFR followers']),
                        tt_en: parseNumber(row['TTEN followers']),
                        tt_fr: parseNumber(row['TTFR followers']),
                        x_en: parseNumber(row['XEN followers']),
                        x_fr: parseNumber(row['XFR followers']),
                    }));
 
                    const uniqueData = Array.from(
                        mappedData
                            .filter(item => item.date && String(item.date).trim() !== '')
                            .reduce((map, item) => {
                                map.set(item.date, item);
                                return map;
                            }, new Map<string, { date: string; fb: number; ig_en: number; ig_fr: number; tt_en: number; tt_fr: number; x_en: number; x_fr: number }>())
                            .values()
                    );
 
                    const res = await fetch('/api/ingest', {
                        method: 'POST',
                        body: JSON.stringify({ type: 'followers', data: uniqueData }),
                        headers: { 'Content-Type': 'application/json' },
                    });
 
                    if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
                    setFollowersStatus({ loading: false, success: `Imported ${mappedData.length} records!` });
                } catch (err) {
                    setFollowersStatus({ loading: false, error: err instanceof Error ? err.message : 'Upload failed' });
                }
            },
            error: (err) => setFollowersStatus({ loading: false, error: err.message })
        });
    };
 
    const handlePostsUpload = (file?: File) => {
        if (!file) return;
        setPostsStatus({ loading: true, error: undefined, success: undefined });
 
        Papa.parse<PostCSVRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const mappedData = results.data.map((row) => {
                        const tags: string[] = [];
                        for (let i = 1; i <= 19; i++) {
                            const labelValue = row[`Label ${i}`];
                            if (labelValue && labelValue.trim()) {
                                tags.push(labelValue.trim());
                            }
                        }
 
                        return {
                            id: row['Post ID'],
                            network: row['Network'],
                            published_at: row['Published time (America/Toronto)'],
                            post_type: row['Post Type'],
                            placement: row['Placement'],
                            text: row['Post text'] || '',
                            url: row['Post URL'] || '',
                            impressions: parseNumber(row['Impressions']),
                            reach: row['Reach'] === '-' ? null : parseNumber(row['Reach']),
                            engagement_rate: parsePercentage(row['Engagement rate avg.']),
                            shares: parseNumber(row['Shares']),
                            share_ratio: parsePercentage(row['Share Ratio']),
                            engagements: parseNumber(row['Engagements']),
                            language: row['French?'] === 'FR' ? 'FR' : 'EN',
                            tags: tags,
                        };
                    });
 
                    const uniqueData = Array.from(
                        mappedData
                            .filter(item => item.id && String(item.id).trim() !== '')
                            .reduce((map, item) => {
                                map.set(item.id, item);
                                return map;
                            }, new Map<string, { id: string; network: string; published_at: string; post_type: string; placement: string; text: string; url: string; impressions: number; reach: number | null; engagement_rate: number; shares: number; share_ratio: number; engagements: number; language: string; tags: string[] }>())
                            .values()
                    );
 
                    const res = await fetch('/api/ingest', {
                        method: 'POST',
                        body: JSON.stringify({ type: 'posts', data: uniqueData }),
                        headers: { 'Content-Type': 'application/json' },
                    });
 
                    if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
                    setPostsStatus({ loading: false, success: `Imported ${mappedData.length} posts!` });
                } catch (err) {
                    setPostsStatus({ loading: false, error: err instanceof Error ? err.message : 'Upload failed' });
                }
            },
            error: (err) => setPostsStatus({ loading: false, error: err.message })
        });
    };
 
    function handleDragOver(e: React.DragEvent, type: 'followers' | 'posts') {
        e.preventDefault();
        if (type === 'followers') setFollowersDragging(true);
        else setPostsDragging(true);
    }
 
    function handleDragLeave(e: React.DragEvent, type: 'followers' | 'posts') {
        e.preventDefault();
        if (type === 'followers') setFollowersDragging(false);
        else setPostsDragging(false);
    }
 
    function handleDrop(e: React.DragEvent, type: 'followers' | 'posts') {
        e.preventDefault();
        setFollowersDragging(false);
        setPostsDragging(false);
        
        const file = e.dataTransfer.files?.[0];
        if (type === 'followers') handleFollowersUpload(file);
        else handlePostsUpload(file);
    }

    async function handleWipeDatabase() {
        if (!window.confirm('Are you absolutely sure you want to wipe the entire database? This action is permanent and cannot be undone.')) {
            return;
        }

        setWipeStatus({ loading: true, error: undefined, success: undefined });

        try {
            const res = await fetch('/api/ingest', { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to wipe database');

            setWipeStatus({ loading: false, success: 'Database wiped successfully!' });
            setFollowersStatus({ loading: false });
            setPostsStatus({ loading: false });
        } catch (err) {
            setWipeStatus({ loading: false, error: err instanceof Error ? err.message : 'Wipe failed' });
        }
    }

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Card className="w-[400px]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HugeiconsIcon icon={LockKeyIcon} size={24} /> Admin Access
                        </CardTitle>
                        <CardDescription>Enter the admin password to upload data.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="flex flex-col gap-4">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="px-3 py-2 border rounded-md"
                                placeholder="Password"
                            />
                            {authError && <p className="text-sm text-red-500 font-medium">{authError}</p>}
                            <Button type="submit">Unlock Data Admin</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-background">
            <div className="max-w-4xl w-full space-y-12">
                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tight">Data Ingestion Controller</h1>
                    <p className="text-muted-foreground mt-4 text-lg">Upload your latest CSVs to synchronize data to Supabase.</p>
                </div>
 
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Followers Upload */}
                    <Card className={`border-border/50 shadow-lg transition-all duration-300 ${followersDragging ? 'ring-2 ring-primary ring-offset-4 ring-offset-background' : ''}`}>
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="text-xl">Followers Data</CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">mcd-followers.csv</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 flex flex-col items-center">
                            <label 
                                className={`w-full h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group ${followersDragging ? 'border-primary bg-primary/5' : 'border-border/80 hover:bg-muted/50'}`}
                                onDragOver={(e) => handleDragOver(e, 'followers')}
                                onDragLeave={(e) => handleDragLeave(e, 'followers')}
                                onDrop={(e) => handleDrop(e, 'followers')}
                            >
                                <HugeiconsIcon icon={Upload01Icon} size={40} className={`transition-colors mb-4 ${followersDragging ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-primary'}`} />
                                <span className={`font-bold text-xs uppercase tracking-[0.2em] transition-colors ${followersDragging ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`}>
                                    {followersDragging ? 'Drop File Here' : 'Select or Drop File'}
                                </span>
                                <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFollowersUpload(e.target.files?.[0])} disabled={followersStatus.loading} />
                            </label>
                            
                            <div className="h-8 flex items-center justify-center">
                                {followersStatus.loading && <p className="text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse">Processing...</p>}
                                {followersStatus.success && <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-2"><HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} /> {followersStatus.success}</p>}
                                {followersStatus.error && <p className="text-[11px] font-bold text-rose-600 flex items-center gap-2"><HugeiconsIcon icon={Alert01Icon} size={14} /> {followersStatus.error}</p>}
                            </div>
                        </CardContent>
                    </Card>
 
                    {/* Posts Upload */}
                    <Card className={`border-border/50 shadow-lg transition-all duration-300 ${postsDragging ? 'ring-2 ring-primary ring-offset-4 ring-offset-background' : ''}`}>
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="text-xl">Posts Data</CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">mcd-data.csv</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 flex flex-col items-center">
                            <label 
                                className={`w-full h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group ${postsDragging ? 'border-primary bg-primary/5' : 'border-border/80 hover:bg-muted/50'}`}
                                onDragOver={(e) => handleDragOver(e, 'posts')}
                                onDragLeave={(e) => handleDragLeave(e, 'posts')}
                                onDrop={(e) => handleDrop(e, 'posts')}
                            >
                                <HugeiconsIcon icon={Upload01Icon} size={40} className={`transition-colors mb-4 ${postsDragging ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-primary'}`} />
                                <span className={`font-bold text-xs uppercase tracking-[0.2em] transition-colors ${postsDragging ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`}>
                                    {postsDragging ? 'Drop File Here' : 'Select or Drop File'}
                                </span>
                                <input type="file" accept=".csv" className="hidden" onChange={(e) => handlePostsUpload(e.target.files?.[0])} disabled={postsStatus.loading} />
                            </label>
                            
                            <div className="h-8 flex items-center justify-center">
                                {postsStatus.loading && <p className="text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse">Processing...</p>}
                                {postsStatus.success && <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-2"><HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} /> {postsStatus.success}</p>}
                                {postsStatus.error && <p className="text-[11px] font-bold text-rose-600 flex items-center gap-2"><HugeiconsIcon icon={Alert01Icon} size={14} /> {postsStatus.error}</p>}
                            </div>
                        </CardContent>
                    </Card>
                </div>
 
                <div className="flex justify-center pt-4">
                    <Link href="/" className="group flex items-center gap-3 bg-foreground text-background px-8 py-4 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] hover:scale-105 hover:shadow-2xl transition-all">
                        Return to Dashboard
                        <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {/* Danger Zone */}
                <div className="pt-8 border-t border-border/40">
                    <Card className="border-rose-200/50 bg-rose-50/10">
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="text-rose-600 text-lg flex items-center justify-center gap-2">
                                <HugeiconsIcon icon={Delete01Icon} size={20} /> Danger Zone
                            </CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-rose-500/70">Wipe all synchronized data</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4">
                            <p className="text-[11px] text-muted-foreground text-center max-w-sm">
                                Use this action to clear all existing posts and follower history from Supabase. 
                                Recommended before performing a full re-ingest of corrected data.
                            </p>
                            <Button 
                                variant="destructive" 
                                onClick={handleWipeDatabase} 
                                disabled={wipeStatus.loading}
                                className="h-10 px-8 font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all"
                            >
                                {wipeStatus.loading ? 'Wiping Database...' : 'Wipe Database Now'}
                            </Button>
                            {wipeStatus.success && <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{wipeStatus.success}</p>}
                            {wipeStatus.error && <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">{wipeStatus.error}</p>}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
