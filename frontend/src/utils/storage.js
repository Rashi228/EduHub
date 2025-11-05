// Local storage utilities for learning platform
export const Storage = {
  // Resources
  getResources() {
    return JSON.parse(localStorage.getItem('eduhub_resources') || '[]')
  },
  saveResources(resources) {
    localStorage.setItem('eduhub_resources', JSON.stringify(resources))
  },
  
  // Streak
  getStreak() {
    const data = JSON.parse(localStorage.getItem('eduhub_streak') || '{}')
    return {
      current: data.current || 0,
      longest: data.longest || 0,
      lastDate: data.lastDate || null
    }
  },
  updateStreak() {
    const today = new Date().toDateString()
    const data = this.getStreak()
    if (data.lastDate === today) return data
    
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const isConsecutive = data.lastDate === yesterday.toDateString()
    
    const newStreak = isConsecutive ? data.current + 1 : 1
    const updated = {
      current: newStreak,
      longest: Math.max(data.longest, newStreak),
      lastDate: today
    }
    localStorage.setItem('eduhub_streak', JSON.stringify(updated))
    return updated
  },
  
  // Todos
  getTodos() {
    return JSON.parse(localStorage.getItem('eduhub_todos') || '[]')
  },
  saveTodos(todos) {
    localStorage.setItem('eduhub_todos', JSON.stringify(todos))
  },
  
  // Focus Time
  getFocusTime() {
    return JSON.parse(localStorage.getItem('eduhub_focusTime') || '{}')
  },
  saveFocusTime(data) {
    localStorage.setItem('eduhub_focusTime', JSON.stringify(data))
  },
  
  // Mood
  getMoods() {
    return JSON.parse(localStorage.getItem('eduhub_moods') || '[]')
  },
  saveMoods(moods) {
    localStorage.setItem('eduhub_moods', JSON.stringify(moods))
  },
  
  // Medication
  getMedications() {
    return JSON.parse(localStorage.getItem('eduhub_medications') || '[]')
  },
  saveMedications(medications) {
    localStorage.setItem('eduhub_medications', JSON.stringify(medications))
  },
  
  // Opportunities
  getOpportunities() {
    return JSON.parse(localStorage.getItem('eduhub_opportunities') || '[]')
  },
  saveOpportunities(opportunities) {
    localStorage.setItem('eduhub_opportunities', JSON.stringify(opportunities))
  }
}


