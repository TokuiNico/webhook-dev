'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import {
    Rss,
    Plus,
    Settings,
    Hash,
    Activity,
    CheckCircle2,
    XCircle,
    ExternalLink
} from 'lucide-react';
import { useMetadataStore } from '@/stores/metadataStore';

export default function SubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { getTopicName } = useMetadataStore();

    useEffect(() => {
        const fetchSubscriptions = async () => {
            try {
                const response = await axios.get('/api/subscriptions/');
                const data = response.data;
                setSubscriptions(Array.isArray(data) ? data : data.items || []);
            } catch (err) {
                console.error('Failed to fetch subscriptions:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSubscriptions();
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
                    <p className="text-slate-500">Destination targets for topic events.</p>
                </div>
                <Link href="/subscriptions/new" className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-xl font-semibold shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all">
                    <Plus className="w-5 h-5" />
                    Add Subscriber
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {isLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
                    ))
                ) : subscriptions.length === 0 ? (
                    <div className="p-12 text-center bg-surface-card border-2 border-dashed border-surface-muted rounded-2xl text-slate-400">
                        No subscriptions found.
                    </div>
                ) : subscriptions.map((sub) => (
                    <div key={sub.id} className="group p-5 rounded-2xl bg-surface-card border border-surface-muted shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className={`p-4 rounded-xl ${sub.is_active ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                                <Rss className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-bold text-lg">{sub.subscriber_name}</h3>
                                    {sub.is_active ? (
                                        <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase">
                                            <CheckCircle2 className="w-2.5 h-2.5" /> Active
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[10px] bg-slate-500/10 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase">
                                            <XCircle className="w-2.5 h-2.5" /> Paused
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                    <Link
                                        href={`/topics/${sub.topic_id}`}
                                        className="flex items-center gap-1.5 text-brand-primary font-medium hover:underline"
                                    >
                                        <Hash className="w-3.5 h-3.5" />
                                        {getTopicName(sub.topic_id)}
                                    </Link>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-slate-400 font-mono truncate max-w-xs">{sub.target_url}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pr-4">
                            <Link
                                href={`/logs?subscription=${sub.id}`}
                                className="px-4 py-2 rounded-lg bg-slate-50 hover:bg-brand-primary hover:text-white text-xs font-bold transition-all flex items-center gap-2"
                            >
                                <Activity className="w-3.5 h-3.5" />
                                Live Logs
                            </Link>
                            <button className="p-2 rounded-lg border border-surface-muted hover:bg-slate-50 transition-all">
                                <Settings className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
