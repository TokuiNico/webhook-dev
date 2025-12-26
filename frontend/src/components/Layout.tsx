import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard,
  BarChart2,
  Database,
  Hash,
  Radio,
  ScrollText,
  LogOut,
  Menu,
  Zap
} from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

interface NavigationItem {
  name: string
  href: string
  icon: ReactNode
}

const navigation: NavigationItem[] = [
  { name: '儀表板', href: '/', icon: <LayoutDashboard size={20} /> },
  { name: '統計分析', href: '/stats', icon: <BarChart2 size={20} /> },
  { name: '來源管理', href: '/sources', icon: <Database size={20} /> },
  { name: '主題管理', href: '/topics', icon: <Hash size={20} /> },
  { name: '訂閱管理', href: '/subscriptions', icon: <Radio size={20} /> },
  { name: '日誌檢視', href: '/logs', icon: <ScrollText size={20} /> }
]

export const Layout = ({ children }: LayoutProps) => {
  const { logout } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 fixed inset-y-0 z-20">
        <div className="flex items-center h-20 px-8 border-b border-slate-100">
          <div className="flex items-center gap-3 text-primary-600">
            <Zap size={28} className="fill-current" />
            <span className="text-xl font-bold tracking-tight text-slate-900">Webhook Gateway</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive
                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <span className={`${isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                  {item.icon}
                </span>
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-slate-50">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">管理員</p>
              <p className="text-xs text-slate-500 truncate">admin@example.com</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span>登出系統</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Zap className="text-primary-600" size={24} />
            <span className="font-bold text-slate-900">Webhook Gateway</span>
          </div>
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
            <Menu size={24} />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
