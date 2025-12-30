'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import {
    Rss,
    ArrowLeft,
    Hash,
    Save,
    ExternalLink,
    Zap,
    CheckCircle2,
    Trash2
} from 'lucide-react';
import { useMetadataStore } from '@/stores/metadataStore';

export default function SubscriptionDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [sub, setSub] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { getTopicName } = useMetadataStore();

    // Edit state
    const [editData, setEditData] = useState({
        target_url: ''
    });

    useEffect(() => {
        const fetchSub = async () => {
            try {
                const response = await axios.get(`/api/subscriptions/${id}`);
                setSub(response.data);
                setEditData({ target_url: response.data.target_url });
            } catch (err) {
                console.error('Failed to fetch subscription details:', err);
            } finally {
                setIsLoading(false);
            }
        };
        if (id) fetchSub();
    }, [id]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await axios.put(`/api/subscriptions/${id}`, editData);
            setSub(response.data);
            alert('Subscription updated successfully!');
        } catch (err) {
            console.error('Failed to save subscription:', err);
            alert('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this subscription?')) return;

        setIsDeleting(true);
        try {
            await axios.delete(`/api/subscriptions/${id}`);
            router.push('/subscriptions');
        } catch (err) {
            console.error('Failed to delete subscription:', err);
            alert('Failed to delete subscription');
            setIsDeleting(false);
        }
    };

    if (isLoading) return <div className="animate-pulse h-96 bg-slate-100 rounded-3xl" />;
    if (!sub) return <div className="text-center p-20 text-slate-400">Subscription not found.</div>;

    return (
        <div className="space-y-8 max-w-4xl">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-500 hover:text-brand-primary transition-colors mb-4"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Subscriptions
            </button>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="p-5 rounded-2xl bg-violet-50 text-violet-500">
                        <Rss className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{sub.subscriber_name}</h1>
                        <p className="text-slate-400 font-mono text-sm">SUBS-ID: {sub.id}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting || isSaving}
                        className="px-4 py-2 rounded-xl border border-surface-muted text-red-500 hover:bg-red-50 font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <Trash2 className="w-4 h-4" /> {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || isDeleting}
                        className="px-6 py-2 rounded-xl bg-brand-primary text-white font-bold shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <div className="p-8 rounded-2xl bg-surface-card border border-surface-muted shadow-sm space-y-8">
                        <div className="space-y-4">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Target Endpoint</label>
                            <div className="flex gap-2 relative">
                                <input
                                    value={editData.target_url}
                                    onChange={(e) => setEditData({ ...editData, target_url: e.target.value })}
                                    className="w-full p-4 bg-slate-50 rounded-2xl border border-surface-muted outline-none focus:ring-2 focus:ring-brand-primary font-mono text-sm text-brand-primary"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Listening To</label>
                            <button
                                onClick={() => router.push(`/topics/${sub.topic_id}`)}
                                className="w-full flex items-center justify-between p-4 rounded-2xl bg-indigo-50/30 hover:bg-indigo-50 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <Hash className="w-5 h-5 text-indigo-500" />
                                    <span className="font-bold text-indigo-600 truncate">{getTopicName(sub.topic_id)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">View Topic</span>
                                    <ExternalLink className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="p-8 rounded-2xl bg-brand-primary text-white space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase opacity-60">Status</span>
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-bold">Currently Active</div>
                        <p className="text-xs opacity-80 leading-relaxed">
                            Events matching the specific topic are being forwarded to the target endpoint.
                        </p>
                    </div>

                    <button
                        onClick={() => router.push(`/logs?subscription=${id}`)}
                        className="w-full p-4 rounded-2xl border-2 border-dashed border-surface-muted text-slate-400 hover:text-brand-primary hover:border-brand-primary transition-all flex items-center justify-center gap-2 font-bold text-sm"
                    >
                        <Zap className="w-4 h-4" /> Live Traffic
                    </button>
                </div>
            </div>
        </div>
    );
}
