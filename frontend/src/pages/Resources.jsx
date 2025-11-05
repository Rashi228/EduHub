import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Page from '../components/Page.jsx'
import { EduHubApi } from '../lib/api.js'

export default function Resources() {
  const [resources, setResources] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: 'youtube',
    title: '',
    url: '',
    description: '',
    file: null
  })

  useEffect(() => {
    loadResources()
  }, [])

  async function loadResources() {
    setLoading(true)
    try {
      const data = await EduHubApi.getResources()
      setResources(data)
    } catch (error) {
      console.error('Failed to load resources:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const newResource = await EduHubApi.createResource({
        type: formData.type,
        title: formData.title,
        url: formData.url,
        description: formData.description
      })
      setResources([newResource, ...resources])
      setFormData({ type: 'youtube', title: '', url: '', description: '', file: null })
      setShowForm(false)
    } catch (error) {
      console.error('Failed to create resource:', error)
      alert('Failed to add resource. Please try again.')
    }
  }

  async function deleteResource(id) {
    try {
      await EduHubApi.deleteResource(id)
      setResources(resources.filter(r => r.id !== id))
    } catch (error) {
      console.error('Failed to delete resource:', error)
      alert('Failed to delete resource. Please try again.')
    }
  }

  const types = [
    { value: 'youtube', label: 'YouTube Playlist', icon: '📺' },
    { value: 'course', label: 'Course Link', icon: '🎓' },
    { value: 'pdf', label: 'PDF Document', icon: '📄' },
    { value: 'book', label: 'Book', icon: '📖' }
  ]

  const getTypeIcon = (type) => types.find(t => t.value === type)?.icon || '📚'

  // Progress calculation (goal: 10 resources = 100%)
  const goalResources = 10
  const progress = Math.min((resources.length / goalResources) * 100, 100)
  const progressColor = progress >= 100 ? 'from-green-500 to-emerald-500' : progress >= 50 ? 'from-blue-500 to-cyan-500' : 'from-purple-500 to-pink-500'

  return (
    <Page>
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Learning Resources</h1>
            <p className="text-slate-400">Manage your YouTube playlists, courses, PDFs, and books</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:from-purple-400 hover:to-pink-400 transition"
          >
            {showForm ? 'Cancel' : '+ Add Resource'}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-blue-500/35 to-cyan-500/35 mb-8">
          <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold mb-1">Resource Collection Progress</h2>
                <p className="text-sm text-slate-400">
                  {resources.length} / {goalResources} resources added
                </p>
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {Math.round(progress)}%
              </div>
            </div>
            <div className="relative h-4 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`h-full bg-gradient-to-r ${progressColor} rounded-full`}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-slate-300">
                  {resources.length >= goalResources ? '🎉 Goal Achieved!' : 'Keep adding resources!'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl p-[1px] bg-gradient-to-r from-purple-500/35 to-pink-500/35 mb-8"
          >
            <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
              <h2 className="text-xl font-semibold mb-4">Add New Resource</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Resource Type</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {types.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.value })}
                        className={`p-3 rounded-lg border-2 transition ${
                          formData.type === type.value
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="text-2xl mb-1">{type.icon}</div>
                        <div className="text-xs">{type.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Complete React Course"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {formData.type === 'pdf' ? 'Upload PDF' : 'URL/Link'}
                  </label>
                  {formData.type === 'pdf' ? (
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={e => setFormData({ ...formData, file: e.target.files[0] })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2"
                    />
                  ) : (
                    <input
                      type="url"
                      required
                      value={formData.url}
                      onChange={e => setFormData({ ...formData, url: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="https://..."
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows="3"
                    placeholder="Add notes about this resource..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:from-purple-400 hover:to-pink-400 transition disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Resource'}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {loading && resources.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 animate-pulse">📚</div>
            <p className="text-slate-400">Loading resources...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource, idx) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative rounded-2xl p-[1px] bg-gradient-to-r from-blue-500/35 to-cyan-500/35"
              >
                <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">{getTypeIcon(resource.type)}</div>
                    <button
                      onClick={() => deleteResource(resource.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{resource.title}</h3>
                  {resource.description && (
                    <p className="text-sm text-slate-400 mb-3">{resource.description}</p>
                  )}
                  {resource.url && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-purple-400 hover:text-purple-300 underline truncate block"
                    >
                      {resource.url}
                    </a>
                  )}
                  <div className="mt-3 text-xs text-slate-500">
                    {new Date(resource.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && resources.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-slate-400 mb-4">No resources yet. Add your first one!</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium"
            >
              Add Resource
            </button>
          </div>
        )}
      </section>
    </Page>
  )
}
