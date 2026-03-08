 'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface ChatMessage {
  id?: number
  role: 'user' | 'ai'
  content: string
  timestamp?: string
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [remaining, setRemaining] = useState(15)
  const [userId, setUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        loadChatHistory(user.id)
      }
    }
    getUser()
  }, [])

  const loadChatHistory = async (uid: string) => {
    try {
      const { data: history } = await supabase
        .from('ai_chat_history')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: true })
        .limit(20)

      if (history && history.length > 0) {
        const formattedHistory: ChatMessage[] = history.flatMap((h: any) => [
          { role: 'user' as const, content: h.message, timestamp: h.created_at },
          { role: 'ai' as const, content: h.response, timestamp: h.created_at }
        ])
        setMessages(formattedHistory)
      }
    } catch (error) {
      console.error('Chat tarixini yuklashda xatolik:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!inputMessage.trim() || !userId || isLoading) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setIsLoading(true)

    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setMessages(prev => [...prev, { role: 'ai', content: 'Tushunaman, tahlil qilmoqdam...' }])

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-business-analyst`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            user_id: userId,
            action: 'chat',
            message: userMessage
          })
        }
      )

      const data = await response.json()

      if (response.status === 429) {
        setMessages(prev => [...prev.slice(0, -1), { 
          role: 'ai', 
          content: 'Kunlik limit tugadi! Ertaga qayta urinib koriting yoki premium ga oting.' 
        }])
        setRemaining(0)
      } else if (data.success) {
        setMessages(prev => [...prev.slice(0, -1), { 
          role: 'ai', 
          content: data.response 
        }])
        setRemaining(data.remaining || remaining - 1)
      } else {
        setMessages(prev => [...prev.slice(0, -1), { 
          role: 'ai', 
          content: `Xatolik yuz berdi: ${data.error}` 
        }])
      }
    } catch (error) {
      console.error('Xatolik:', error)
      setMessages(prev => [...prev.slice(0, -1), { 
        role: 'ai', 
        content: 'Tarmoq xatosi yuz berdi. Qayta urinib koriting.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = async () => {
    if (!userId) return
    
    await supabase
      .from('ai_chat_history')
      .delete()
      .eq('user_id', userId)
    
    setMessages([])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-2xl shadow-lg p-4 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">AI Biznes Maslahatchi</h1>
                <p className="text-sm text-gray-500">Sizning biznesingiz tahlilchisi</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-gray-500">Qolgan sorovlar: </span>
                <span className={`font-bold ${remaining <= 3 ? 'text-red-500' : 'text-green-500'}`}>
                  {remaining}
                </span>
              </div>
              <button 
                onClick={clearChat}
                className="text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                Suhbatni tozalash
              </button>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4" style={{ minHeight: '500px', maxHeight: '500px', overflowY: 'auto' }}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="text-6xl mb-4">💼</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Xush kelibsiz!</h2>
              <p className="text-gray-500 mb-6">
                Men sizning biznesingizni tahlil qilish va maslahat berish uchun tayyorman.
              </p>
              <div className="grid grid-cols-2 gap-4 text-left max-w-md">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <span className="text-lg">📊</span>
                  <p className="text-sm text-gray-700">Biznesingiz tahlili</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <span className="text-lg">📦</span>
                  <p className="text-sm text-gray-700">Tovarlar tahlili</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <span className="text-lg">👥</span>
                  <p className="text-sm text-gray-700">Xodimlar baholashi</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <span className="text-lg">💡</span>
                  <p className="text-sm text-gray-700">Foyda maslahatlari</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    {msg.timestamp && (
                      <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString('uz-UZ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Biznesingiz haqida savol bering..."
              className="flex-1 p-4 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
              disabled={isLoading || remaining === 0}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim() || remaining === 0}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? 'Yuborilmoqda...' : 'Yuborish'}
            </button>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button 
              onClick={() => setInputMessage("Biznesim holati qanday?")}
              className="text-xs px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              📊 Biznes holati
            </button>
            <button 
              onClick={() => setInputMessage("Eng kop sotilgan tovarlar qaysilar?")}
              className="text-xs px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              📦 Eng kop sotilgan
            </button>
            <button 
              onClick={() => setInputMessage("Xodimlarimning ishi qanday?")}
              className="text-xs px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              👥 Xodimlar bahosi
            </button>
            <button 
              onClick={() => setInputMessage("Qarzlarni qanday kamaytirishim mumkin?")}
              className="text-xs px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              💳 Qarzlar
            </button>
            <button 
              onClick={() => setInputMessage("Oylik solishtirma tahlil ber")}
              className="text-xs px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              📈 Oylik tahlil
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="text-center mt-4 text-sm text-gray-500">
          <p>Kunlik limit: 15 sorov. AI javoblari ozbek tilida.</p>
        </div>
      </div>
    </div>
  )
}

