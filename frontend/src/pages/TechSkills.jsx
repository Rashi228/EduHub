import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Page from '../components/Page.jsx'

export default function TechSkills() {
  const [skills] = useState([
    { name: 'AI & Machine Learning', trend: 'rising', description: 'Build intelligent systems with Python, TensorFlow, and PyTorch', icon: '🤖', demand: 'Very High' },
    { name: 'Web3 & Blockchain', trend: 'rising', description: 'Decentralized applications, smart contracts, and DeFi', icon: '⛓️', demand: 'High' },
    { name: 'Cloud Computing', trend: 'rising', description: 'AWS, Azure, GCP - essential for modern development', icon: '☁️', demand: 'Very High' },
    { name: 'Cybersecurity', trend: 'stable', description: 'Protect systems and data from threats', icon: '🔒', demand: 'Very High' },
    { name: 'DevOps', trend: 'rising', description: 'CI/CD, Docker, Kubernetes - streamline development', icon: '⚙️', demand: 'High' },
    { name: 'Data Science', trend: 'rising', description: 'Extract insights from data with Python and SQL', icon: '📊', demand: 'High' },
    { name: 'Mobile Development', trend: 'stable', description: 'React Native, Flutter for cross-platform apps', icon: '📱', demand: 'High' },
    { name: 'Quantum Computing', trend: 'emerging', description: 'Next-generation computing technology', icon: '⚛️', demand: 'Emerging' },
    { name: 'AR/VR Development', trend: 'rising', description: 'Immersive experiences with Unity and Unreal', icon: '🥽', demand: 'Medium' },
    { name: 'Low-Code/No-Code', trend: 'rising', description: 'Build apps faster with visual development', icon: '🎨', demand: 'High' }
  ])

  const trends = [
    { title: 'AI Integration Everywhere', desc: 'AI tools are becoming essential in every domain - from coding assistants to content creation', icon: '🚀' },
    { title: 'Remote Work Skills', desc: 'Collaboration tools, async communication, and self-management are crucial', icon: '💻' },
    { title: 'Sustainability Tech', desc: 'Green tech and sustainable software development practices', icon: '🌱' },
    { title: 'Edge Computing', desc: 'Processing data closer to the source for faster responses', icon: '📡' }
  ]

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'rising': return 'from-green-500/35 to-emerald-500/35'
      case 'emerging': return 'from-purple-500/35 to-pink-500/35'
      default: return 'from-blue-500/35 to-cyan-500/35'
    }
  }

  const getDemandColor = (demand) => {
    if (demand === 'Very High') return 'text-red-400'
    if (demand === 'High') return 'text-orange-400'
    if (demand === 'Emerging') return 'text-purple-400'
    return 'text-blue-400'
  }

  return (
    <Page>
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Tech Skills & Trends 🚀</h1>
          <p className="text-slate-400">Stay ahead with the most in-demand technologies</p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Industry Trends</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {trends.map((trend, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative rounded-2xl p-[1px] bg-gradient-to-r from-indigo-500/35 to-purple-500/35"
              >
                <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{trend.icon}</div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{trend.title}</h3>
                      <p className="text-sm text-slate-400">{trend.desc}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Hot Skills to Learn</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((skill, idx) => (
              <motion.div
                key={skill.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`relative rounded-2xl p-[1px] bg-gradient-to-r ${getTrendColor(skill.trend)}`}
              >
                <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">{skill.icon}</div>
                    <span className={`text-xs font-medium ${getDemandColor(skill.demand)}`}>
                      {skill.demand}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{skill.name}</h3>
                  <p className="text-sm text-slate-400 mb-3">{skill.description}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      skill.trend === 'rising' ? 'bg-green-500/20 text-green-400' :
                      skill.trend === 'emerging' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {skill.trend === 'rising' ? '📈 Rising' :
                       skill.trend === 'emerging' ? '✨ Emerging' :
                       '➡️ Stable'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Page>
  )
}





