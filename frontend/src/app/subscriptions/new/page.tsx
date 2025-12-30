'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
    Rss,
    ArrowLeft,
    Save,
    X
} from 'lucide-react';
import { useMetadataStore } from '@/stores/metadataStore';

export default function CreateSubscriptionPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { topics } = useMetadataStore();
    const [formData, setFormData] = useState({
        subscriber_name: '',
        topic_id: '',
        target_url: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.post('/api/subscriptions/', formData);
            router.push('/subscriptions');
        } catch (err) {
            console.error('Failed to create subscription:', err);
            alert('Failed to create subscription');
        } finally {
            setIsSubmitting(false);
        }
    };

    const topicList = Object.values(topics);

    return (
        <div className="space-y-8 max-w-2xl">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-500 hover:text-brand-primary transition-colors mb-4"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Subscriptions
            </button>

            <div className="flex items-center gap-6">
                <div className="p-5 rounded-2xl bg-violet-50 text-violet-500">
                    <Rss className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Create New Subscription</h1>
                    <p className="text-slate-400">Subscribe to events and forward to a target URL</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-surface-card border border-surface-muted shadow-sm space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Subscriber Name *</label>
                    <input
                        type="text"
                        required
                        value={formData.subscriber_name}
                        onChange={(e) => setFormData({ ...formData, subscriber_name: e.target.value })}
                        placeholder="e.g., My Backend Service, Slack Notifier"
                        className="w-full p-3 bg-slate-50 rounded-xl border border-surface-muted outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Topic *</label>
                    <select
                        required
                        value={formData.topic_id}
                        onChange={(e) => setFormData({ ...formData, topic_id: e.target.value })}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-surface-muted outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                    >
                        <option value="">Select a topic...</option>
                        {topicList.map((topic: any) => (
                            <option key={topic.id} value={topic.id}>{topic.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Target URL *</label>
                    <input
                        type="url"
                        required
                        value={formData.target_url}
                        onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                        placeholder="https://your-service.com/webhook"
                        className="w-full p-3 bg-slate-50 rounded-xl border border-surface-muted outline-none focus:ring-2 focus:ring-brand-primary transition-all font-mono text-sm"
                    />
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex-1 py-3 rounded-xl border border-surface-muted text-slate-500 font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                    >
                        <X className="w-4 h-4" /> Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-3 rounded-xl bg-brand-primary text-white font-bold shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" /> {isSubmitting ? 'Creating...' : 'Create Subscription'}
                    </button>
                </div>
            </form>
        </div>
    );
}
