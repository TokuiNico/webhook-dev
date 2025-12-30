'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import {
    Hash,
    Plus,
    ExternalLink,
    Database,
    Search,
    ArrowRight,
    Settings
} from 'lucide-react';
import { useMetadataStore } from '@/stores/metadataStore';

export default function TopicsPage() {
    const [topics, setTopics] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { getSourceName } = useMetadataStore();

    useEffect(() => {
        const fetchTopics = async () => {
            try {
                const response = await axios.get('/api/manage/topics/');
                const data = response.data;
                setTopics(Array.isArray(data) ? data : data.items || []);
            } catch (err) {
                console.error('Failed to fetch topics:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTopics();
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Topics</h1>
                    <p className="text-slate-500">Event classification and distribution channels.</p>
                </div>
                <Link href="/topics/new" className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-xl font-semibold shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all">
                    <Plus className="w-5 h-5" />
                    Create Topic
                </Link>
            </div>

            <div className="rounded-2xl border border-surface-muted bg-surface-card overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <th className="px-6 py-4">Topic Name</th>
                            <th className="px-6 py-4">Origin Source</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-surface-muted">
                        {isLoading ? (
                            [1, 2, 3, 4].map(i => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={4} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                                </tr>
                            ))
                        ) : topics.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No topics found.</td>
                            </tr>
                        ) : topics.map((topic) => (
                            <tr key={topic.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4 font-bold text-brand-primary">
                                    {topic.name}
                                </td>
                                <td className="px-6 py-4">
                                    <Link
                                        href={`/sources/${topic.source_id}`}
                                        className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all font-medium text-xs"
                                    >
                                        <Database className="w-3 h-3" />
                                        {getSourceName(topic.source_id)}
                                    </Link>
                                </td>
                                <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                                    {topic.description || <span className="opacity-30">No description</span>}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <Link
                                            href={`/subscriptions?topic=${topic.id}`}
                                            className="p-2 rounded-lg hover:bg-violet-50 text-violet-600 transition-all"
                                            title="View Subscriptions"
                                        >
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                        <Link
                                            href={`/topics/${topic.id}`}
                                            className="p-2 rounded-lg hover:bg-slate-100 transition-all"
                                            title="Topic Settings"
                                        >
                                            <Settings className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
