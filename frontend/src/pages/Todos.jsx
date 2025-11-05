import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Page from '../components/Page.jsx'
import { Storage } from '../utils/storage.js'
import { MLApi } from '../lib/api.js'

export default function Todos() {
  const [todos, setTodos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    deadline: '',
    reminder: false,
    reminderTime: '',
    difficulty: 'medium', // easy | medium | hard
    urgency: '3', // 1..5 (1 highest)
    estimateMinutes: ''
  })
  const [isListening, setIsListening] = useState(false)
  const [mlPriority, setMlPriority] = useState(null)
  const [predictingPriority, setPredictingPriority] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    loadTodos()
    checkVoiceSupport()
  }, [])

  function loadTodos() {
    setTodos(Storage.getTodos())
  }

  function checkVoiceSupport() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setFormData({ ...formData, title: transcript })
        setIsListening(false)
      }
      
      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }
    }
  }

  function startVoiceInput() {
    if (recognitionRef.current) {
      setIsListening(true)
      recognitionRef.current.start()
    } else {
      alert('Voice recognition not supported in your browser')
    }
  }

  function stopVoiceInput() {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  async function predictPriority() {
    if (!formData.title.trim()) return
    try {
      setPredictingPriority(true)
      const taskData = {
        title: formData.title,
        deadline: formData.deadline,
        difficulty: formData.difficulty,
        urgency: Number(formData.urgency || 3),
        estimateMinutes: formData.estimateMinutes ? Number(formData.estimateMinutes) : 0
      }
      const result = await MLApi.predictTaskPriority(taskData)
      setMlPriority(result.priority)
      // Optionally auto-set urgency based on predicted priority
      if (result.priority === 'high' && Number(formData.urgency) > 2) {
        setFormData({ ...formData, urgency: '2' })
      } else if (result.priority === 'low' && Number(formData.urgency) < 4) {
        setFormData({ ...formData, urgency: '4' })
      }
    } catch (error) {
      console.error('Failed to predict priority:', error)
    } finally {
      setPredictingPriority(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const newTodo = {
      id: Date.now().toString(),
      title: formData.title,
      difficulty: formData.difficulty,
      urgency: Number(formData.urgency || 3),
      estimateMinutes: formData.estimateMinutes ? Number(formData.estimateMinutes) : 0,
      deadline: formData.deadline,
      reminder: formData.reminder,
      reminderTime: formData.reminderTime,
      completed: false,
      createdAt: new Date().toISOString()
    }
    const updated = [...todos, newTodo]
    Storage.saveTodos(updated)
    setTodos(updated)
    setFormData({ title: '', deadline: '', reminder: false, reminderTime: '', difficulty: 'medium', urgency: '3', estimateMinutes: '' })
    setShowForm(false)
    
    // Set reminder if enabled
    if (formData.reminder && formData.reminderTime) {
      scheduleReminder(newTodo)
    }
  }

  function scheduleReminder(todo) {
    const reminderDate = new Date(formData.reminderTime)
    const now = new Date()
    const msUntilReminder = reminderDate - now
    
    if (msUntilReminder > 0) {
      setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification(`Reminder: ${todo.title}`, {
            body: `Don't forget: ${todo.title}${todo.deadline ? ` (Deadline: ${new Date(todo.deadline).toLocaleDateString()})` : ''}`,
            icon: '/favicon.ico'
          })
        }
      }, msUntilReminder)
    }
  }

  function toggleComplete(id) {
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    Storage.saveTodos(updated)
    setTodos(updated)
  }

  function deleteTodo(id) {
    const updated = todos.filter(t => t.id !== id)
    Storage.saveTodos(updated)
    setTodos(updated)
  }

  function moveTodo(id, direction) {
    const idx = todos.findIndex(t => t.id === id)
    if (idx < 0) return
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= todos.length) return
    const copy = [...todos]
    const [item] = copy.splice(idx, 1)
    copy.splice(newIdx, 0, item)
    Storage.saveTodos(copy)
    setTodos(copy)
  }

  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  useEffect(() => {
    requestNotificationPermission()
  }, [])

  const pendingTodos = todos.filter(t => !t.completed).sort((a, b) => {
    // Sort by urgency (1 highest), then deadline, then difficulty (harder earlier), then createdAt desc
    const ua = typeof a.urgency === 'number' ? a.urgency : 3
    const ub = typeof b.urgency === 'number' ? b.urgency : 3
    if (ua !== ub) return ua - ub
    if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline)
    if (a.deadline) return -1
    if (b.deadline) return 1
    const da = a.difficulty || 'medium'
    const db = b.difficulty || 'medium'
    const diffRank = { easy: 3, medium: 2, hard: 1 }
    if (diffRank[da] !== diffRank[db]) return diffRank[db] - diffRank[da]
    const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return cb - ca
  })
  const completedTodos = todos.filter(t => t.completed)

  return (
    <Page>
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Todo Tasks ✅</h1>
            <p className="text-slate-400">Organize your tasks with deadlines and reminders</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:from-green-400 hover:to-emerald-400 transition"
          >
            {showForm ? 'Cancel' : '+ New Todo'}
          </button>
        </div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl p-[1px] bg-gradient-to-r from-green-500/35 to-emerald-500/35 mb-8"
          >
            <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
              <h2 className="text-xl font-semibold mb-4">Add New Todo</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Task Title</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={e => {
                        setFormData({ ...formData, title: e.target.value })
                        setMlPriority(null) // Reset prediction when title changes
                      }}
                      onBlur={() => {
                        if (formData.title.trim()) predictPriority()
                      }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter task or use voice input..."
                    />
                    <button
                      type="button"
                      onClick={isListening ? stopVoiceInput : startVoiceInput}
                      className={`px-4 py-2 rounded-lg ${
                        isListening 
                          ? 'bg-red-500 hover:bg-red-400' 
                          : 'bg-purple-500 hover:bg-purple-400'
                      } text-white transition`}
                    >
                      {isListening ? '⏹️ Stop' : '🎤 Voice'}
                    </button>
                    <button
                      type="button"
                      onClick={predictPriority}
                      disabled={!formData.title.trim() || predictingPriority}
                      className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Predict priority using ML"
                    >
                      {predictingPriority ? '🤖' : '🤖'}
                    </button>
                  </div>
                  {isListening && (
                    <p className="text-xs text-purple-400 mt-1">Listening... Speak now!</p>
                  )}
                  {mlPriority && (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                      <p className="text-xs text-indigo-300">
                        🤖 ML Predicted Priority: <span className="font-semibold capitalize">{mlPriority}</span>
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Deadline (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Difficulty</label>
                    <select
                      value={formData.difficulty}
                      onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Urgency (1-5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={formData.urgency}
                      onChange={e => setFormData({ ...formData, urgency: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Estimate (min)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.estimateMinutes}
                      onChange={e => setFormData({ ...formData, estimateMinutes: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g. 45"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="reminder"
                    checked={formData.reminder}
                    onChange={e => setFormData({ ...formData, reminder: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label htmlFor="reminder" className="text-sm">Set Reminder</label>
                </div>

                {formData.reminder && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Reminder Time</label>
                    <input
                      type="datetime-local"
                      required={formData.reminder}
                      value={formData.reminderTime}
                      onChange={e => setFormData({ ...formData, reminderTime: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:from-green-400 hover:to-emerald-400 transition"
                >
                  Add Todo
                </button>
              </form>
            </div>
          </motion.div>
        )}

        <div className="space-y-6">
          {pendingTodos.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Pending ({pendingTodos.length})</h2>
              <div className="space-y-3">
                {pendingTodos.map((todo, idx) => (
                  <motion.div
                    key={todo.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="relative rounded-2xl p-[1px] bg-gradient-to-r from-green-500/35 to-emerald-500/35"
                  >
                    <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-4 flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleComplete(todo.id)}
                        className="mt-1 w-5 h-5"
                      />
                      <div className="flex-1">
                        <div className="font-medium mb-1 flex items-center gap-2">
                          <span>{todo.title}</span>
                          {todo.difficulty && (
                            <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10 capitalize">{todo.difficulty}</span>
                          )}
                          {typeof todo.urgency !== 'undefined' && (
                            <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">U{String(todo.urgency)}</span>
                          )}
                          {todo.estimateMinutes ? (
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">~{todo.estimateMinutes}m</span>
                          ) : null}
                        </div>
                        {todo.deadline && (
                          <div className="text-sm text-orange-400">
                            ⏰ Deadline: {new Date(todo.deadline).toLocaleString()}
                          </div>
                        )}
                        {todo.reminder && todo.reminderTime && (
                          <div className="text-sm text-purple-400">
                            🔔 Reminder: {new Date(todo.reminderTime).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => moveTodo(todo.id, -1)}
                          className="text-slate-300 hover:text-white"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveTodo(todo.id, 1)}
                          className="text-slate-300 hover:text-white"
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {completedTodos.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Completed ({completedTodos.length})</h2>
              <div className="space-y-3">
                {completedTodos.map((todo, idx) => (
                  <motion.div
                    key={todo.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="relative rounded-xl p-[1px] bg-gradient-to-r from-slate-500/20 to-slate-600/20"
                  >
                    <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/60 p-4 flex items-start gap-4 opacity-60">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleComplete(todo.id)}
                        className="mt-1 w-5 h-5"
                      />
                      <div className="flex-1">
                        <div className="font-medium line-through">{todo.title}</div>
                      </div>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {todos.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-slate-400 mb-4">No todos yet. Create your first task!</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium"
              >
                Add Todo
              </button>
            </div>
          )}
        </div>
      </section>
    </Page>
  )
}


