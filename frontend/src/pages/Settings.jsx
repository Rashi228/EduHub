import React, { useState, useEffect } from 'react'
import Page from '../components/Page.jsx'
import { EduHubApi } from '../lib/api.js'

export default function Settings() {
  const [amountPct, setAmountPct] = useState('0.5')
  const [amountAbs, setAmountAbs] = useState('25')
  const [dateDays, setDateDays] = useState('7')
  const [currency, setCurrency] = useState('INR')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      const settings = await EduHubApi.getSettings()
      if (settings.reconciliationTolerances) {
        setAmountPct(settings.reconciliationTolerances.amountPct || '0.5')
        setAmountAbs(settings.reconciliationTolerances.amountAbs || '25')
        setDateDays(settings.reconciliationTolerances.dateDays || '7')
      }
      if (settings.preferences) {
        setCurrency(settings.preferences.currency || 'INR')
        setDateFormat(settings.preferences.dateFormat || 'DD/MM/YYYY')
        setCompanyName(settings.preferences.companyName || '')
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveTolerances() {
    try {
      setSaving(true)
      const current = await EduHubApi.getSettings()
      await EduHubApi.updateSettings({
        ...current,
        reconciliationTolerances: {
          amountPct,
          amountAbs,
          dateDays
        }
      })
      alert('Tolerances saved successfully!')
    } catch (error) {
      console.error('Failed to save tolerances:', error)
      alert('Failed to save tolerances. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function savePreferences() {
    try {
      setSaving(true)
      const current = await EduHubApi.getSettings()
      await EduHubApi.updateSettings({
        ...current,
        preferences: {
          currency,
          dateFormat,
          companyName
        }
      })
      alert('Preferences saved successfully!')
    } catch (error) {
      console.error('Failed to save preferences:', error)
      alert('Failed to save preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page>
      <section className="max-w-6xl mx-auto px-4 py-8 grid gap-6">
        <h1 className="text-2xl font-semibold">Settings</h1>

        {/* Reconciliation tolerances */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-indigo-500/35 to-emerald-400/35">
          <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
            <h2 className="font-medium mb-4">Reconciliation tolerances</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <input className="bg-white/5 border border-white/10 rounded px-3 py-2" placeholder="Amount %" value={amountPct} onChange={e=>setAmountPct(e.target.value)} />
              <input className="bg-white/5 border border-white/10 rounded px-3 py-2" placeholder="Amount Abs" value={amountAbs} onChange={e=>setAmountAbs(e.target.value)} />
              <input className="bg-white/5 border border-white/10 rounded px-3 py-2" placeholder="Date days" value={dateDays} onChange={e=>setDateDays(e.target.value)} />
            </div>
            <button 
              onClick={saveTolerances}
              disabled={saving || loading}
              className="mt-4 px-4 py-2 rounded text-white bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save tolerances'}
            </button>
          </div>
        </div>

        {/* Preferences */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-sky-400/35 to-indigo-500/35">
          <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
            <h2 className="font-medium mb-4">Preferences</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <select className="bg-white/5 border border-white/10 rounded px-3 py-2" value={currency} onChange={e=>setCurrency(e.target.value)}>
                <option>INR</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
              <select className="bg-white/5 border border-white/10 rounded px-3 py-2" value={dateFormat} onChange={e=>setDateFormat(e.target.value)}>
                <option>DD/MM/YYYY</option>
                <option>MM/DD/YYYY</option>
                <option>YYYY-MM-DD</option>
              </select>
              <input 
                className="bg-white/5 border border-white/10 rounded px-3 py-2" 
                placeholder="Company name (optional)" 
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
            </div>
            <button 
              onClick={savePreferences}
              disabled={saving || loading}
              className="mt-4 px-4 py-2 rounded border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save preferences'}
            </button>
          </div>
        </div>

        {/* Email Integration */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-emerald-400/35 to-sky-400/35">
          <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
            <h2 className="font-medium mb-2">Email integration</h2>
            <p className="text-slate-300 mb-4 text-sm">Connect your email to sync tasks and deadlines automatically.</p>
            <div className="flex flex-wrap gap-2">
              <button className="px-4 py-2 rounded text-white bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-400 hover:to-emerald-400">Connect Gmail</button>
              <button className="px-4 py-2 rounded border border-white/10 hover:bg-white/10">Test fetch</button>
            </div>
          </div>
        </div>
      </section>
    </Page>
  )
}
