'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
    Hash,
    ArrowLeft,
    Save,
    X
} from 'lucide-react';
import { useMetadataStore } from '@/stores/metadataStore';

export default function CreateTopicPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { sources } = useMetadataStore();
    const [formData, setFormData] = useState({
        name: '',
        source_id: '',
        description: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.post('/api/manage/topics/', formData);
            router.push('/topics');
        } catch (err) {
            console.error('Failed to create topic:', err);
            alert('Failed to create topic');
        } finally {
            setIsSubmitting(false);
        }
    };

    const sourceList = Object.values(sources);

    return (
        <div className="space-y-8 max-w-2xl">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-500 hover:text-brand-primary transition-colors mb-4"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Topics
            </button>

            <div className="flex items-center gap-6">
                <div className="p-5 rounded-2xl bg-indigo-50 text-brand-primary">
                    <Hash className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Create New Topic</h1>
                    <p className="text-slate-400">Add a new event classification channel</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-surface-card border border-surface-muted shadow-sm space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Topic Name *</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., push, pull_request, payment.completed"
                        className="w-full p-3 bg-slate-50 rounded-xl border border-surface-muted outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Source *</label>
                    <select
                        required
                        value={formData.source_id}
                        onChange={(e) => setFormData({ ...formData, source_id: e.target.value })}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-surface-muted outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                    >
                        <option value="">Select a source...</option>
                        {sourceList.map((source: any) => (
                            <option key={source.id} value={source.id}>{source.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Description (Optional)</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe this topic..."
                        rows={3}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-surface-muted outline-none focus:ring-2 focus:ring-brand-primary transition-all resize-none"
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
                        <Save className="w-4 h-4" /> {isSubmitting ? 'Creating...' : 'Create Topic'}
                    </button>
                </div>
            </form>
        </div>
    );
}
