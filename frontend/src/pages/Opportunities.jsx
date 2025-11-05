import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Page from '../components/Page.jsx'
import { EduHubApi } from '../lib/api.js'

export default function Opportunities() {
  const [opportunities, setOpportunities] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    type: 'internship',
    location: '',
    description: '',
    link: '',
    deadline: ''
  })

  useEffect(() => {
    loadOpportunities()
  }, [filter])

  async function loadOpportunities() {
    try {
      const opps = await EduHubApi.getOpportunities(filter)
      setOpportunities(opps)
    } catch (error) {
      console.error('Failed to load opportunities:', error)
      setOpportunities([])
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const newOpp = await EduHubApi.createOpportunity(formData)
      setOpportunities([newOpp, ...opportunities])
      setFormData({
        title: '',
        company: '',
        type: 'internship',
        location: '',
        description: '',
        link: '',
        deadline: ''
      })
      setShowForm(false)
    } catch (error) {
      console.error('Failed to create opportunity:', error)
      alert('Failed to create opportunity. Please try again.')
    }
  }

  async function deleteOpportunity(id) {
    if (!confirm('Are you sure you want to delete this opportunity?')) {
      return
    }
    try {
      await EduHubApi.deleteOpportunity(id)
      setOpportunities(opportunities.filter(o => o.id !== id))
    } catch (error) {
      console.error('Failed to delete opportunity:', error)
      alert('Failed to delete opportunity. Please try again.')
    }
  }

  const filtered = opportunities  // Already filtered by API

  const sampleOpportunities = [
    {
      id: 'sample1',
      title: 'Software Engineering Intern',
      company: 'Tech Corp',
      type: 'internship',
      location: 'Remote',
      description: 'Learn full-stack development with React and Node.js',
      link: 'https://example.com/apply',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    },
    {
      id: 'sample2',
      title: 'Junior Developer',
      company: 'StartupXYZ',
      type: 'job',
      location: 'New York, NY',
      description: 'Join our growing team and work on exciting projects',
      link: 'https://example.com/careers',
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    }
  ]

  useEffect(() => {
    const current = Storage.getOpportunities()
    if (current.length === 0) {
      Storage.saveOpportunities(sampleOpportunities)
      setOpportunities(sampleOpportunities)
    }
  }, [])

  return (
    <Page>
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Opportunities 💼</h1>
            <p className="text-slate-400">Find internships and job openings</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium hover:from-blue-400 hover:to-cyan-400 transition"
          >
            {showForm ? 'Cancel' : '+ Add Opportunity'}
          </button>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'all'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('internship')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'internship'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            Internships
          </button>
          <button
            onClick={() => setFilter('job')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'job'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            Jobs
          </button>
        </div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl p-[1px] bg-gradient-to-r from-blue-500/35 to-cyan-500/35 mb-8"
          >
            <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
              <h2 className="text-xl font-semibold mb-4">Add Opportunity</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Software Engineering Intern"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Company</label>
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={e => setFormData({ ...formData, company: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Company name"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Type</label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="internship">Internship</option>
                      <option value="job">Full-time Job</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Remote / City, State"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Brief description..."
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Application Link</label>
                    <input
                      type="url"
                      value={formData.link}
                      onChange={e => setFormData({ ...formData, link: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Deadline (Optional)</label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium hover:from-blue-400 hover:to-cyan-400 transition"
                >
                  Add Opportunity
                </button>
              </form>
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((opp, idx) => (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="relative rounded-2xl p-[1px] bg-gradient-to-r from-blue-500/35 to-cyan-500/35"
            >
              <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    opp.type === 'internship'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {opp.type === 'internship' ? 'Internship' : 'Full-time'}
                  </span>
                  <button
                    onClick={() => deleteOpportunity(opp.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    ✕
                  </button>
                </div>
                <h3 className="text-lg font-semibold mb-2">{opp.title}</h3>
                <p className="text-sm text-blue-400 mb-2">{opp.company}</p>
                {opp.location && (
                  <p className="text-xs text-slate-400 mb-3">📍 {opp.location}</p>
                )}
                {opp.description && (
                  <p className="text-sm text-slate-300 mb-3 line-clamp-2">{opp.description}</p>
                )}
                {opp.deadline && (
                  <p className="text-xs text-orange-400 mb-3">
                    ⏰ Deadline: {new Date(opp.deadline).toLocaleDateString()}
                  </p>
                )}
                {opp.link && (
                  <a
                    href={opp.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:from-blue-400 hover:to-cyan-400 transition"
                  >
                    Apply Now →
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">💼</div>
            <p className="text-slate-400 mb-4">No opportunities yet. Add your first one!</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium"
            >
              Add Opportunity
            </button>
          </div>
        )}
      </section>
    </Page>
  )
}
