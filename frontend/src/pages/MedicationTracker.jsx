import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Page from '../components/Page.jsx'
import { EduHubApi } from '../lib/api.js'

export default function MedicationTracker() {
  const [medications, setMedications] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'daily',
    times: ['09:00'],
    notes: ''
  })

  useEffect(() => {
    loadMedications()
    requestNotificationPermission()
  }, [])

  useEffect(() => {
    if (medications.length > 0) {
      checkReminders()
    }
  }, [medications])

  async function loadMedications() {
    try {
      const meds = await EduHubApi.getMedications()
      setMedications(meds)
    } catch (error) {
      console.error('Failed to load medications:', error)
      // Fallback to empty array on error
      setMedications([])
    }
  }

  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  function checkReminders() {
    // Check for upcoming medication reminders
    const now = new Date()
    medications.forEach(med => {
      med.times.forEach(time => {
        const [hours, minutes] = time.split(':')
        const reminderTime = new Date()
        reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
        
        // Check if reminder time is within next 5 minutes
        const diff = reminderTime - now
        if (diff > 0 && diff < 5 * 60 * 1000) {
          setTimeout(() => {
            if (Notification.permission === 'granted') {
              new Notification(`Time to take ${med.name}`, {
                body: `Dosage: ${med.dosage}`,
                icon: '/favicon.ico'
              })
            }
          }, diff)
        }
      })
    })
  }

  function handleAddTime() {
    setFormData({
      ...formData,
      times: [...formData.times, '09:00']
    })
  }

  function handleTimeChange(index, value) {
    const newTimes = [...formData.times]
    newTimes[index] = value
    setFormData({ ...formData, times: newTimes })
  }

  function handleRemoveTime(index) {
    if (formData.times.length > 1) {
      const newTimes = formData.times.filter((_, i) => i !== index)
      setFormData({ ...formData, times: newTimes })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const newMed = await EduHubApi.createMedication(formData)
      setMedications([newMed, ...medications])
      setFormData({
        name: '',
        dosage: '',
        frequency: 'daily',
        times: ['09:00'],
        notes: ''
      })
      setShowForm(false)
    } catch (error) {
      console.error('Failed to create medication:', error)
      alert('Failed to create medication. Please try again.')
    }
  }

  async function markTaken(id) {
    try {
      await EduHubApi.logMedicationTaken(id)
      // Reload medications to get updated data
      await loadMedications()
    } catch (error) {
      console.error('Failed to log medication:', error)
      alert('Failed to log medication. Please try again.')
    }
  }

  async function deleteMedication(id) {
    if (!confirm('Are you sure you want to delete this medication?')) {
      return
    }
    try {
      await EduHubApi.deleteMedication(id)
      setMedications(medications.filter(m => m.id !== id))
    } catch (error) {
      console.error('Failed to delete medication:', error)
      alert('Failed to delete medication. Please try again.')
    }
  }

  const getNextReminder = (med) => {
    const now = new Date()
    let nextReminder = null
    
    med.times.forEach(time => {
      const [hours, minutes] = time.split(':')
      const reminderTime = new Date()
      reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      
      if (reminderTime < now) {
        reminderTime.setDate(reminderTime.getDate() + 1)
      }
      
      if (!nextReminder || reminderTime < nextReminder) {
        nextReminder = reminderTime
      }
    })
    
    return nextReminder
  }

  return (
    <Page>
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Medication Tracker 💊</h1>
            <p className="text-slate-400">Track your medications and never miss a dose</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:from-cyan-400 hover:to-blue-400 transition"
          >
            {showForm ? 'Cancel' : '+ Add Medication'}
          </button>
        </div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl p-[1px] bg-gradient-to-r from-cyan-500/35 to-blue-500/35 mb-8"
          >
            <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
              <h2 className="text-xl font-semibold mb-4">Add Medication</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Medication Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="e.g., Vitamin D"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Dosage</label>
                    <input
                      type="text"
                      required
                      value={formData.dosage}
                      onChange={e => setFormData({ ...formData, dosage: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="e.g., 1000mg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="as_needed">As Needed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Reminder Times</label>
                  <div className="space-y-2">
                    {formData.times.map((time, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="time"
                          value={time}
                          onChange={e => handleTimeChange(index, e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                        {formData.times.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTime(index)}
                            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddTime}
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm"
                    >
                      + Add Another Time
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    rows="2"
                    placeholder="Any additional notes..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:from-cyan-400 hover:to-blue-400 transition"
                >
                  Add Medication
                </button>
              </form>
            </div>
          </motion.div>
        )}

        <div className="space-y-4">
          {medications.map((med, idx) => {
            const nextReminder = getNextReminder(med)
            const isOverdue = med.lastTaken && nextReminder && new Date(med.lastTaken) < new Date(Date.now() - 24 * 60 * 60 * 1000)
            
            return (
              <motion.div
                key={med.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative rounded-2xl p-[1px] bg-gradient-to-r from-cyan-500/35 to-blue-500/35"
              >
                <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-4xl">💊</div>
                        <div>
                          <h3 className="text-xl font-semibold">{med.name}</h3>
                          <p className="text-sm text-cyan-400">{med.dosage}</p>
                        </div>
                      </div>
                      <div className="text-sm text-slate-400 space-y-1">
                        <p>Frequency: {med.frequency}</p>
                        <p>Times: {med.times.join(', ')}</p>
                        {med.lastTaken && (
                          <p className="text-green-400">
                            Last taken: {new Date(med.lastTaken).toLocaleString()}
                          </p>
                        )}
                        {nextReminder && (
                          <p className="text-orange-400">
                            Next reminder: {nextReminder.toLocaleTimeString()}
                          </p>
                        )}
                        {med.notes && (
                          <p className="mt-2 text-slate-300">{med.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => markTaken(med.id)}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-medium hover:from-green-400 hover:to-emerald-400 transition"
                      >
                        Mark Taken
                      </button>
                      <button
                        onClick={() => deleteMedication(med.id)}
                        className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {isOverdue && (
                    <div className="mt-3 p-3 rounded-lg bg-orange-500/20 border border-orange-500/50 text-orange-400 text-sm">
                      ⚠️ You may have missed a dose. Please check with your doctor if needed.
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {medications.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">💊</div>
            <p className="text-slate-400 mb-4">No medications tracked yet. Add your first one!</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium"
            >
              Add Medication
            </button>
          </div>
        )}
      </section>
    </Page>
  )
}


