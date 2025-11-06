import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Page from '../components/Page.jsx'
import { Storage } from '../utils/storage.js'
import { EduHubApi } from '../lib/api.js'

export default function Dashboard() {
  const [upcomingTasks, setUpcomingTasks] = useState([])
  const [tasksByPriority, setTasksByPriority] = useState({
    overdue: [],
    dueToday: [],
    urgent: [],
    upcoming: [],
    normal: []
  })
  const [progressData, setProgressData] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    thisWeekTasks: 0,
    thisWeekCompleted: 0
  })
  const [aiAdvisor, setAiAdvisor] = useState(null)
  const [loadingAdvisor, setLoadingAdvisor] = useState(false)
  const [focusTimeToday, setFocusTimeToday] = useState(0)
  const [streak, setStreak] = useState({ current: 0, longest: 0, lastDate: null })

  useEffect(() => {
    loadDashboardData()
    loadAIAdvisor()
    loadFocusTime()
    loadStreak()
  }, [])

  function loadDashboardData() {
    try {
      const todos = Storage.getTodos() || []
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    // Get all pending tasks and prioritize by urgency
    const pendingTasks = todos.filter(t => !t.completed)
    
    // Sort tasks by priority: overdue > due today > upcoming (within 7 days) > others
      const prioritizedTasks = pendingTasks
      .map(task => {
        let priority = 1000 // Default priority for tasks without deadlines
        let dateForSorting = new Date('9999-12-31') // Far future date for sorting
        
        if (task.deadline) {
          const deadline = new Date(task.deadline)
          dateForSorting = deadline
          const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate())
          
          if (deadlineDate < today) {
            priority = 1 // Overdue - highest priority
          } else if (deadlineDate.getTime() === today.getTime()) {
            priority = 2 // Due today
          } else if (deadline <= weekFromNow) {
            priority = 3 // Upcoming within 7 days
          } else {
            priority = 4 // Future deadline
          }
        } else if (task.reminder && task.reminderTime) {
          const reminder = new Date(task.reminderTime)
          dateForSorting = reminder
          
          if (reminder < today) {
            priority = 5 // Past reminder (but still pending)
          } else if (reminder <= weekFromNow) {
            priority = 3 // Upcoming reminder
          } else {
            priority = 4 // Future reminder
          }
        } else {
          // No deadline or reminder - sort by creation date (newest first)
          dateForSorting = task.createdAt ? new Date(task.createdAt) : new Date(0)
          priority = 6
        }
        
        return { ...task, priority, dateForSorting }
      })
      .sort((a, b) => {
        // First sort by priority
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        // Then by date
        return a.dateForSorting - b.dateForSorting
      })
      
      // Group tasks by priority
      const groupedTasks = {
        overdue: prioritizedTasks.filter(t => t.priority === 1),
        dueToday: prioritizedTasks.filter(t => t.priority === 2),
        urgent: prioritizedTasks.filter(t => t.priority === 3),
        upcoming: prioritizedTasks.filter(t => t.priority === 4),
        normal: prioritizedTasks.filter(t => t.priority >= 5)
      }
      
      const upcoming = prioritizedTasks.slice(0, 8).map(({ priority, dateForSorting, ...task }) => ({ ...task, priority }))

    // Calculate progress data
    const completed = todos.filter(t => t.completed).length
    const pending = todos.filter(t => !t.completed).length
    const overdue = todos.filter(t => {
      if (!t.deadline || t.completed) return false
      const deadline = new Date(t.deadline)
      const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate())
      return deadlineDate < today
    }).length
    
    // This week's tasks
    const thisWeekTodos = todos.filter(t => {
      if (!t.deadline) return false
      const deadline = new Date(t.deadline)
      return deadline >= today && deadline < weekFromNow
    })
    const thisWeekCompleted = thisWeekTodos.filter(t => t.completed).length

    const completionRate = todos.length > 0 ? Math.round((completed / todos.length) * 100) : 0

    setUpcomingTasks(upcoming)
      setTasksByPriority(groupedTasks)
    setProgressData({
      totalTasks: todos.length,
      completedTasks: completed,
      pendingTasks: pending,
      overdueTasks: overdue,
      completionRate,
      thisWeekTasks: thisWeekTodos.length,
      thisWeekCompleted
    })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      // Set defaults on error
      setUpcomingTasks([])
      setTasksByPriority({
        overdue: [],
        dueToday: [],
        urgent: [],
        upcoming: [],
        normal: []
      })
      setProgressData({
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        completionRate: 0,
        thisWeekTasks: 0,
        thisWeekCompleted: 0
      })
    }
  }

  function formatDate(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function formatDateTime(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  function getDaysUntil(dateString) {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const diffTime = dateOnly - today
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  async function loadFocusTime() {
    try {
      const totalSeconds = await EduHubApi.getFocusToday()
      setFocusTimeToday(totalSeconds || 0)
    } catch (error) {
      console.error('Failed to load focus time:', error)
      setFocusTimeToday(0) // Set default value on error
    }
  }

  async function loadAIAdvisor() {
    try {
      setLoadingAdvisor(true)
      const advisor = await EduHubApi.getAIAdvisor()
      setAiAdvisor(advisor)
    } catch (error) {
      console.error('Failed to load AI advisor:', error)
      setAiAdvisor(null) // Set null on error to show empty state
    } finally {
      setLoadingAdvisor(false)
    }
  }

  async function loadStreak() {
    try {
      // Update streak for today and then fetch
      try { await EduHubApi.updateStreak() } catch (_) {}
      const data = await EduHubApi.getStreak()
      setStreak({
        current: Number(data.current || 0),
        longest: Number(data.longest || 0),
        lastDate: data.lastDate || null
      })
    } catch (error) {
      console.error('Failed to load streak:', error)
      setStreak({ current: 0, longest: 0, lastDate: null })
    }
  }

  function formatFocusTime(seconds) {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hrs > 0) {
      return `${hrs}h ${mins}m`
    }
    return `${mins}m`
  }

  function getPriorityLabel(priority) {
    if (priority === 1) return { label: 'Overdue', color: 'text-red-400 bg-red-500/20 border-red-500/30' }
    if (priority === 2) return { label: 'Due Today', color: 'text-orange-400 bg-orange-500/20 border-orange-500/30' }
    if (priority === 3) return { label: 'Urgent', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30' }
    if (priority === 4) return { label: 'Upcoming', color: 'text-blue-400 bg-blue-500/20 border-blue-500/30' }
    return { label: 'Normal', color: 'text-slate-400 bg-slate-500/20 border-slate-500/30' }
  }

  function toggleTaskComplete(taskId) {
    const todos = Storage.getTodos()
    const updated = todos.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    )
    Storage.saveTodos(updated)
    loadDashboardData() // Refresh the dashboard
  }

  // Task Card Component
  function TaskCard({ task, idx, toggleTaskComplete, formatDateTime, formatDate, getDaysUntil, getPriorityLabel }) {
                      const daysUntil = task.deadline ? getDaysUntil(task.deadline) : null
                      const isOverdue = daysUntil !== null && daysUntil < 0
                      const isToday = daysUntil === 0
                      const hasReminder = task.reminder && task.reminderTime
    const priorityInfo = getPriorityLabel(task.priority || 6)
                      
                      return (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`relative rounded-xl p-4 ${
                            isOverdue 
                              ? 'bg-red-500/10 border border-red-500/30' 
                              : isToday
                              ? 'bg-orange-500/10 border border-orange-500/30'
                              : daysUntil !== null && daysUntil <= 3
                              ? 'bg-yellow-500/10 border border-yellow-500/30'
                              : 'bg-white/5 border border-white/10'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <button
                              onClick={() => toggleTaskComplete(task.id)}
                              className="mt-1 flex-shrink-0 w-6 h-6 rounded border-2 border-slate-400 hover:border-green-400 hover:bg-green-500/10 flex items-center justify-center transition-all group"
                              title="Mark as complete"
                            >
                              <svg className="w-4 h-4 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                                                          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="font-medium">{task.title}</div>
              <span className={`text-xs px-2 py-0.5 rounded border ${priorityInfo.color}`}>
                {priorityInfo.label}
              </span>
            </div>
                              <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                                {task.deadline ? (
                                  <div className="flex items-center gap-1">
                                    <span>📅</span>
                                    <span>Deadline: {formatDateTime(task.deadline)}</span>
                                    {daysUntil !== null && (
                                      <span className={`ml-2 font-medium px-2 py-0.5 rounded ${
                                        isOverdue 
                                          ? 'text-red-400 bg-red-500/20' 
                                          : isToday 
                                          ? 'text-orange-400 bg-orange-500/20'
                                          : daysUntil <= 3
                                          ? 'text-yellow-400 bg-yellow-500/20'
                                          : 'text-green-400 bg-green-500/20'
                                      }`}>
                                        {isOverdue ? `${Math.abs(daysUntil)} days overdue` : 
                                         isToday ? 'Due today!' : 
                                         `${daysUntil} days left`}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-slate-500">
                                    <span>📝</span>
                                    <span>No deadline</span>
                                  </div>
                                )}
                                {hasReminder && (
                                  <div className="flex items-center gap-1">
                                    <span>🔔</span>
                                    <span>Reminder: {formatDateTime(task.reminderTime)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
  }

  return (
    <Page>
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-blue-400">Scrum Dashboard</h1>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-slate-400">Track your tasks, reminders, and progress</p>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5">
              <span className="text-xl">🔥</span>
              <div className="text-sm">
                <span className="font-semibold text-amber-300">Streak: {streak.current}d</span>
                <span className="text-slate-400 ml-2">(Longest {streak.longest}d)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Time Taken & AI Tasks to Focus On */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Time Taken Today */}
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-blue-500/35 to-cyan-500/35">
            <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Time Taken Today</h2>
                <Link 
                  to="/focus-time" 
                  className="text-sm text-blue-400 hover:text-blue-300 transition"
                >
                  Track →
                </Link>
              </div>
              <div className="text-center">
                <div className="text-6xl mb-4">⏱️</div>
                <div className="text-5xl font-bold mb-2 font-mono">{formatFocusTime(focusTimeToday)}</div>
                <div className="text-slate-400">Focus time today</div>
                <Link 
                  to="/focus-time"
                  className="mt-4 inline-block px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:from-blue-400 hover:to-cyan-400 transition"
                >
                  Start Focus Session
                </Link>
              </div>
            </div>
          </div>

          {/* AI Tasks to Focus On */}
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-indigo-500/35 to-purple-500/35">
            <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Tasks to Focus On</h2>
                <button
                  onClick={loadAIAdvisor}
                  disabled={loadingAdvisor}
                  className={`text-sm text-indigo-400 hover:text-indigo-300 transition disabled:opacity-50 ${loadingAdvisor ? 'animate-spin' : ''}`}
                  title="Refresh AI recommendations"
                >
                  🔄
                </button>
              </div>
              {loadingAdvisor ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4 animate-spin">🤖</div>
                  <p className="text-slate-400">AI is analyzing...</p>
                </div>
              ) : aiAdvisor?.advisor ? (
                <div>
                  {aiAdvisor.advisor.analysis && (
                    <div className="mb-4 p-3 bg-white/5 rounded-lg">
                      <p className="text-sm text-slate-300">{aiAdvisor.advisor.analysis}</p>
                    </div>
                  )}
                  {aiAdvisor.advisor.recommendedTasks && aiAdvisor.advisor.recommendedTasks.length > 0 ? (
                    <div className="space-y-3 mb-4">
                      {aiAdvisor.advisor.recommendedTasks.map((task, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg"
                        >
                          <div className="font-medium text-sm mb-1">{task.taskTitle || task.title}</div>
                          {task.reason && (
                            <div className="text-xs text-slate-400">{task.reason}</div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-slate-400">No specific tasks recommended</p>
                    </div>
                  )}
                  {aiAdvisor.advisor.motivationalMessage && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-lg border border-indigo-500/30">
                      <p className="text-sm text-indigo-300">💡 {aiAdvisor.advisor.motivationalMessage}</p>
                    </div>
                  )}
                  {aiAdvisor.advisor.suggestBreak && (
                    <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                      <p className="text-sm text-orange-300">
                        ⏸️ Break suggested: {aiAdvisor.advisor.breakReason || 'Take a rest!'}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4 opacity-50">🤖</div>
                  <p className="text-slate-400 mb-4">Get AI-powered task recommendations</p>
                  <button
                    onClick={loadAIAdvisor}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium hover:from-indigo-400 hover:to-purple-400 transition"
                  >
                    Get Recommendations
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Upcoming Tasks & Reminders */}
          <div className="lg:col-span-2">
            <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-green-500/35 to-emerald-500/35">
              <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
                                  <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Upcoming Tasks & Reminders</h2>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={loadDashboardData}
                      className="text-sm text-slate-400 hover:text-slate-300 transition"
                      title="Refresh"
                    >
                      🔄
                    </button>
                    <Link 
                      to="/todos" 
                      className="text-sm text-purple-400 hover:text-purple-300 transition"
                    >
                      View All →
                    </Link>
                  </div>
                </div>

                {upcomingTasks.length > 0 ? (
                  <div className="space-y-4">
                    {/* Overdue Tasks */}
                    {tasksByPriority.overdue.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                          <span>⚠️</span> Overdue ({tasksByPriority.overdue.length})
                        </h3>
                        <div className="space-y-2">
                          {tasksByPriority.overdue.slice(0, 3).map((task, idx) => (
                            <TaskCard key={task.id} task={task} idx={idx} toggleTaskComplete={toggleTaskComplete} formatDateTime={formatDateTime} formatDate={formatDate} getDaysUntil={getDaysUntil} getPriorityLabel={getPriorityLabel} />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Due Today */}
                    {tasksByPriority.dueToday.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
                          <span>🔥</span> Due Today ({tasksByPriority.dueToday.length})
                        </h3>
                        <div className="space-y-2">
                          {tasksByPriority.dueToday.slice(0, 3).map((task, idx) => (
                            <TaskCard key={task.id} task={task} idx={idx + tasksByPriority.overdue.length} toggleTaskComplete={toggleTaskComplete} formatDateTime={formatDateTime} formatDate={formatDate} getDaysUntil={getDaysUntil} getPriorityLabel={getPriorityLabel} />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Urgent (within 7 days) */}
                    {tasksByPriority.urgent.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                          <span>⚡</span> Urgent ({tasksByPriority.urgent.length})
                        </h3>
                        <div className="space-y-2">
                          {tasksByPriority.urgent.slice(0, 3).map((task, idx) => (
                            <TaskCard key={task.id} task={task} idx={idx + tasksByPriority.overdue.length + tasksByPriority.dueToday.length} toggleTaskComplete={toggleTaskComplete} formatDateTime={formatDateTime} formatDate={formatDate} getDaysUntil={getDaysUntil} getPriorityLabel={getPriorityLabel} />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Other Tasks */}
                    {upcomingTasks.filter(t => ![1, 2, 3].includes(t.priority)).length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-400 mb-2">Other Tasks</h3>
                        <div className="space-y-2">
                          {upcomingTasks.filter(t => ![1, 2, 3].includes(t.priority)).slice(0, 5).map((task, idx) => (
                            <TaskCard key={task.id} task={task} idx={idx + 10} toggleTaskComplete={toggleTaskComplete} formatDateTime={formatDateTime} formatDate={formatDate} getDaysUntil={getDaysUntil} getPriorityLabel={getPriorityLabel} />
                          ))}
                        </div>
                      </div>
                    )}
                    {progressData.pendingTasks > upcomingTasks.length && (
                      <div className="text-center pt-2">
                        <Link 
                          to="/todos"
                          className="text-sm text-purple-400 hover:text-purple-300 transition"
                        >
                          View {progressData.pendingTasks - upcomingTasks.length} more tasks →
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">✅</div>
                    <p className="text-slate-400 mb-4">No pending tasks. Great job!</p>
                    <Link 
                      to="/todos"
                      className="inline-block px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-medium hover:from-green-400 hover:to-emerald-400 transition"
                    >
                      Create Task
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress Report */}
          <div className="lg:col-span-1">
            <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-purple-500/35 to-pink-500/35">
              <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
                <h2 className="text-xl font-semibold mb-6">Progress Report</h2>

                {/* Completion Rate */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Completion Rate</span>
                    <span className="text-lg font-bold text-purple-400">{progressData.completionRate}%</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressData.completionRate}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Task Stats */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📋</span>
                      <span className="text-sm text-slate-300">Total Tasks</span>
                    </div>
                    <span className="text-lg font-semibold">{progressData.totalTasks}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✅</span>
                      <span className="text-sm text-slate-300">Completed</span>
                    </div>
                    <span className="text-lg font-semibold text-green-400">{progressData.completedTasks}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⏳</span>
                      <span className="text-sm text-slate-300">Pending</span>
                    </div>
                    <span className="text-lg font-semibold text-yellow-400">{progressData.pendingTasks}</span>
                  </div>

                  {progressData.overdueTasks > 0 && (
                    <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">⚠️</span>
                        <span className="text-sm text-slate-300">Overdue</span>
                      </div>
                      <span className="text-lg font-semibold text-red-400">{progressData.overdueTasks}</span>
                    </div>
                  )}
                </div>

                {/* This Week Progress */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h3 className="text-sm font-medium text-slate-300 mb-3">This Week</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Tasks this week</span>
                      <span className="font-semibold">{progressData.thisWeekTasks}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Completed</span>
                      <span className="font-semibold text-green-400">{progressData.thisWeekCompleted}</span>
                    </div>
                    {progressData.thisWeekTasks > 0 && (
                      <div className="mt-3">
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(progressData.thisWeekCompleted / progressData.thisWeekTasks) * 100}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-blue-500/35 to-cyan-500/35">
          <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/todos">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative rounded-xl p-6 bg-gradient-to-br from-green-500 to-emerald-500 hover:shadow-lg hover:shadow-green-500/30 transition cursor-pointer text-center"
                >
                  <div className="text-4xl mb-2">✅</div>
                  <div className="text-sm font-medium">Add Task</div>
                </motion.div>
              </Link>
              <Link to="/resources">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative rounded-xl p-6 bg-gradient-to-br from-blue-500 to-cyan-500 hover:shadow-lg hover:shadow-blue-500/30 transition cursor-pointer text-center"
                >
                  <div className="text-4xl mb-2">📚</div>
                  <div className="text-sm font-medium">Add Resource</div>
                </motion.div>
              </Link>
              <Link to="/focus-time">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative rounded-xl p-6 bg-gradient-to-br from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/30 transition cursor-pointer text-center"
                >
                  <div className="text-4xl mb-2">⏱️</div>
                  <div className="text-sm font-medium">Focus Time</div>
                </motion.div>
              </Link>
              <Link to="/chatbot">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative rounded-xl p-6 bg-gradient-to-br from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-500/30 transition cursor-pointer text-center"
                >
                  <div className="text-4xl mb-2">💬</div>
                  <div className="text-sm font-medium">Chatbot</div>
                </motion.div>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Page>
  )
}
