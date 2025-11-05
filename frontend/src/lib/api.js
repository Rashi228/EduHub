const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status, data })
  return data
}

export const AuthApi = {
  async signup({ name, email, password }) {
    return apiFetch('/api/auth/signup', { method: 'POST', body: { name, email, password } })
  },
  async login({ email, password }) {
    return apiFetch('/api/auth/login', { method: 'POST', body: { email, password } })
  },
  async me(token) {
    return apiFetch('/api/auth/me', { token })
  },
}

export const DataApi = {
  stats() {
    return apiFetch('/api/stats')
  },
  records({ limit = 20 } = {}) {
    const p = new URLSearchParams({ limit: String(limit) }).toString()
    return apiFetch(`/api/records?${p}`)
  },
  record(id) {
    return apiFetch(`/api/records/${id}`)
  },
  verify({ invoiceFile, poFile }) {
    const fd = new FormData()
    fd.append('invoice', invoiceFile)
    fd.append('po', poFile)
    return apiFetch('/api/verify', { method: 'POST', body: fd })
  },
  exportCsv({ recordIds, dateFrom, dateTo, status }) {
    return apiFetch('/api/export/csv', { method: 'POST', body: { recordIds, dateFrom, dateTo, status } })
  },
  exportReport({ recordIds, dateFrom, dateTo }) {
    return apiFetch('/api/export/report', { method: 'POST', body: { recordIds, dateFrom, dateTo } })
  },
  exportHistory({ limit = 20 } = {}) {
    const p = new URLSearchParams({ limit: String(limit) }).toString()
    return apiFetch(`/api/export/history?${p}`)
  }
}

function getToken() {
  return localStorage.getItem('auth_token')
}

export const EduHubApi = {
  // Streak
  async getStreak() {
    return apiFetch('/api/eduhub/streak', { token: getToken() })
  },
  async updateStreak() {
    return apiFetch('/api/eduhub/streak/update', { method: 'POST', token: getToken() })
  },
  // Resources
  async getResources() {
    const data = await apiFetch('/api/eduhub/resources', { token: getToken() })
    return data.items || []
  },
  async createResource(resource) {
    return apiFetch('/api/eduhub/resources', { method: 'POST', body: resource, token: getToken() })
  },
  async deleteResource(id) {
    return apiFetch(`/api/eduhub/resources/${id}`, { method: 'DELETE', token: getToken() })
  },
  // Focus
  async startFocus() {
    return apiFetch('/api/eduhub/focus/start', { method: 'POST', token: getToken() })
  },
  async stopFocus(sessionId) {
    return apiFetch('/api/eduhub/focus/stop', { method: 'POST', body: { sessionId }, token: getToken() })
  },
  async getFocusToday() {
    const data = await apiFetch('/api/eduhub/focus/today', { token: getToken() })
    return data.totalSeconds || 0
  },
  // Todos
  async getTodos() {
    const data = await apiFetch('/api/eduhub/todos', { token: getToken() })
    return data.items || []
  },
  async createTodo(todo) {
    return apiFetch('/api/eduhub/todos', { method: 'POST', body: todo, token: getToken() })
  },
  async updateTodo(todoId, updates) {
    return apiFetch(`/api/eduhub/todos/${todoId}`, { method: 'PUT', body: updates, token: getToken() })
  },
  async deleteTodo(todoId) {
    return apiFetch(`/api/eduhub/todos/${todoId}`, { method: 'DELETE', token: getToken() })
  },
  // Moods
  async getMoods(limit = 100) {
    const p = new URLSearchParams({ limit: String(limit) }).toString()
    const data = await apiFetch(`/api/eduhub/moods?${p}`, { token: getToken() })
    return data.items || []
  },
  async createMood(mood) {
    return apiFetch('/api/eduhub/moods', { method: 'POST', body: mood, token: getToken() })
  },
  async deleteMood(moodId) {
    return apiFetch(`/api/eduhub/moods/${moodId}`, { method: 'DELETE', token: getToken() })
  },
  // AI Advisor
  async getAIAdvisor() {
    return apiFetch('/api/eduhub/ai/advisor', { method: 'POST', token: getToken() })
  },
  async chatWithAI(message, history = []) {
    return apiFetch('/api/eduhub/ai/chat', { 
      method: 'POST', 
      body: { message, history }, 
      token: getToken() 
    })
  },
  // Medications
  async getMedications(limit = 100) {
    const p = new URLSearchParams({ limit: String(limit) }).toString()
    const data = await apiFetch(`/api/eduhub/medications?${p}`, { token: getToken() })
    return data.items || []
  },
  async createMedication(medication) {
    return apiFetch('/api/eduhub/medications', { method: 'POST', body: medication, token: getToken() })
  },
  async updateMedication(medicationId, updates) {
    return apiFetch(`/api/eduhub/medications/${medicationId}`, { method: 'PUT', body: updates, token: getToken() })
  },
  async deleteMedication(medicationId) {
    return apiFetch(`/api/eduhub/medications/${medicationId}`, { method: 'DELETE', token: getToken() })
  },
  async logMedicationTaken(medicationId, takenAt) {
    return apiFetch(`/api/eduhub/medications/${medicationId}/log`, { 
      method: 'POST', 
      body: { takenAt }, 
      token: getToken() 
    })
  },
  // Opportunities
  async getOpportunities(filter = 'all', limit = 100) {
    const p = new URLSearchParams({ type: filter, limit: String(limit) }).toString()
    const data = await apiFetch(`/api/eduhub/opportunities?${p}`, { token: getToken() })
    return data.items || []
  },
  async createOpportunity(opportunity) {
    return apiFetch('/api/eduhub/opportunities', { method: 'POST', body: opportunity, token: getToken() })
  },
  async updateOpportunity(opportunityId, updates) {
    return apiFetch(`/api/eduhub/opportunities/${opportunityId}`, { method: 'PUT', body: updates, token: getToken() })
  },
  async deleteOpportunity(opportunityId) {
    return apiFetch(`/api/eduhub/opportunities/${opportunityId}`, { method: 'DELETE', token: getToken() })
  },
  // Settings
  async getSettings() {
    return apiFetch('/api/eduhub/settings', { token: getToken() })
  },
  async updateSettings(settings) {
    return apiFetch('/api/eduhub/settings', { method: 'PUT', body: settings, token: getToken() })
  }
}

export const MLApi = {
  // Recommendations
  async getRecommendations(type = 'book', limit = 5) {
    return apiFetch('/api/ml/recommendations', {
      method: 'POST',
      body: { type, limit },
      token: getToken()
    })
  },
  // Task Priority Prediction
  async predictTaskPriority(task) {
    return apiFetch('/api/ml/tasks/predict-priority', {
      method: 'POST',
      body: { task },
      token: getToken()
    })
  },
  // Mood Prediction
  async predictMood() {
    return apiFetch('/api/ml/mood/predict', {
      method: 'POST',
      token: getToken()
    })
  },
  // Note Classification
  async classifyNote(note) {
    return apiFetch('/api/ml/notes/classify', {
      method: 'POST',
      body: { note },
      token: getToken()
    })
  }
}
