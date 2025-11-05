import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Page from '../components/Page.jsx'
import { DataApi } from '../lib/api'

function Table({ title, header, rows, footer }) {
  return (
    <div className="rounded-2xl ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
      <h2 className="font-semibold mb-3">{title}</h2>
      <div className="overflow-x-auto rounded-xl ring-1 ring-white/10 bg-slate-900/60">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-slate-300">
            <tr>
              {header.map(h => <th key={h} className="text-left p-3">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={header.length} className="p-4 text-slate-400">No items extracted</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-white/10">
                {r.map((c, j) => <td key={j} className="p-3">{c ?? '—'}</td>)}
              </tr>
            ))}
          </tbody>
          {footer && (
            <tfoot>
              <tr className="border-t border-white/10">
                <td colSpan={header.length-1} className="p-3 text-right font-medium">Total</td>
                <td className="p-3 font-semibold">{footer}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

export default function Review() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const r = await DataApi.record(id)
        setData(r)
      } catch (e) {
        setError(e.message || 'Failed to load record')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const po = data?.po || {}
  const inv = data?.invoice || {}

  const poHeader = ['Item detail','Qty','Unit price','Subtotal']
  const poRows = (po.items || []).map(it => [it.item_detail, it.qty, it.unit_price, it.subtotal])
  const poTotal = po.total_price ?? po.total ?? null

  const invHeader = ['Item detail','Qty','Unit price','Subtotal']
  const invRows = (inv.items || []).map(it => [it.item_detail, it.qty, it.unit_price, it.subtotal])
  const invTotal = inv.total_price ?? inv.total ?? null

  return (
    <Page>
      <section className="max-w-7xl mx-auto px-4 py-8 grid gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Manual Review</h1>
          {loading && <div className="text-sm text-slate-400">Loading…</div>}
          {error && <div className="text-sm text-red-400">{error}</div>}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <div className="mb-3 text-slate-300">
              <div><span className="text-slate-400">Vendor:</span> {po.vendor_details || po.vendor || '—'}</div>
              <div><span className="text-slate-400">PO Number:</span> {po.po_number || po.orderId || '—'}</div>
            </div>
            <Table title="Purchase Order" header={poHeader} rows={poRows} footer={poTotal != null ? `₹${Number(poTotal).toFixed(2)}` : null} />
          </div>

          <div>
            <div className="mb-3 text-slate-300">
              <div><span className="text-slate-400">Invoice #:</span> {inv.invoice_number || inv.invoiceNo || '—'}</div>
            </div>
            <Table title="Invoice" header={invHeader} rows={invRows} footer={invTotal != null ? `₹${Number(invTotal).toFixed(2)}` : null} />
          </div>
        </div>
      </section>
    </Page>
  )
}
