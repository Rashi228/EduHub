import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Dashboard from './pages/Dashboard.jsx'
import Resources from './pages/Resources.jsx'
import Streak from './pages/Streak.jsx'
import TechSkills from './pages/TechSkills.jsx'
import FocusTime from './pages/FocusTime.jsx'
import Todos from './pages/Todos.jsx'
import Chatbot from './pages/Chatbot.jsx'
// Opportunities page removed
import MoodTracker from './pages/MoodTracker.jsx'
import MedicationTracker from './pages/MedicationTracker.jsx'
import Settings from './pages/Settings.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Shell from './components/Shell.jsx'

export default function App() {
  // Authentication disabled - no auth checks needed
  // const [authed, setAuthed] = useState(false)
  // useEffect(() => {
  //   const t = localStorage.getItem('auth_token')
  //   setAuthed(!!t)
  // }, [])
  // function handleLogin() {
  //   setAuthed(true)
  // }

  return (
    <Shell>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/streak" element={<Streak />} />
          <Route path="/tech-skills" element={<TechSkills />} />
          <Route path="/focus-time" element={<FocusTime />} />
          <Route path="/todos" element={<Todos />} />
          <Route path="/chatbot" element={<Chatbot />} />
          {/* Opportunities page removed */}
          <Route path="/mood" element={<MoodTracker />} />
          <Route path="/medication" element={<MedicationTracker />} />
          <Route path="/settings" element={<Settings />} />
          {/* Authentication disabled - login/signup routes commented out */}
          {/* <Route path="/login" element={<Login onLogin={handleLogin} />} /> */}
          {/* <Route path="/signup" element={<Signup />} /> */}
        </Routes>
      </AnimatePresence>
    </Shell>
  )
}
