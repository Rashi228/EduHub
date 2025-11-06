import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import Page from '../components/Page.jsx'
import { EduHubApi } from '../lib/api.js'

export default function Chatbot() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [personality, setPersonality] = useState('layman')
  const messagesEndRef = useRef(null)
  const [loading, setLoading] = useState(false)

  const personalities = {
    layman: {
      name: 'Layman',
      icon: '👤',
      description: 'Simple, easy explanations',
      style: 'Explain things simply and clearly, like talking to a friend.'
    },
    girly: {
      name: 'Girly Bossy',
      icon: '💅',
      description: 'Sassy and motivational',
      style: 'Be sassy, motivational, and use lots of emojis. Push them to succeed!'
    },
    ceo: {
      name: 'CEO Expert',
      icon: '💼',
      description: 'Professional and strategic',
      style: 'Be professional, strategic, and business-focused. Give expert advice.'
    },
    friendly: {
      name: 'Friendly Mentor',
      icon: '🤝',
      description: 'Warm and supportive',
      style: 'Be warm, supportive, and encouraging. Act like a caring mentor.'
    },
    energetic: {
      name: 'Energetic Coach',
      icon: '⚡',
      description: 'High energy and enthusiastic',
      style: 'Be super energetic, enthusiastic, and motivating! Use lots of exclamation points!'
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function callAI(userMessage) {
    try {
      const history = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }))
      const styleCue = personalities[personality]?.style || ''
      const composedMessage = styleCue ? `${styleCue}\n\nQuestion: ${userMessage}` : userMessage
      
      console.log('Calling AI with message:', composedMessage.substring(0, 100))
      const res = await EduHubApi.chatWithAI(composedMessage, history)
      console.log('AI response received:', res)
      
      if (!res || !res.response) {
        console.error('Invalid response from API:', res)
        return 'Sorry, I received an invalid response from the AI service.'
      }
      
      return res.response
    } catch (error) {
      console.error('Error calling AI:', error)
      throw error
    }
  }

  function handleSend() {
    if (!input.trim()) return

    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')

  // Call backend AI
  ;(async () => {
    try {
      setLoading(true)
      console.log('Starting AI call...')
      const aiText = await callAI(userMessage.text)
      console.log('AI text received:', aiText)
      
      if (!aiText || aiText.trim() === '') {
        throw new Error('Empty response from AI')
      }
      
      const botMessage = {
        id: Date.now() + 1,
        text: aiText,
        sender: 'bot',
        timestamp: new Date(),
        personality: personality
      }
      setMessages(prev => [...prev, botMessage])
    } catch (e) {
      console.error('Error in handleSend:', e)
      const errorMessage = e.message || 'Unknown error occurred'
      const botMessage = {
        id: Date.now() + 1,
        text: `Sorry, I had trouble reaching the AI service. Error: ${errorMessage}. Please check the browser console and backend logs for more details.`,
        sender: 'bot',
        timestamp: new Date(),
        personality: personality
      }
      setMessages(prev => [...prev, botMessage])
    } finally {
      setLoading(false)
      console.log('AI call completed')
    }
  })()
  }

  return (
    <Page>
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-blue-400">AI Chatbot 💬</h1>
          <p className="text-slate-400">Get explanations in your preferred style</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">Choose Personality</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(personalities).map(([key, p]) => (
              <button
                key={key}
                onClick={() => setPersonality(key)}
                className={`p-4 rounded-lg border-2 transition ${
                  personality === key
                    ? 'border-blue-500 bg-blue-600/20'
                    : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="text-3xl mb-2">{p.icon}</div>
                <div className="text-xs font-medium">{p.name}</div>
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-400 mt-3">
            Current: <span className="text-blue-400">{personalities[personality].name}</span> - {personalities[personality].description}
          </p>
        </div>

        <div className="relative rounded-2xl border border-slate-600 mb-6">
          <div className="rounded-xl bg-slate-800 p-6 h-[500px] flex flex-col">
            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-slate-400 py-12">
                  <div className="text-6xl mb-4">💬</div>
                  <p>Start a conversation! Ask me anything and I'll explain it in {personalities[personality].name.toLowerCase()} style.</p>
                </div>
              ) : (
                messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg p-4 ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-100'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                      <div className="text-xs opacity-60 mt-2">
                        {msg.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              {loading && (
                <div className="text-center text-slate-400 py-2 text-sm">Thinking...</div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="relative rounded-2xl border border-slate-600">
          <div className="rounded-xl bg-slate-800 p-6">
            <h3 className="text-lg font-semibold mb-3">Try asking:</h3>
            <div className="grid md:grid-cols-2 gap-2">
              {[
                'What is React?',
                'Explain machine learning',
                'How do I stay motivated?',
                'What skills should I learn?'
              ].map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(question)
                    setTimeout(() => handleSend(), 100)
                  }}
                  className="text-left p-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition text-sm text-slate-200"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Page>
  )
}


