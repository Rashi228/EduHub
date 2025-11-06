import React, { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { EduHubApi } from '../lib/api.js'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/resources', label: 'Resources', icon: '📚' },
  { to: '/streak', label: 'Streak', icon: '🔥' },
  { to: '/tech-skills', label: 'Tech Skills', icon: '🚀' },
  { to: '/focus-time', label: 'Focus Time', icon: '⏱️' },
  { to: '/todos', label: 'Todos', icon: '✅' },
  { to: '/chatbot', label: 'Chatbot', icon: '💬' },
  // Opportunities removed
  { to: '/mood', label: 'Mood', icon: '😊' },
  { to: '/medication', label: 'Medication', icon: '💊' },
  { to: '/settings', label: 'Settings', icon: '⚙️' }
]

export default function Shell({ children }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [streak, setStreak] = useState({ current: 0, longest: 0 })
  const [focusActive, setFocusActive] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    loadStreak()
  }, [])

  async function loadStreak() {
    try {
      const data = await EduHubApi.getStreak()
      setStreak(data)
    } catch (error) {
      console.error('Failed to load streak:', error)
    }
  }

  async function handleFocusClick() {
    try {
      const result = await EduHubApi.startFocus()
      setFocusActive(true)
      localStorage.setItem('focusSessionId', result.sessionId)
      navigate('/focus-time')
    } catch (error) {
      console.error('Failed to start focus:', error)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0b1020]">
      {/* Left Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0f1530]/95 backdrop-blur-lg border-r border-white/10 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-white/10">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="relative h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center transition-all">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="font-bold text-lg tracking-tight text-blue-400">EduHub</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {nav.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'text-blue-300 bg-blue-600/20 border border-blue-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`
                }
              >
                <span className="text-xl">{n.icon}</span>
                <span className="text-sm font-medium">{n.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <p className="text-xs text-slate-400 text-center">© 2025 EduHub</p>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 border-b border-slate-700 bg-slate-800">
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              className="lg:hidden p-2 rounded-lg bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition"
              onClick={() => setSidebarOpen(v => !v)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex-1" />
            
            {/* Right side: Focus button and Streak counter */}
            <div className="flex items-center gap-3">
              {/* Focus Activation Button */}
              <button
                onClick={handleFocusClick}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  focusActive
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white border border-slate-600'
                }`}
                title="Start Focus Session"
              >
                <span className="text-lg">🎯</span>
                <span className="text-sm font-medium hidden sm:inline">Focus</span>
              </button>

              {/* Streak Counter */}
              <Link
                to="/streak"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600/20 border border-orange-500/30 hover:bg-orange-600/30 transition-all"
                title="View Streak Details"
              >
                <span className="text-xl">🔥</span>
                <span className="text-sm font-bold text-orange-300">{streak.current}</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
