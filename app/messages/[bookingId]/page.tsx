'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'

interface Message {
  id: string
  content: string
  senderId: string
  receiverId: string
  read: boolean
  createdAt: string
  sender: {
    id: string
    name: string
  }
  receiver: {
    id: string
    name: string
  }
}

export default function MessagesPage() {
  const router = useRouter()
  const params = useParams()
  const bookingId = params.bookingId as string
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [lastMessageCount, setLastMessageCount] = useState(0)
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const isUserScrolledUp = useRef(false)
  const messagesRef = useRef<Message[]>([])
  const lastNotificationTime = useRef<number>(0)
  const shouldAutoScroll = useRef(true) // Only auto-scroll on initial load or when user sends a message
  const isUserScrolling = useRef(false) // Track if user is actively scrolling
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const markMessagesAsRead = useCallback(async () => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) return

    const user = JSON.parse(userStr)

    try {
      await fetch(`/api/messages/${bookingId}/read`, {
        method: 'PATCH',
        headers: {
          'x-user-id': user.id,
        },
      })
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }, [bookingId])

  const checkForNewMessages = useCallback(async () => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) return

    const user = JSON.parse(userStr)
    const currentMessageCount = messagesRef.current.length

    try {
      const response = await fetch(`/api/messages/${bookingId}`, {
        headers: {
          'x-user-id': user.id,
        },
      })

      if (!response.ok) {
        return
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response from messages API')
        return
      }

      const data = await response.json()
      
      // Check if there are new messages
      if (data.length > currentMessageCount && currentMessageCount > 0) {
        const newMessages = data.slice(currentMessageCount)
        const hasNewFromOthers = newMessages.some((msg: Message) => msg.senderId !== user.id)
        
        if (hasNewFromOthers) {
          const now = Date.now()
          // Throttle notifications to avoid spam (max 1 per 3 seconds)
          if (now - lastNotificationTime.current > 3000) {
            setHasNewMessages(true)
            lastNotificationTime.current = now
            
            // Always show toast notification
            const latestMessage = newMessages[newMessages.length - 1]
            const senderName = latestMessage.sender?.name || 'Someone'
            toast.success(`New message from ${senderName}!`, {
              duration: 4000,
              action: {
                label: 'View',
                onClick: () => {
                  shouldAutoScroll.current = true
                  isUserScrolledUp.current = false
                  scrollToBottom()
                  setHasNewMessages(false)
                },
              },
            })
            
            // Show browser notification if permission granted and user might not be looking
            if (typeof window !== 'undefined' && 'Notification' in window && notificationPermission === 'granted') {
              // Only show browser notification if page is not in focus
              if (!document.hasFocus()) {
                new Notification('New Message', {
                  body: `${senderName}: ${latestMessage.content.substring(0, 50)}${latestMessage.content.length > 50 ? '...' : ''}`,
                  icon: '/favicon.ico',
                  tag: `message-${bookingId}`,
                })
              }
            }
          }
        }
      }
      
      setMessages(data)
      messagesRef.current = data
      setLastMessageCount(data.length)
      
      // Mark new messages as read if user is viewing the page (at bottom)
      if (!isUserScrolledUp.current && data.length > currentMessageCount) {
        const newMessages = data.slice(currentMessageCount)
        const newUnreadMessages = newMessages.filter((msg: Message) => msg.receiverId === user.id && !msg.read)
        if (newUnreadMessages.length > 0) {
          // Mark as read in background
          markMessagesAsRead()
        }
      }
      
      // NEVER auto-scroll if:
      // 1. User is scrolled up
      // 2. User is actively scrolling
      // 3. Auto-scroll is disabled
      if (!isUserScrolledUp.current && shouldAutoScroll.current && !isUserScrolling.current) {
        // Double-check scroll position before scrolling
        const container = messagesContainerRef.current
        if (container) {
          const { scrollTop, scrollHeight, clientHeight } = container
          const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
          if (isAtBottom) {
            setTimeout(() => {
              // Check again before scrolling (user might have scrolled in the meantime)
              if (!isUserScrolledUp.current && shouldAutoScroll.current && !isUserScrolling.current) {
                scrollToBottom()
              }
            }, 100)
          }
        }
      } else if (isUserScrolledUp.current) {
        // If user is scrolled up, disable auto-scroll
        shouldAutoScroll.current = false
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }, [bookingId, markMessagesAsRead])

  const fetchMessages = async () => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      router.push('/login')
      return
    }

    const user = JSON.parse(userStr)

    try {
      const response = await fetch(`/api/messages/${bookingId}`, {
        headers: {
          'x-user-id': user.id,
        },
      })

      if (!response.ok) {
        // Check if response is JSON
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch messages')
        } else {
          throw new Error('Failed to fetch messages')
        }
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response from messages API')
        throw new Error('Invalid response from server')
      }

      const data = await response.json()
      setMessages(data)
      messagesRef.current = data
      setLastMessageCount(data.length)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
    markMessagesAsRead()
    
    // Request notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission)
        })
      } else {
        setNotificationPermission(Notification.permission)
      }
    }
  }, [bookingId, markMessagesAsRead])

  // Poll for new messages every 2 seconds for better real-time feel
  useEffect(() => {
    if (loading) return
    
    const interval = setInterval(() => {
      checkForNewMessages()
    }, 2000)
    return () => clearInterval(interval)
  }, [loading, checkForNewMessages, notificationPermission])

  // Track scroll position to detect if user is scrolled up
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current
    if (!messagesContainer) return

    const handleScroll = () => {
      // Mark that user is actively scrolling
      isUserScrolling.current = true
      
      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      // After user stops scrolling for 150ms, check position
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrolling.current = false
        
        const { scrollTop, scrollHeight, clientHeight } = messagesContainer
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight
        const wasScrolledUp = isUserScrolledUp.current
        
        // Check if user is near bottom (within 100px)
        isUserScrolledUp.current = distanceFromBottom > 100
        shouldAutoScroll.current = !isUserScrolledUp.current
        
        // If user scrolls back to bottom, re-enable auto-scroll
        if (wasScrolledUp && !isUserScrolledUp.current) {
          shouldAutoScroll.current = true
          setHasNewMessages(false)
        } else if (isUserScrolledUp.current) {
          // User has scrolled up, disable auto-scroll
          shouldAutoScroll.current = false
        }
      }, 150)
    }

    messagesContainer.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      messagesContainer.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [messages])

  // Only auto-scroll on initial load
  useEffect(() => {
    if (!loading && messages.length > 0 && shouldAutoScroll.current) {
      // Small delay to ensure container is rendered
      setTimeout(() => {
        if (shouldAutoScroll.current && !isUserScrolling.current) {
          scrollToBottom()
        }
      }, 200)
    }
  }, [loading]) // Only run when loading changes, not when messages change

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      router.push('/login')
      return
    }

    const user = JSON.parse(userStr)
    setSending(true)

    try {
      const response = await fetch(`/api/messages/${bookingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ content: newMessage }),
      })

      if (!response.ok) {
        // Check if response is JSON
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to send message')
        } else {
          const text = await response.text()
          console.error('Non-JSON error response:', text)
          throw new Error('Failed to send message. Please try again.')
        }
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        throw new Error('Invalid response from server')
      }

      const data = await response.json()
      const updatedMessages = [...messages, data]
      setMessages(updatedMessages)
      messagesRef.current = updatedMessages
      setLastMessageCount(updatedMessages.length)
      setNewMessage('')
      // Always scroll to bottom after sending a message
      shouldAutoScroll.current = true
      isUserScrolledUp.current = false
      setTimeout(() => scrollToBottom(), 100)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
  const currentUserId = userStr ? JSON.parse(userStr).id : null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-semibold text-gray-700">Loading messages...</div>
        </div>
      </div>
    )
  }

  // Get the other participant's name
  const otherParticipant = messages.find(m => m.senderId !== currentUserId)?.sender || 
                          messages.find(m => m.receiverId !== currentUserId)?.receiver

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Go back"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Messages</h1>
                {otherParticipant && (
                  <p className="text-sm text-gray-600">Chatting with {otherParticipant.name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasNewMessages && (
                <button
                  onClick={() => {
                    shouldAutoScroll.current = true
                    isUserScrolledUp.current = false
                    scrollToBottom()
                    setHasNewMessages(false)
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-full hover:from-blue-700 hover:to-blue-800 flex items-center gap-2 shadow-lg animate-pulse transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  New Messages
                </button>
              )}
              {notificationPermission === 'default' && (
                <button
                  onClick={async () => {
                    if ('Notification' in window) {
                      const permission = await Notification.requestPermission()
                      setNotificationPermission(permission)
                      if (permission === 'granted') {
                        toast.success('Notifications enabled! You\'ll be notified of new messages.')
                      }
                    }
                  }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  title="Enable browser notifications"
                >
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef} 
        className="flex-1 overflow-y-auto px-4 py-6" 
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-200 rounded-full mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No messages yet</h3>
              <p className="text-gray-600">Start the conversation by sending a message below!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isOwnMessage = message.senderId === currentUserId
                const prevMessage = index > 0 ? messages[index - 1] : null
                const showSenderName = !isOwnMessage && (!prevMessage || prevMessage.senderId !== message.senderId)
                const showTimeSeparator = prevMessage && 
                  new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 300000 // 5 minutes
                
                return (
                  <div key={message.id}>
                    {showTimeSeparator && (
                      <div className="flex items-center justify-center my-4">
                        <div className="flex items-center gap-2">
                          <div className="h-px bg-gray-300 flex-1 w-16"></div>
                          <span className="text-xs text-gray-500 font-medium">
                            {new Date(message.createdAt).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </span>
                          <div className="h-px bg-gray-300 flex-1 w-16"></div>
                        </div>
                      </div>
                    )}
                    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-1`}>
                      <div className={`flex items-end gap-2 max-w-[75%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isOwnMessage && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mb-1">
                            {message.sender.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          {showSenderName && (
                            <span className="text-xs font-semibold text-gray-700 mb-1 px-2">
                              {message.sender.name}
                            </span>
                          )}
                          <div
                            className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                              isOwnMessage
                                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm'
                                : 'bg-white text-gray-900 border border-gray-200 rounded-tl-sm'
                            }`}
                          >
                            <p className={`text-sm leading-relaxed ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>
                              {message.content}
                            </p>
                            <div className={`flex items-center gap-1 mt-1.5 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                              <span className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                                {new Date(message.createdAt).toLocaleTimeString('en-US', { 
                                  hour: 'numeric', 
                                  minute: '2-digit',
                                  hour12: true 
                                })}
                              </span>
                              {isOwnMessage && (
                                <svg className="w-3.5 h-3.5 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSendMessage} className="flex items-end gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-2xl text-gray-900 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none focus:bg-white placeholder:text-gray-400 transition-all"
                disabled={sending}
              />
            </div>
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>Send</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

