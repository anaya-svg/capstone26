import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Bot, Download } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { handleDownload } from '../utils/downloadHelper'

const QUICK_PROMPTS = [
  'Prediksi stok 30 hari ke depan',
  'Apa item yang harus restock sekarang?',
  'Apa persiapan resource untuk event mendatang?',
  'Ringkas risiko operasional minggu ini',
  'Aset mana yang disarankan untuk maintenance?',
  'Ringkasan finansial bulan ini',
  'Trend inventory fast-moving'
]

function SnapFunny() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    const savedMessages = sessionStorage.getItem('snapfunny_chat_history')
    return savedMessages ? JSON.parse(savedMessages) : []
  })
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const [position, setPosition] = useState(() => {
    const savedPosition = sessionStorage.getItem('snapfunny_position')
    return savedPosition ? JSON.parse(savedPosition) : { right: 24, bottom: 24 }
  })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const hasDraggedRef = useRef(false)

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('snapfunny_chat_history', JSON.stringify(messages))
    }
  }, [messages])

  useEffect(() => {
    sessionStorage.setItem('snapfunny_position', JSON.stringify(position))
  }, [position])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (overrideMessage = null) => {
    const userMessage = (overrideMessage ?? inputValue).trim()
    if (!userMessage) return

    setInputValue('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/chatbot/chat`, {
        method: 'POST',
        headers: (() => {
          const hdrs = { 'Content-Type': 'application/json' };
          const userData = sessionStorage.getItem('user');
          if (userData) {
            try {
              const { session_token } = JSON.parse(userData);
              if (session_token) hdrs['Authorization'] = `Bearer ${session_token}`;
            } catch {}
          }
          return hdrs;
        })(),
        body: JSON.stringify({ message: userMessage })
      })

      const data = await response.json()
      
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickPrompt = (prompt) => {
    if (isLoading) return
    handleSendMessage(prompt)
  }

  const renderMessageContent = (content) => {
    const downloadLinks = []
    let processedContent = content
    let matchIndex = 0
    
    processedContent = processedContent.replace(/\[([^\]]+)\]\((download:[^)]+)\)/g, (match, linkText, href) => {
      const placeholder = `__DOWNLOAD_LINK_${matchIndex}__`
      console.log('Found download link:', { match, linkText, href })
      downloadLinks.push({ placeholder, linkText, href })
      matchIndex++
      return placeholder
    })
    
    const parts = processedContent.split(/(__DOWNLOAD_LINK_\d+__)/g)
    
    return parts.map((part, index) => {
      const linkMatch = part.match(/__DOWNLOAD_LINK_(\d+)__/)
      if (linkMatch) {
        const linkIndex = parseInt(linkMatch[1])
        const linkData = downloadLinks[linkIndex]
        if (linkData) {
          console.log('Rendering download button:', linkData.href)
          return (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Download button clicked, href:', linkData.href, 'type:', typeof linkData.href)
                handleDownload(linkData.href).catch((error) => {
                  console.error('Download failed:', error)
                  setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `Sorry, download failed: ${error?.message || 'unknown error'}`
                  }])
                })
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors cursor-pointer"
              type="button"
            >
              <Download size={14} />
              {linkData.linkText}
            </button>
          )
        }
      }
      
      if (!part.trim()) {
        return null
      }
      
      return (
        <ReactMarkdown
          key={index}
          components={{
            p: ({node, ...props}) => <p className="mb-0 last:mb-0" {...props} />,
            strong: ({node, ...props}) => <strong className="font-bold text-inherit" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc ml-4 my-2" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal ml-4 my-2" {...props} />,
            li: ({node, ...props}) => <li className="mb-1" {...props} />,
            a: ({node, href, children, ...props}) => {
              if (href && href.startsWith('download:')) {
                return null
              }
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                  {...props}
                >
                  {children}
                </a>
              )
            }
          }}
        >
          {part}
        </ReactMarkdown>
      )
    })
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleChat = () => {
    if (hasDraggedRef.current) return
    setIsOpen(!isOpen)
    if (!isOpen && messages.length === 0) {
      setMessages([{ role: 'assistant', content: 'Hi, Aku SnapFunny! Ada yang bisa aku bantu?' }])
    }
  }

  const handleMouseDown = (e) => {
    setIsDragging(true)
    hasDraggedRef.current = false
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0
    dragOffsetRef.current = { x: clientX, y: clientY }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e) => {
      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0
      const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0

      const deltaX = clientX - dragOffsetRef.current.x
      const deltaY = clientY - dragOffsetRef.current.y

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasDraggedRef.current = true
      }

      setPosition((prev) => ({
        right: Math.max(0, prev.right - deltaX),
        bottom: Math.max(0, prev.bottom - deltaY)
      }))

      dragOffsetRef.current = { x: clientX, y: clientY }
    }

    const handleUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [isDragging])

  return (
    <div className="z-50">
      {/* Chat Box */}
      {isOpen && (
        <div
          className="fixed w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
          style={{ right: position.right, bottom: position.bottom + 80 }}
        >
          <div
            className="bg-gradient-to-r from-purple-800 to-indigo-800 text-white p-4 flex items-center justify-between cursor-move"
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
          >
            <div className="flex items-center gap-3">
              <img src="/snapfun_mascot_header.png" alt="SnapFunny" className="w-10 h-10 rounded-full object-cover" />
              <div>
                <h3 className="font-bold text-lg">SnapFunny</h3>
                <p className="text-xs text-white/80">AI Assistant</p>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-purple-800 to-indigo-800 text-white shadow-md'
                      : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                  }`}
                >
                  <div className="text-sm prose prose-sm max-w-none">
                    {renderMessageContent(message.content)}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-200">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleQuickPrompt(prompt)}
                  disabled={isLoading}
                  className="whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full border border-purple-400 bg-purple-200 text-purple-900 hover:bg-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tanya SnapFunny..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-700 focus:border-transparent text-sm"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="w-10 h-10 bg-gradient-to-r from-purple-800 to-indigo-800 rounded-full flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={toggleChat}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        style={{ right: position.right, bottom: position.bottom }}
        className={`fixed flex items-center gap-3 bg-gradient-to-r from-purple-800 to-indigo-800 text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 \${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <img src="/snapfun_mascot.png" alt="SnapFunny" className="w-8 h-8 rounded-full object-cover" />
        <span className="font-semibold text-sm">Ask me!</span>
      </button>
    </div>
  )
}

export default SnapFunny

