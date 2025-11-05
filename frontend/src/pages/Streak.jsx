import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Page from '../components/Page.jsx'
import { Storage } from '../utils/storage.js'

export default function Streak() {
  const [streak, setStreak] = useState({ current: 0, longest: 0, lastDate: null })

  useEffect(() => {
    loadStreak()
  }, [])

  function loadStreak() {
    setStreak(Storage.getStreak())
  }

  function updateToday() {
    const updated = Storage.updateStreak()
    setStreak(updated)
  }

  const today = new Date().toDateString()
  const isTodayUpdated = streak.lastDate === today

  return (
    <Page>
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Learning Streak 🔥</h1>
          <p className="text-slate-400">Keep your learning momentum going!</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative rounded-2xl p-[1px] bg-gradient-to-r from-orange-500/35 to-red-500/35"
          >
            <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-8 text-center">
              <div className="text-6xl mb-4">🔥</div>
              <div className="text-5xl font-bold mb-2">{streak.current}</div>
              <div className="text-slate-400">Current Streak</div>
              <div className="mt-4">
                {isTodayUpdated ? (
                  <span className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm">
                    ✓ Updated today!
                  </span>
                ) : (
                  <button
                    onClick={updateToday}
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium hover:from-orange-400 hover:to-red-400 transition"
                  >
                    Mark Today Complete
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-2xl p-[1px] bg-gradient-to-r from-yellow-500/35 to-orange-500/35"
          >
            <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-8 text-center">
              <div className="text-6xl mb-4">⭐</div>
              <div className="text-5xl font-bold mb-2">{streak.longest}</div>
              <div className="text-slate-400">Longest Streak</div>
              <div className="mt-4 text-sm text-slate-300">
                Keep going to beat your record!
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-orange-500/35 to-red-500/35">
          <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
            <h2 className="text-xl font-semibold mb-4">Tips to Maintain Your Streak</h2>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                <span>Study at least 30 minutes every day to count as a learning day</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                <span>Mark your progress daily to keep your streak alive</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                <span>Set reminders to study at the same time each day</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                <span>Even 15 minutes of focused learning counts!</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </Page>
  )
}


