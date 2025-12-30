import { create } from 'zustand';
import axios from 'axios';

interface Entity {
    id: string;
    name: string;
    [key: string]: any;
}

interface MetadataState {
    sources: Record<string, Entity>;
    topics: Record<string, Entity>;
    subscriptions: Record<string, Entity>;
    isLoading: boolean;
    error: string | null;

    fetchMetadata: () => Promise<void>;
    getSourceName: (id: string) => string;
    getTopicName: (id: string) => string;
    getSubscriptionName: (id: string) => string;
}

export const useMetadataStore = create<MetadataState>((set, get) => ({
    sources: {},
    topics: {},
    subscriptions: {},
    isLoading: false,
    error: null,

    fetchMetadata: async () => {
        set({ isLoading: true });
        try {
            const headers = {};

            const [sourcesRes, topicsRes, subsRes] = await Promise.all([
                axios.get('/api/manage/sources', { headers }),
                axios.get('/api/manage/topics', { headers }),
                axios.get('/api/subscriptions', { headers }),
            ]);

            const sourcesList = Array.isArray(sourcesRes.data) ? sourcesRes.data : sourcesRes.data.items || [];
            const topicsList = Array.isArray(topicsRes.data) ? topicsRes.data : topicsRes.data.items || [];
            const subsList = Array.isArray(subsRes.data) ? subsRes.data : subsRes.data.items || [];

            const sourcesMap = sourcesList.reduce((acc: any, item: any) => {
                acc[item.id] = item;
                return acc;
            }, {});

            const topicsMap = topicsList.reduce((acc: any, item: any) => {
                acc[item.id] = item;
                return acc;
            }, {});

            const subsMap = subsList.reduce((acc: any, item: any) => {
                acc[item.id] = item;
                acc[item.id].name = item.subscriber_name; // Use subscriber_name as name
                return acc;
            }, {});

            set({
                sources: sourcesMap,
                topics: topicsMap,
                subscriptions: subsMap,
                isLoading: false
            });
        } catch (err: any) {
            console.error('Failed to fetch metadata:', err);
            set({ error: err.message, isLoading: false });
        }
    },

    getSourceName: (id: string) => get().sources[id]?.name || id,
    getTopicName: (id: string) => get().topics[id]?.name || id,
    getSubscriptionName: (id: string) => get().subscriptions[id]?.name || id,
}));
