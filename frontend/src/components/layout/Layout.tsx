'use client';

import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { useMetadataStore } from '@/stores/metadataStore';

export function Layout({ children }: { children: React.ReactNode }) {
    const fetchMetadata = useMetadataStore((state) => state.fetchMetadata);

    useEffect(() => {
        fetchMetadata();
    }, [fetchMetadata]);

    return (
        <div className="flex min-h-screen bg-surface-bg text-foreground">
            <Sidebar />
            <main className="flex-1 overflow-auto">
                <header className="h-16 border-b border-surface-muted flex items-center px-8 glass sticky top-0 z-10">
                    <div className="flex-1" />
                    <div className="flex items-center gap-4 text-sm font-medium">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span>API Online</span>
                        </div>
                    </div>
                </header>
                <div className="p-8 max-w-7xl mx-auto animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
}
