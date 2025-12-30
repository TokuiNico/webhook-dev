'use client';

import React from 'react';
import Link from 'next/link';
import {
  Database,
  Hash,
  Rss,
  Terminal,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { name: 'Sources', icon: Database, count: '...', href: '/sources', color: 'bg-blue-500' },
    { name: 'Topics', icon: Hash, count: '...', href: '/topics', color: 'bg-indigo-500' },
    { name: 'Subscriptions', icon: Rss, count: '...', href: '/subscriptions', color: 'bg-violet-500' },
    { name: 'Logs (Recent)', icon: Terminal, count: '...', href: '/logs', color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-slate-500">Welcome back. Everything seems to be running smoothly.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href} className="group">
            <div className="p-6 rounded-2xl bg-surface-card shadow-sm border border-surface-muted transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.color} text-white`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-2xl font-bold">{stat.count}</div>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{stat.name}</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-8 rounded-2xl bg-brand-primary text-white space-y-4 shadow-2xl shadow-brand-primary/20">
          <div className="p-3 rounded-xl bg-white/20 w-fit">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold">Secure Webhook Proxy</h2>
          <p className="opacity-80">
            Validated signatures and unified endpoints. Your backend services are protected from raw exposure.
          </p>
          <button className="px-6 py-2.5 bg-white text-brand-primary rounded-xl font-bold hover:bg-white/90 transition-all">
            Configure Auth
          </button>
        </div>

        <div className="p-8 rounded-2xl border-2 border-dashed border-surface-muted flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-3 rounded-xl bg-slate-100 w-fit">
            <Zap className="w-8 h-8 text-brand-secondary" />
          </div>
          <h2 className="text-2xl font-bold italic text-slate-400">Real-time charts coming soon</h2>
          <p className="text-slate-400 max-w-xs">
            We're building an integrated analytics engine to track your webhook traffic in real-time.
          </p>
        </div>
      </div>
    </div>
  );
}
