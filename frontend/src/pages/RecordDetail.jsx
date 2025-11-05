import React, { useMemo } from 'react'
import Page from '../components/Page.jsx'

const sample = {
  invoice: { vendor: 'Acme Ltd', number: 'INV-001', date: '23/10/2025', total: 1234.5, items: [ { name: 'Widget', qty: 5, price: 100 } ] },
  po: { vendor: 'Acme Limited', number: 'PO-100', date: '22/10/2025', total: 1200.0, items: [ { name: 'Widget', qty: 4, price: 100 } ] }
}

export default function RecordDetail() {
  const discrepancies = useMemo(() => ([
    { field: 'Vendor', expected: sample.po.vendor, actual: sample.invoice.vendor, type: 'VENDOR_SIMILARITY', level: 'warn' },
    { field: 'Quantity', expected: 4, actual: 5, type: 'QTY_MISMATCH', level: 'error' },
    { field: 'Total', expected: 1200.0, actual: 1234.5, type: 'TOTAL_MISMATCH', level: 'error' }
  ]), [])

  const badge = (lvl) => ({ error: 'bg-red-400/15 text-red-300 ring-1 ring-red-400/30', warn: 'bg-yellow-400/15 text-yellow-300 ring-1 ring-yellow-400/30', ok: 'bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30' }[lvl])

  return (
    <Page>
      <section className="max-w-7xl mx-auto px-4 py-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl ring-1 ring-white/10 bg-slate-900/60 p-5">
          <h2 className="font-semibold mb-3">Invoice</h2>
          <pre className="text-sm whitespace-pre-wrap text-slate-300">{JSON.stringify(sample.invoice, null, 2)}</pre>
        </div>
        <div className="rounded-xl ring-1 ring-white/10 bg-slate-900/60 p-5">
          <h2 className="font-semibold mb-3">Purchase Order</h2>
          <pre className="text-sm whitespace-pre-wrap text-slate-300">{JSON.stringify(sample.po, null, 2)}</pre>
        </div>
        <div className="lg:col-span-2 rounded-xl ring-1 ring-white/10 bg-slate-900/60 p-5">
          <h3 className="font-semibold mb-3">Discrepancies</h3>
          <ul className="grid gap-2">
            {discrepancies.map((d, i) => (
              <li key={i} className={`p-3 rounded ${d.level==='error'?'bg-red-500/10': d.level==='warn'?'bg-yellow-500/10':'bg-emerald-500/10'}`}>
                <span className={`px-2 py-1 rounded text-xs mr-2 ${badge(d.level)}`}>{d.type}</span>
                <span className="font-medium">{d.field}:</span>
                <span className="ml-2 text-slate-300">Expected {String(d.expected)} but found {String(d.actual)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Page>
  )
}
