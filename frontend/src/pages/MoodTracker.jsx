import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Page from '../components/Page.jsx'
import { Storage } from '../utils/storage.js'

export default function MoodTracker() {
  const [moods, setMoods] = useState([])
  const [selectedMood, setSelectedMood] = useState(null)
  const [note, setNote] = useState('')

  const moodOptions = [
    { emoji: '😄', label: 'Great', value: 'great', color: 'from-green-500 to-emerald-500' },
    { emoji: '🙂', label: 'Good', value: 'good', color: 'from-blue-500 to-cyan-500' },
    { emoji: '😐', label: 'Okay', value: 'okay', color: 'from-yellow-500 to-orange-500' },
    { emoji: '😔', label: 'Sad', value: 'sad', color: 'from-blue-600 to-indigo-600' },
    { emoji: '😢', label: 'Very Sad', value: 'very_sad', color: 'from-purple-600 to-pink-600' },
    { emoji: '😤', label: 'Frustrated', value: 'frustrated', color: 'from-red-500 to-orange-500' },
    { emoji: '😴', label: 'Tired', value: 'tired', color: 'from-gray-500 to-slate-500' },
    { emoji: '😌', label: 'Calm', value: 'calm', color: 'from-teal-500 to-green-500' }
  ]

  useEffect(() => {
    loadMoods()
  }, [])

  function loadMoods() {
    setMoods(Storage.getMoods())
  }

  function saveMood() {
    if (!selectedMood) return

    const newMood = {
      id: Date.now().toString(),
      mood: selectedMood,
      note: note.trim(),
      date: new Date().toISOString()
    }
    const updated = [...moods, newMood]
    Storage.saveMoods(updated)
    setMoods(updated)
    setSelectedMood(null)
    setNote('')
  }

  function deleteMood(id) {
    const updated = moods.filter(m => m.id !== id)
    Storage.saveMoods(updated)
    setMoods(updated)
  }

  const todayMoods = moods.filter(m => {
    const moodDate = new Date(m.date).toDateString()
    return moodDate === new Date().toDateString()
  })

  const getMoodData = (value) => moodOptions.find(m => m.value === value) || moodOptions[0]

  // Group moods by week
  const weeklyMoods = moods.reduce((acc, mood) => {
    const date = new Date(mood.date)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const weekKey = weekStart.toISOString().split('T')[0]
    
    if (!acc[weekKey]) acc[weekKey] = []
    acc[weekKey].push(mood)
    return acc
  }, {})

  return (
    <Page>
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">Mood Tracker 😊</h1>
          <p className="text-slate-400">Track your daily mood and emotional well-being</p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">How are you feeling today?</h2>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mb-6">
            {moodOptions.map(mood => (
              <button
                key={mood.value}
                onClick={() => setSelectedMood(mood.value)}
                className={`p-4 rounded-xl border-2 transition ${
                  selectedMood === mood.value
                    ? 'border-purple-500 bg-purple-500/20 scale-110'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="text-4xl mb-2">{mood.emoji}</div>
                <div className="text-xs">{mood.label}</div>
              </button>
            ))}
          </div>

          {selectedMood && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-2xl p-[1px] bg-gradient-to-r from-pink-500/35 to-purple-500/35 mb-4"
            >
              <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Add a note (Optional)</label>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows="3"
                    placeholder="What's on your mind?"
                  />
                </div>
                <button
                  onClick={saveMood}
                  className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium hover:from-pink-400 hover:to-purple-400 transition"
                >
                  Save Mood
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {todayMoods.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Today's Moods</h2>
            <div className="space-y-3">
              {todayMoods.map((mood, idx) => {
                const moodData = getMoodData(mood.mood)
                return (
                  <motion.div
                    key={mood.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`relative rounded-xl p-[1px] bg-gradient-to-r ${moodData.color}`}
                  >
                    <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-4 flex items-start gap-4">
                      <div className="text-4xl">{moodData.emoji}</div>
                      <div className="flex-1">
                        <div className="font-medium mb-1">{moodData.label}</div>
                        {mood.note && (
                          <p className="text-sm text-slate-400">{mood.note}</p>
                        )}
                        <div className="text-xs text-slate-500 mt-2">
                          {new Date(mood.date).toLocaleTimeString()}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMood(mood.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-pink-500/35 to-purple-500/35">
          <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
            <h2 className="text-xl font-semibold mb-4">Mood History</h2>
            {moods.length > 0 ? (
              <div className="space-y-4">
                {Object.entries(weeklyMoods).slice(0, 4).map(([week, weekMoods]) => (
                  <div key={week}>
                    <h3 className="text-sm font-medium text-slate-300 mb-2">
                      Week of {new Date(week).toLocaleDateString()}
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      {weekMoods.slice(-7).map(mood => {
                        const moodData = getMoodData(mood.mood)
                        return (
                          <div
                            key={mood.id}
                            className="text-2xl"
                            title={`${moodData.label} - ${new Date(mood.date).toLocaleDateString()}`}
                          >
                            {moodData.emoji}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-4">No mood history yet. Start tracking!</p>
            )}
          </div>
        </div>
      </section>
    </Page>
  )
}




