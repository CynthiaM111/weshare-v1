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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-900">Loading messages...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white shadow-sm border-b p-4">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:underline mb-2"
        >
          ← Back
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <div className="flex items-center gap-2">
            {hasNewMessages && (
              <button
                onClick={() => {
                  shouldAutoScroll.current = true
                  isUserScrolledUp.current = false
                  scrollToBottom()
                  setHasNewMessages(false)
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2 animate-pulse"
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
                className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300"
                title="Enable browser notifications"
              >
                🔔
              </button>
            )}
          </div>
        </div>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollBehavior: 'smooth' }}>
        {messages.length === 0 ? (
          <div className="text-center text-gray-800 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === currentUserId
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-800 shadow'
                  }`}
                >
                  {!isOwnMessage && (
                    <p className="text-xs font-semibold mb-1">{message.sender.name}</p>
                  )}
                  <p>{message.content}</p>
                  <p className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="bg-white border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-gray-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}

