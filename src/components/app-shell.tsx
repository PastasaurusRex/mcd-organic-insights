'use client';

import React from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { X } from '@phosphor-icons/react/dist/ssr/X';
import { GithubLogo } from '@phosphor-icons/react/dist/ssr/GithubLogo';
import { useData } from '@/lib/data-context';
import { Input } from '@/components/ui/input';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { filters, setFilters } = useData();

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-20 border-b border-border flex items-center px-8 bg-background/80 backdrop-blur-md sticky top-0 z-40">
                    {/* Left: Logo */}
                    <div className="flex-1 flex justify-start">
                        <div className="flex items-center gap-2">
                            <svg className="w-9 h-9 shrink-0 shadow-sm" viewBox="0 0 4539.1587 4539.1772" xmlns="http://www.w3.org/2000/svg">
                                <path d="m1413.23 1.49423s-1411.76944 0-1411.76944 1411.77577v13474.93s0 1411.8 1411.76944 1411.8h13474.97s1411.7 0 1411.7-1411.8v-13474.93s0-1411.77577-1411.7-1411.77577z" fill="#c50005" transform="matrix(.2785026597 0 0 -.2785026597 -.40677 4539.5934)" />
                                <path d="m12681.3 15031.6c1108.9 0 2013.6-4669.3 2013.6-10440.27l1605.1-.07c0 6208.84-1619.7 11242.94-3618.7 11242.94-1130.9 0-2145-1510.2-2808.93-3874.1-663.92 2363.9-1670.73 3874.1-2808.89 3874.1-1991.76 0-3611.42-5034.1-3611.42-11242.85l1605.08-.07c0 5771.02 897.38 10440.32 2006.34 10440.32 1108.98 0 2006.35-4311.8 2006.35-9637.71l1605.07-.07c0 5325.98 904.7 9637.78 2006.4 9637.78z" fill="#ffc423" transform="matrix(.22610532768 0 0 -.22610532768 -.40677 4539.5934)" />
                                <path d="m14965 13164.7-86.8 10.8 10.9 282.2s10.8 141.1-152 141.1c-173.6 0-575.2 0-575.2 0l173.6 303.9-716.3 455.8 325.6 10.9-141.1 390.7 412.4-65.1 10.9 314.7 390.7-455.8-184.5 944.2 336.5-162.8 195.3 531.8 195.4-531.8 336.5 162.8-184.5-944.2 390.7 455.8 10.8-314.7 390.7 65.1-119.3-390.7 314.7-10.9-705.5-455.8 173.7-303.9s-369 0-575.3 0c-195.3 0-162.7-141.1-162.7-141.1l21.7-282.2z" fill="#ee3025" transform="matrix(.14959466293 0 0 -.14959466293 -.40677 4539.5934)" />
                            </svg>
                            <h1 className="text-xl font-bold tracking-tight hidden lg:block">Analytics</h1>
                        </div>
                    </div>

                    {/* Center: Search */}
                    <div className="flex-[2] flex justify-center max-w-2xl px-4">
                        <div className="w-full relative group">
                            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-all group-focus-within:text-primary group-focus-within:scale-110" />
                            <Input
                                placeholder="Search campaigns, content, tags..."
                                className="pl-12 pr-12 h-11 bg-secondary/40 border-border/60 hover:border-border focus:bg-background focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all text-base rounded-xl shadow-sm"
                                value={filters.searchQuery}
                                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                            />
                            {filters.searchQuery && (
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:scale-110 transition-all p-1"
                                    aria-label="Clear search"
                                >
                                    <X className="w-4 h-4" weight="bold" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right: Title + GitHub */}
                    <div className="flex-1 flex items-center justify-end gap-4">
                        <div className="text-[12px] font-bold uppercase tracking-[0.2em] text-foreground transition-colors cursor-default">
                            2025 Organic Insights | Cossette × McDonald's
                        </div>
                        <a
                            href="https://github.com/parthshahanand/mcd-organic-insights"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-foreground text-background hover:scale-105 hover:shadow-lg transition-all"
                            aria-label="View source on GitHub"
                        >
                            <GithubLogo weight="fill" className="w-5 h-5" />
                        </a>
                    </div>
                </header>
                <div className="p-8 pb-16 max-w-[1600px] mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
};
