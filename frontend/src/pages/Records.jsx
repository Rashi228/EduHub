import React, { useEffect, useState } from 'react'
import Page from '../components/Page.jsx'
import { DataApi } from '../lib/api'

function Status({ s }) {
  const map = {
    matched: 'bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30',
    mismatch: 'bg-orange-400/15 text-orange-300 ring-1 ring-orange-400/30',
    partial: 'bg-yellow-400/15 text-yellow-300 ring-1 ring-yellow-400/30'
  }
  return <span className={`px-2 py-1 rounded text-xs ${map[s] || 'bg-white/10 text-slate-300'}`}>{s || '—'}</span>
}

export default function Records() {
  const [filter, setFilter] = useState('ALL')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await DataApi.records({ limit: 50 })
      setRows(r.items || [])
    } catch (e) {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function normalizeStatus(s) {
    if (!s) return ''
    const u = String(s).toUpperCase()
    if (u === 'MISMATCHED') return 'MISMATCH'
    return u
  }

  const visible = rows.filter(r => {
    if (filter === 'ALL') return true
    return normalizeStatus(r.status) === filter
  })

  return (
    <Page>
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Records</h1>
          <button onClick={load} className="px-3 py-1.5 rounded border border-white/10 hover:bg-white/10 text-sm">Refresh</button>
        </div>
        <div className="mb-4 flex gap-2">
          {['ALL','MATCHED','MISMATCH','PARTIAL'].map(f => (
            <button key={f} className={`px-3 py-1 rounded border border-white/10 ${filter===f?'bg-white/10 text-white':'bg-slate-900/60 text-slate-300'}`} onClick={()=>setFilter(f)}>{f}</button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-xl ring-1 ring-white/10 bg-slate-900/60">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/80 text-slate-300">
              <tr>
                <th className="text-left p-3">Vendor</th>
                <th className="text-left p-3">Invoice No</th>
                <th className="text-left p-3">Order ID</th>
                <th className="text-left p-3">Amount</th>
                <th className="text-left p-3">Invoice Date</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">{loading ? 'Loading…' : 'No records found yet. Try Verify, then click Refresh.'}</td>
                </tr>
              )}
              {visible.map(r => (
                <tr key={r.id} className="border-t border-white/10 hover:bg-white/5 transition">
                  <td className="p-3">{r.vendor || '—'}</td>
                  <td className="p-3">{r.invoiceNo || '—'}</td>
                  <td className="p-3">{r.orderId || '—'}</td>
                  <td className="p-3">{r.amount != null ? `₹${Number(r.amount).toFixed(2)}` : '—'}</td>
                  <td className="p-3">{r.invoiceDate || '—'}</td>
                  <td className="p-3"><Status s={r.status} /></td>
                  <td className="p-3">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Page>
  )
}
