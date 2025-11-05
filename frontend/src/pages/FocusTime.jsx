import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Page from '../components/Page.jsx'
import { Storage } from '../utils/storage.js'

export default function FocusTime() {
  const [isRunning, setIsRunning] = useState(false)
  const [time, setTime] = useState(0) // in seconds
  const [sessions, setSessions] = useState([])
  const intervalRef = useRef(null)

  useEffect(() => {
    loadSessions()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime(prev => prev + 1)
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning])

  function loadSessions() {
    const data = Storage.getFocusTime()
    const today = new Date().toDateString()
    const savedTime = data[today] || 0
    setTime(savedTime)
    const todaySessions = data.sessions || []
    setSessions(todaySessions.filter(s => new Date(s.date).toDateString() === today))
  }

  function start() {
    setIsRunning(true)
  }

  function pause() {
    setIsRunning(false)
  }

  function stop() {
    if (time > 0) {
      const data = Storage.getFocusTime()
      const today = new Date().toDateString()
      const sessions = data.sessions || []
      sessions.push({
        id: Date.now().toString(),
        duration: time,
        date: new Date().toISOString()
      })
      const todayTotal = (data[today] || 0) + time
      Storage.saveFocusTime({
        ...data,
        [today]: todayTotal,
        sessions: sessions.slice(-50) // Keep last 50 sessions
      })
      loadSessions()
    }
    setTime(0)
    setIsRunning(false)
  }

  function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const data = Storage.getFocusTime()
  const today = new Date().toDateString()
  const savedToday = data[today] || 0
  const totalToday = savedToday
  const hoursToday = Math.floor(totalToday / 3600)
  const minutesToday = Math.floor((totalToday % 3600) / 60)

  return (
    <Page>
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Focus Time ⏱️</h1>
          <p className="text-slate-400">Track your focused learning sessions</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative rounded-2xl p-[1px] bg-gradient-to-r from-purple-500/35 to-pink-500/35"
          >
            <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-8 text-center">
              <div className="text-6xl mb-6">{isRunning ? '🎯' : '⏱️'}</div>
              <div className="text-6xl font-bold mb-4 font-mono">{formatTime(time)}</div>
              <div className="flex gap-3 justify-center">
                {!isRunning ? (
                  <button
                    onClick={start}
                    className="px-8 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:from-green-400 hover:to-emerald-400 transition"
                  >
                    Start
                  </button>
                ) : (
                  <>
                    <button
                      onClick={pause}
                      className="px-6 py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-medium hover:from-yellow-400 hover:to-orange-400 transition"
                    >
                      Pause
                    </button>
                    <button
                      onClick={stop}
                      className="px-6 py-3 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium hover:from-red-400 hover:to-pink-400 transition"
                    >
                      Stop & Save
                    </button>
                  </>
                )}
                {!isRunning && time > 0 && (
                  <button
                    onClick={() => setTime(0)}
                    className="px-6 py-3 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-2xl p-[1px] bg-gradient-to-r from-blue-500/35 to-cyan-500/35"
          >
            <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-8 text-center">
              <div className="text-6xl mb-4">📊</div>
              <div className="text-4xl font-bold mb-2">{hoursToday}h {minutesToday}m</div>
              <div className="text-slate-400 mb-4">Today's Total</div>
              <div className="text-sm text-slate-300">
                {sessions.length} session{sessions.length !== 1 ? 's' : ''} today
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-purple-500/35 to-pink-500/35">
          <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
            <h2 className="text-xl font-semibold mb-4">Today's Sessions</h2>
            {sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map((session, idx) => (
                  <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <div className="font-medium">Session {sessions.length - idx}</div>
                      <div className="text-sm text-slate-400">{new Date(session.date).toLocaleTimeString()}</div>
                    </div>
                    <div className="text-lg font-mono font-semibold">{formatTime(session.duration)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-4">No sessions recorded today yet</p>
            )}
          </div>
        </div>
      </section>
    </Page>
  )
}
