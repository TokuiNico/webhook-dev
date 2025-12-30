'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import {
    Database,
    ArrowLeft,
    Shield,
    Clock,
    Trash2,
    Save,
    Hash,
    Activity
} from 'lucide-react';

export default function SourceDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [source, setSource] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Edit state
    const [editData, setEditData] = useState({
        name: '',
        auth_type: '',
        secret: ''
    });

    useEffect(() => {
        const fetchSource = async () => {
            try {
                const response = await axios.get(`/api/manage/sources/${id}`);
                setSource(response.data);
                setEditData({
                    name: response.data.name,
                    auth_type: response.data.auth_type,
                    secret: response.data.secret || ''
                });
            } catch (err) {
                console.error('Failed to fetch source details:', err);
            } finally {
                setIsLoading(false);
            }
        };
        if (id) fetchSource();
    }, [id]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await axios.put(`/api/manage/sources/${id}/`, editData);
            setSource(response.data);
            alert('Changes saved successfully!');
        } catch (err) {
            console.error('Failed to save source:', err);
            alert('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this source? This action cannot be undone.')) return;

        setIsDeleting(true);
        try {
            await axios.delete(`/api/manage/sources/${id}/`);
            router.push('/sources');
        } catch (err) {
            console.error('Failed to delete source:', err);
            alert('Failed to delete source');
            setIsDeleting(false);
        }
    };

    if (isLoading) return <div className="animate-pulse h-96 bg-slate-100 rounded-3xl" />;
    if (!source) return <div className="text-center p-20 text-slate-400">Source not found.</div>;

    return (
        <div className="space-y-8 max-w-4xl">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-500 hover:text-brand-primary transition-colors mb-4"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Sources
            </button>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="p-5 rounded-2xl bg-blue-50 text-blue-500">
                        <Database className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                        <input
                            value={editData.name}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            className="text-3xl font-bold tracking-tight bg-transparent border-none outline-none focus:ring-2 focus:ring-brand-primary rounded-lg px-2 -ml-2 w-full"
                        />
                        <p className="text-slate-400 font-mono text-sm px-1">UUID: {source.id}</p>
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
                        <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <div className="p-8 rounded-2xl bg-surface-card border border-surface-muted shadow-sm space-y-6">
                        <h2 className="text-xl font-bold">Configuration</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Auth Type</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                                        <select
                                            value={editData.auth_type}
                                            onChange={(e) => setEditData({ ...editData, auth_type: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-surface-muted outline-none focus:ring-2 focus:ring-brand-primary transition-all font-semibold uppercase appearance-none"
                                        >
                                            <option value="none">None</option>
                                            <option value="signature">Signature</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Created At</label>
                                    <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-2 border border-dashed border-surface-muted">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        <span className="font-semibold text-slate-500">{new Date(source.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Secret Key / Config</label>
                                <div className="relative">
                                    <textarea
                                        value={editData.secret}
                                        onChange={(e) => setEditData({ ...editData, secret: e.target.value })}
                                        placeholder="Enter secret key or configuration JSON..."
                                        rows={3}
                                        className="w-full p-4 bg-slate-50 rounded-xl border border-surface-muted outline-none focus:ring-2 focus:ring-brand-primary transition-all font-mono text-xs resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-4">
                        <h3 className="font-bold flex items-center gap-2 text-brand-primary">
                            <Hash className="w-4 h-4" /> Quick Links
                        </h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => router.push(`/topics?source=${id}`)}
                                className="w-full text-left p-3 rounded-xl bg-white hover:bg-brand-primary hover:text-white transition-all text-xs font-bold flex items-center justify-between shadow-sm"
                            >
                                Associated Topics
                                <Activity className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
