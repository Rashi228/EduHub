import React, { useState, useRef } from 'react'
import Page from '../components/Page.jsx'

export default function Upload() {
  const [files, setFiles] = useState([])
  const [progress, setProgress] = useState(0)
  const inputRef = useRef(null)

  function onDrop(e) {
    e.preventDefault()
    const list = Array.from(e.dataTransfer.files || [])
    setFiles(prev => [...prev, ...list])
  }

  function onBrowse(e) {
    const list = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...list])
  }

  async function startUpload() {
    if (files.length === 0) return
    setProgress(10)
    await new Promise(r => setTimeout(r, 800))
    setProgress(100)
  }

  return (
    <Page>
      <section className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">Upload Files</h1>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ring-1 ring-white/10 bg-slate-900/60 hover:bg-slate-900/80"
        >
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-accent-500/10 to-brand-400/10 blur-2xl"></div>
          <p className="mb-4 text-slate-300">Drag & drop invoice and PO PDFs here</p>
          <button className="bg-gradient-to-r from-accent-500 to-brand-500 hover:from-accent-600 hover:to-brand-600 text-white px-5 py-2 rounded-lg shadow-glow" onClick={() => inputRef.current?.click()}>Browse files</button>
          <input ref={inputRef} type="file" multiple accept="application/pdf,image/*" onChange={onBrowse} className="hidden" />
        </div>

        {files.length > 0 && (
          <div className="mt-6 rounded-xl p-4 ring-1 ring-white/10 bg-slate-900/60">
            <div className="text-sm mb-2 text-slate-300">{files.length} file(s) selected</div>
            <div className="h-2 bg-slate-800 rounded">
              <div className="h-2 rounded bg-gradient-to-r from-accent-500 to-brand-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 flex gap-2">
              <button className="bg-gradient-to-r from-accent-500 to-brand-500 hover:from-accent-600 hover:to-brand-600 text-white px-4 py-2 rounded" onClick={startUpload}>Start upload</button>
              <button className="px-4 py-2 rounded border border-white/10" onClick={() => { setFiles([]); setProgress(0) }}>Clear</button>
            </div>
          </div>
        )}
      </section>
    </Page>
  )
}
