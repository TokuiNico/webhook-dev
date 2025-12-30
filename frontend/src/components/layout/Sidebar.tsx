'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Database,
    Hash,
    Rss,
    Terminal,
    Activity,
    ChevronRight
} from 'lucide-react';

const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { name: 'Sources', icon: Database, href: '/sources' },
    { name: 'Topics', icon: Hash, href: '/topics' },
    { name: 'Subscriptions', icon: Rss, href: '/subscriptions' },
    { name: 'Logs', icon: Terminal, href: '/logs' },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="w-64 border-r border-surface-muted h-screen flex flex-col glass sticky top-0 bg-white">
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
                        <Activity className="w-6 h-6" />
                    </div>
                    <h1 className="font-bold text-xl tracking-tight text-slate-900">Webhook Dev</h1>
                </div>
            </div>

            <nav className="flex-1 px-4 py-2 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                ? 'bg-brand-primary text-white shadow-md'
                                : 'hover:bg-brand-primary/5 text-slate-600'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-primary'}`} />
                                <span className="font-medium">{item.name}</span>
                            </div>
                            {isActive && <ChevronRight className="w-4 h-4" />}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-surface-muted">
                <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                        DEV
                    </div>
                    <div className="text-xs truncate">
                        <p className="font-semibold text-slate-700">Local Node</p>
                        <p className="text-slate-400">v1.0.0-dev</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

