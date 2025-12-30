'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import {
    Hash,
    ArrowLeft,
    Database,
    Save,
    Trash2,
    ExternalLink,
    Code,
    Send,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { useMetadataStore } from '@/stores/metadataStore';

export default function TopicDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [topic, setTopic] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const { getSourceName } = useMetadataStore();

    // Edit state
    const [editData, setEditData] = useState({
        name: ''
    });

    // Test webhook payload
    const [testPayload, setTestPayload] = useState('{\n  "event": "test",\n  "message": "Hello from test webhook!",\n  "timestamp": "' + new Date().toISOString() + '"\n}');

    useEffect(() => {
        const fetchTopic = async () => {
            try {
                const response = await axios.get(`/api/manage/topics/${id}`);
                setTopic(response.data);
                setEditData({ name: response.data.name });
            } catch (err) {
                console.error('Failed to fetch topic details:', err);
            } finally {
                setIsLoading(false);
            }
        };
        if (id) fetchTopic();
    }, [id]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await axios.put(`/api/manage/topics/${id}`, editData);
            setTopic(response.data);
            alert('Topic updated successfully!');
        } catch (err) {
            console.error('Failed to save topic:', err);
            alert('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this topic? This action cannot be undone.')) return;

        setIsDeleting(true);
        try {
            await axios.delete(`/api/manage/topics/${id}`);
            router.push('/topics');
        } catch (err) {
            console.error('Failed to delete topic:', err);
            alert('Failed to delete topic');
            setIsDeleting(false);
        }
    };

    const handleSendTestWebhook = async () => {
        setIsSendingTest(true);
        setTestResult(null);
        try {
            let payload;
            try {
                payload = JSON.parse(testPayload);
            } catch {
                setTestResult({ success: false, message: 'Invalid JSON payload' });
                setIsSendingTest(false);
                return;
            }

            const response = await axios.post(`/api/ingest/${id}`, payload);
            setTestResult({
                success: true,
                message: `Webhook sent successfully! Status: ${response.status}`
            });
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.response?.data?.detail || err.message || 'Failed to send test webhook'
            });
        } finally {
            setIsSendingTest(false);
        }
    };

    if (isLoading) return <div className="animate-pulse h-96 bg-slate-100 rounded-3xl" />;
    if (!topic) return <div className="text-center p-20 text-slate-400">Topic not found.</div>;

    return (
        <div className="space-y-8 max-w-4xl">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-500 hover:text-brand-primary transition-colors mb-4"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Topics
            </button>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="p-5 rounded-2xl bg-indigo-50 text-brand-primary">
                        <Hash className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                        <input
                            value={editData.name}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            className="text-3xl font-bold tracking-tight bg-transparent border-none outline-none focus:ring-2 focus:ring-brand-primary rounded-lg px-2 -ml-2 w-full text-slate-900"
                        />
                        <p className="text-slate-400 font-mono text-sm px-1">ID: {topic.id}</p>
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
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Ingest URL</label>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={topic.ingest_url || ''}
                                    className="flex-1 p-3 bg-slate-50 rounded-xl font-mono text-sm border-none outline-none focus:ring-2 focus:ring-brand-primary text-slate-700"
                                />
                                <button
                                    onClick={() => navigator.clipboard.writeText(topic.ingest_url)}
                                    className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all active:scale-95"
                                >
                                    <Code className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Parent Source</label>
                            <button
                                onClick={() => router.push(`/sources/${topic.source_id}`)}
                                className="w-full flex items-center justify-between p-4 rounded-2xl bg-blue-50/30 hover:bg-blue-50 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <Database className="w-5 h-5 text-blue-500" />
                                    <span className="font-bold text-blue-600">{getSourceName(topic.source_id)}</span>
                                </div>
                                <ExternalLink className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
                            </button>
                        </div>
                    </div>

                    {/* Test Webhook Section */}
                    <div className="p-8 rounded-2xl bg-surface-card border border-surface-muted shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">Test Webhook</h2>
                            <button
                                onClick={handleSendTestWebhook}
                                disabled={isSendingTest}
                                className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" /> {isSendingTest ? 'Sending...' : 'Send Test'}
                            </button>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">JSON Payload</label>
                            <textarea
                                value={testPayload}
                                onChange={(e) => setTestPayload(e.target.value)}
                                rows={6}
                                className="w-full p-4 bg-slate-50 rounded-xl font-mono text-sm border border-surface-muted outline-none focus:ring-2 focus:ring-brand-primary text-slate-700 resize-none"
                            />
                        </div>
                        {testResult && (
                            <div className={`flex items-center gap-3 p-4 rounded-xl ${testResult.success ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                {testResult.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                <span className="font-medium">{testResult.message}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 rounded-2xl bg-surface-card border border-surface-muted shadow-sm space-y-6">
                    <h2 className="text-xl font-bold text-slate-900">Metadata</h2>
                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Created At</span>
                            <span className="font-medium text-right text-slate-700">{new Date(topic.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

