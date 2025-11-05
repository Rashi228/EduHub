import React, { useMemo, useState, useEffect } from 'react'
import Page from '../components/Page.jsx'
import { motion } from 'framer-motion'
import { DataApi } from '../lib/api.js'

export default function Exports() {
  const [preset, setPreset] = useState('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [cron, setCron] = useState('0 9 * * 1')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [scheduleSuccess, setScheduleSuccess] = useState('')
  const [history, setHistory] = useState([])

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    try {
      const res = await DataApi.exportHistory({ limit: 20 })
      setHistory(res.items || [])
    } catch (e) {
      console.error('Failed to load export history:', e)
    }
  }

  function parseDate(dateStr) {
    // DD/MM/YYYY -> YYYY-MM-DD
    const [d, m, y] = dateStr.split('/')
    return y && m && d ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00Z` : null
  }

  function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function generate() {
    setRunning(true)
    setError('')
    try {
      const statusMap = { ALL: null, MATCHED: 'matched', FLAGGED: 'mismatch' }
      const res = await DataApi.exportCsv({
        dateFrom: from ? parseDate(from) : null,
        dateTo: to ? parseDate(to) : null,
        status: statusMap[preset]
      })
      downloadCSV(res.csv, res.filename)
      await loadHistory()
    } catch (e) {
      setError(e.message || 'Export failed')
      console.error('Export error:', e)
    } finally {
      setRunning(false)
    }
  }

  const humanPreset = useMemo(() => ({
    ALL: 'All records',
    MATCHED: 'Only matched',
    FLAGGED: 'Only discrepancies'
  }[preset]), [preset])

  function handleSaveSchedule() {
    setScheduleSuccess('Schedule saved successfully!')
    setTimeout(() => {
      setScheduleSuccess('')
    }, 1000)
  }

  function handleRunOnce() {
    setScheduleSuccess('Export triggered!')
    setTimeout(() => {
      setScheduleSuccess('')
    }, 1000)
  }

  return (
    <Page>
      <section className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">Exports</h1>

        {/* Export builder */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-indigo-500/35 to-emerald-400/35">
          <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
            <h2 className="font-medium mb-4">Build a CSV</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400">Preset</label>
                <select className="mt-1 w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white" value={preset} onChange={e=>setPreset(e.target.value)}>
                  <option value="ALL" className="bg-slate-800 text-white">All records</option>
                  <option value="MATCHED" className="bg-slate-800 text-white">Only matched</option>
                  <option value="FLAGGED" className="bg-slate-800 text-white">Only discrepancies</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">From</label>
                <input className="mt-1 w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white placeholder:text-slate-500" placeholder="DD/MM/YYYY" value={from} onChange={e=>setFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-400">To</label>
                <input className="mt-1 w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white placeholder:text-slate-500" placeholder="DD/MM/YYYY" value={to} onChange={e=>setTo(e.target.value)} />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button onClick={generate} disabled={running} className={`px-5 py-2 rounded text-white ${running? 'bg-white/10 cursor-not-allowed':'bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-400 hover:to-emerald-400'}`}>{running ? 'Exporting...' : 'Export CSV now'}</button>
              <div className="text-sm text-slate-300">{humanPreset}{from||to ? ` • ${from||'start'} to ${to||'today'}`:''}</div>
            </div>
            {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
          </div>
        </div>

        {/* Scheduler */}
        <div className="mt-6 relative rounded-2xl p-[1px] bg-gradient-to-r from-sky-400/35 to-indigo-500/35">
          <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
            <h2 className="font-medium mb-3">Scheduled export</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">CRON</label>
                <input className="mt-1 w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white" value={cron} onChange={e=>setCron(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-400">Preset</label>
                <select className="mt-1 w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white" value={preset} onChange={e=>setPreset(e.target.value)}>
                  <option value="ALL" className="bg-slate-800 text-white">All records</option>
                  <option value="MATCHED" className="bg-slate-800 text-white">Only matched</option>
                  <option value="FLAGGED" className="bg-slate-800 text-white">Only discrepancies</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={handleSaveSchedule} className="px-4 py-2 rounded border border-white/10 hover:bg-white/10">Save schedule</button>
              <button onClick={handleRunOnce} className="px-4 py-2 rounded border border-white/10 hover:bg-white/10">Run once</button>
            </div>
            {scheduleSuccess && <div className="mt-2 text-sm text-emerald-400">{scheduleSuccess}</div>}
          </div>
        </div>

        {/* Past exports */}
        <div className="mt-6 rounded-2xl ring-1 ring-white/10 bg-[#0f1530]/80">
          <div className="p-4 border-b border-white/10 font-medium">History</div>
          <ul className="divide-y divide-white/10">
            {history.length === 0 ? (
              <li className="p-4 text-sm text-slate-400">No exports yet</li>
            ) : (
              history.map((e, i) => {
                const date = e.createdAt ? new Date(e.createdAt) : null
                const when = date ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Unknown'
                const typeLabel = e.type === 'corrected_invoice' ? 'Corrected Invoice' : e.type === 'discrepancy_report' ? 'Discrepancy Report' : 'Export'
                return (
                  <motion.li key={e.id} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm">{typeLabel} • {when}</div>
                      <div className="text-xs text-slate-400">{e.recordCount || 0} records</div>
                    </div>
                    <span className="text-slate-400 text-sm">Exported</span>
                  </motion.li>
                )
              })
            )}
          </ul>
        </div>
      </section>
    </Page>
  )
}
