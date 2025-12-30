'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import {
    Database,
    Plus,
    Settings,
    Clock,
    ExternalLink,
    Shield,
    Activity
} from 'lucide-react';
import { useMetadataStore } from '@/stores/metadataStore';

export default function SourcesPage() {
    const [sources, setSources] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSources = async () => {
            try {
                const response = await axios.get('/api/manage/sources/');
                const data = response.data;
                setSources(Array.isArray(data) ? data : data.items || []);
            } catch (err) {
                console.error('Failed to fetch sources:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSources();
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sources</h1>
                    <p className="text-slate-500">Manage your incoming webhook providers.</p>
                </div>
                <Link href="/sources/new" className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-xl font-semibold shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all">
                    <Plus className="w-5 h-5" />
                    Add Source
                </Link>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sources.map((source) => (
                        <div key={source.id} className="group relative p-6 rounded-2xl bg-surface-card border border-surface-muted shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">

                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 rounded-xl bg-blue-50 text-blue-500">
                                    <Database className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{source.name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Shield className="w-3 h-3" />
                                        <span className="uppercase">{source.auth_type}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Created {new Date(source.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-1/3" />
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    <span>Topic Coverage</span>
                                    <span>Active</span>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center gap-2">
                                <Link href={`/sources/${source.id}`} className="flex-1 py-2 rounded-lg border border-surface-muted text-xs font-semibold hover:bg-slate-50 transition-all text-center">
                                    Settings
                                </Link>
                                <Link href={`/topics?source=${source.id}`} className="flex-1 py-2 rounded-lg bg-slate-50 text-xs font-semibold hover:bg-brand-primary hover:text-white text-center transition-all">
                                    View Topics
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
