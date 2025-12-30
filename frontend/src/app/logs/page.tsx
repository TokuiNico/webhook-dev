'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    ChevronDown,
    ChevronRight,
    Terminal,
    Search,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Clock,
    Info
} from 'lucide-react';
import { useMetadataStore } from '@/stores/metadataStore';

export default function LogsPage() {
    const [eventLogs, setEventLogs] = useState<any[]>([]);
    const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
    const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const { getTopicName, getSubscriptionName } = useMetadataStore();

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/api/logs/hierarchical/?limit=50');
            setEventLogs(response.data.items || []);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const toggleEvent = async (eventId: string) => {
        const newExpanded = new Set(expandedEvents);
        if (newExpanded.has(eventId)) {
            newExpanded.delete(eventId);
        } else {
            newExpanded.add(eventId);
            const eventIndex = eventLogs.findIndex(e => e.id === eventId);
            if (eventIndex !== -1 && (!eventLogs[eventIndex].dispatches || eventLogs[eventIndex].dispatches.length === 0)) {
                try {
                    const res = await axios.get(`/api/logs/dispatches/?event_log_id=${eventId}`);
                    const updatedLogs = [...eventLogs];
                    updatedLogs[eventIndex].dispatches = res.data.items || [];
                    setEventLogs(updatedLogs);
                } catch (err) {
                    console.error('Failed to fetch dispatches:', err);
                }
            }
        }
        setExpandedEvents(newExpanded);
    };

    const toggleDetail = (id: string) => {
        const newExpanded = new Set(expandedDetails);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedDetails(newExpanded);
    };

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
            case 'received': return <Clock className="w-4 h-4 text-blue-500" />;
            default: return <Info className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Activity Logs</h1>
                    <p className="text-slate-500">Real-time event and dispatch monitoring.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search payloads..."
                            className="pl-10 pr-4 py-2 rounded-xl border border-surface-muted bg-surface-card focus:ring-2 focus:ring-brand-primary outline-none transition-all w-64 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="p-2.5 rounded-xl border border-surface-muted bg-surface-card hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-surface-muted bg-surface-card overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <th className="px-6 py-4 w-10"></th>
                            <th className="px-6 py-4">Timestamp</th>
                            <th className="px-6 py-4">Topic</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Dispatches</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-surface-muted">
                        {eventLogs.length === 0 && !isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                    No logs found.
                                </td>
                            </tr>
                        ) : eventLogs.map((event) => (
                            <React.Fragment key={event.id}>
                                <tr
                                    className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${expandedEvents.has(event.id) ? 'bg-slate-50/80 font-medium' : ''}`}
                                    onClick={() => toggleEvent(event.id)}
                                >
                                    <td className="px-6 py-4">
                                        {expandedEvents.has(event.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {format(new Date(event.received_at), 'MM/dd HH:mm:ss')}
                                    </td>
                                    <td className="px-6 py-4 truncate max-w-[200px]">
                                        <span className="bg-indigo-50 text-brand-primary px-2 py-1 rounded text-xs font-semibold">
                                            {getTopicName(event.topic_id)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(event.status)}
                                            <span className="capitalize">{event.status.toLowerCase()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right pr-12 font-mono text-xs opacity-60">
                                        {event.dispatch_count || 0}
                                    </td>
                                </tr>

                                {expandedEvents.has(event.id) && (
                                    <tr>
                                        <td colSpan={5} className="bg-slate-50/30 p-0">
                                            <div className="px-16 py-6 space-y-4">
                                                <div className="rounded-xl border border-dashed border-surface-muted p-4 bg-surface-card/50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Incoming Payload</span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleDetail(event.id); }}
                                                            className="text-xs text-brand-primary hover:underline"
                                                        >
                                                            {expandedDetails.has(event.id) ? 'Collapse' : 'Expand Raw'}
                                                        </button>
                                                    </div>
                                                    <div className={`text-xs font-mono p-2 bg-slate-100 rounded overflow-hidden transition-all ${expandedDetails.has(event.id) ? 'max-h-[1000px]' : 'max-h-20'}`}>
                                                        <pre className="whitespace-pre-wrap">{event.payload}</pre>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fan-out Dispatches</h4>
                                                    {event.dispatches?.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {event.dispatches.map((dispatch: any) => (
                                                                <div key={dispatch.id} className="group rounded-xl border border-surface-muted bg-surface-card p-3 shadow-sm hover:shadow-md transition-all">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="p-2 rounded-lg bg-slate-50">
                                                                                <Terminal className="w-4 h-4 text-slate-400" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-semibold text-xs">
                                                                                    {getSubscriptionName(dispatch.subscription_id)}
                                                                                </p>
                                                                                <p className="text-[10px] opacity-50">
                                                                                    {format(new Date(dispatch.dispatched_at), 'HH:mm:ss')} • ID: {dispatch.id}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-6">
                                                                            <div className="flex flex-col items-end">
                                                                                <span className={`text-xs font-bold ${dispatch.status === 'SUCCESS' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                                    {dispatch.response_status_code || '---'}
                                                                                </span>
                                                                                <span className="text-[10px] tracking-tighter uppercase opacity-50">{dispatch.status}</span>
                                                                            </div>
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); toggleDetail(dispatch.id); }}
                                                                                className="p-1.5 rounded-lg hover:bg-slate-100 transition-all"
                                                                            >
                                                                                <ChevronDown className={`w-4 h-4 transition-transform ${expandedDetails.has(dispatch.id) ? 'rotate-180' : ''}`} />
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {expandedDetails.has(dispatch.id) && (
                                                                        <div className="mt-3 pt-3 border-t border-surface-muted animate-fade-in">
                                                                            <div className="space-y-2">
                                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Response Body</span>
                                                                                <pre className="text-xs font-mono p-3 bg-slate-100 rounded overflow-auto max-h-64 whitespace-pre-wrap">
                                                                                    {dispatch.response_body || 'Empty response'}
                                                                                </pre>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="py-4 text-center text-slate-400 italic text-xs">
                                                            {isLoading ? 'Loading dispatches...' : 'No dispatches recorded.'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
