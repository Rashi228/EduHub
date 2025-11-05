import React from 'react'
import { motion } from 'framer-motion'

const steps = [
  { title: 'Upload', desc: 'Add invoices and POs from your desktop or email.' },
  { title: 'AI Extract', desc: 'Your OCR service turns PDFs into structured JSON.' },
  { title: 'Compare', desc: 'We reconcile invoice vs PO with smart tolerances.' },
  { title: 'Review & Export', desc: 'Approve results and download a clean CSV.' },
  { title: 'Automation', desc: 'Optional Gmail watch to auto-process new emails.' }
]

export default function HowItWorks() {
  return (
    <section className="relative py-14">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-xl font-semibold text-white/90">How InvoSync works</h2>
        <p className="text-slate-300 mb-8">A focused 4-step flow (with optional automation).</p>

        {/* Timeline: vertical on mobile, horizontal on lg */}
        <div className="relative">
          {/* central connector */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10 lg:left-0 lg:top-10 lg:bottom-auto lg:h-px lg:w-full" />

          <div className="grid gap-8 lg:grid-cols-5">
            {steps.map((s, idx) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="relative pl-10 lg:pl-0"
              >
                {/* number marker */}
                <div className="absolute left-0 top-0 lg:left-1/2 lg:-translate-x-1/2 lg:-top-6 h-8 w-8 rounded-full grid place-items-center bg-[#101938] text-brand-200 ring-1 ring-white/10">
                  <span className="text-sm font-medium">{idx + 1}</span>
                </div>

                {/* card */}
                <div className="rounded-xl p-4 ring-1 ring-white/10 bg-[#0f1733] hover:bg-[#111b3a] transition-colors">
                  <div className="text-white font-medium">{s.title}</div>
                  <div className="text-sm text-slate-300 mt-1">{s.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
