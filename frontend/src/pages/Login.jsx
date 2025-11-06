import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthApi } from '../lib/api'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function submit() {
    setError('')
    setLoading(true)
    try {
      const { token, user } = await AuthApi.login({ email, password })
      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_user', JSON.stringify(user))
      onLogin?.()
      navigate('/dashboard')
    } catch (e) {
      setError(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] grid place-items-center">
      <div className="w-full max-w-md rounded-2xl ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-emerald-500 shadow-lg shadow-indigo-500/30 flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white"></div>
          </div>
          <span className="font-bold text-2xl bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">EduHub</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Welcome back</h1>
        <div className="grid gap-3">
          <input className="border border-white/10 bg-white/5 rounded px-3 py-2" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" className="border border-white/10 bg-white/5 rounded px-3 py-2" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <div className="text-sm text-red-400">{error}</div>}
          <button className="bg-gradient-to-r from-indigo-500 to-emerald-500 text-white rounded px-4 py-2 disabled:opacity-60" onClick={submit} disabled={loading}>{loading? 'Signing in...' : 'Sign in'}</button>
        </div>
        <p className="text-sm text-slate-400 mt-4">No account? <Link to="/signup" className="text-indigo-300 hover:text-indigo-200">Create one</Link></p>
      </div>
    </div>
  )
}
