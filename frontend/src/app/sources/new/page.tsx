'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
    Database,
    ArrowLeft,
    Save,
    X
} from 'lucide-react';

export default function CreateSourcePage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        auth_type: 'none',
        secret: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.post('/api/manage/sources/', formData);
            router.push('/sources');
        } catch (err) {
            console.error('Failed to create source:', err);
            alert('Failed to create source');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 max-w-2xl">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-500 hover:text-brand-primary transition-colors mb-4"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Sources
            </button>

            <div className="flex items-center gap-6">
                <div className="p-5 rounded-2xl bg-blue-50 text-blue-500">
                    <Database className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Create New Source</h1>
                    <p className="text-slate-400">Add a new webhook provider</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-surface-card border border-surface-muted shadow-sm space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Source Name *</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., GitHub, Stripe, Slack"
                        className="w-full p-3 bg-slate-50 rounded-xl border border-surface-muted outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Authentication Type</label>
                    <select
                        value={formData.auth_type}
                        onChange={(e) => setFormData({ ...formData, auth_type: e.target.value })}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-surface-muted outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                    >
                        <option value="none">None</option>
                        <option value="signature">Signature</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Secret Key (Optional)</label>
                    <input
                        type="password"
                        value={formData.secret}
                        onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                        placeholder="Enter secret key for webhook validation"
                        className="w-full p-3 bg-slate-50 rounded-xl border border-surface-muted outline-none focus:ring-2 focus:ring-brand-primary transition-all font-mono"
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
                        <Save className="w-4 h-4" /> {isSubmitting ? 'Creating...' : 'Create Source'}
                    </button>
                </div>
            </form>
        </div>
    );
}
