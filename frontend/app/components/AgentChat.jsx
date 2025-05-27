'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function AgentChat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isAgentOnline, setIsAgentOnline] = useState(true);
    const messagesEndRef = useRef(null);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const loadConversationHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('agent_notifications')
                .select('id, created_at, content, type, actions')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Failed to load history', error);
                return;
            }

            const history = data.map((row) => ({
                id: row.id,
                role: row.type === 'user_message' ? 'user' : 'assistant',
                content: row.content,
                timestamp: row.created_at,
                actions: row.actions || undefined,
                type: row.type === 'agent_message' ? 'proactive' : undefined,
            }));

            setMessages(history);
        } catch (err) {
            console.error('Error loading history', err);
        }
    };

    useEffect(() => {
        const channel = supabase
            .channel('agent-notifications')
            .on('broadcast', { event: 'notification' }, (payload) => {
                handleNotification(payload);
            })
            .subscribe();
        loadConversationHistory();
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleNotification = (payload) => {
        if (payload.type === 'agent_message') {
            setMessages(prev => [...prev, {
                id: Date.now(),
                role: 'assistant',
                content: payload.content,
                timestamp: new Date(),
                type: 'proactive'
            }]);
        }
    };

    const sendMessage = async () => {
        if (!input.trim()) return;
        const userMessage = {
            id: Date.now(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);
        try {
            const response = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: input })
            });
            const data = await response.json();
            setMessages(prev => [...prev, {
                id: Date.now(),
                role: 'assistant',
                content: data.message,
                timestamp: new Date(),
                actions: data.actions
            }]);
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsTyping(false);
        }
    };

    const handleQuickAction = async (action) => {
        await sendMessage(action.prompt);
    };

    const handleAction = async (action) => {
        if (action.prompt) {
            await sendMessage(action.prompt);
            return;
        }

        if (action.action === 'navigate' && action.target) {
            window.location = action.target;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <div className="bg-white shadow-sm border-b px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${isAgentOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <h2 className="text-lg font-semibold">Lead Generation Assistant</h2>
                    </div>
                    <div className="text-sm text-gray-500">
                        AI-powered partner for your outreach
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {messages.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500 mb-4">
                            Hi! I'm your lead generation assistant. How can I help you today?
                        </p>
                        <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                            <QuickActionButton
                                onClick={() => handleQuickAction({ prompt: "Show me today's campaign performance" })}
                                icon="📊"
                                text="Today's Performance"
                            />
                            <QuickActionButton
                                onClick={() => handleQuickAction({ prompt: "Find new leads to research" })}
                                icon="🔍"
                                text="Find New Leads"
                            />
                            <QuickActionButton
                                onClick={() => handleQuickAction({ prompt: "Schedule a campaign for replied leads" })}
                                icon="📧"
                                text="Schedule Campaign"
                            />
                            <QuickActionButton
                                onClick={() => handleQuickAction({ prompt: "What tasks do I have today?" })}
                                icon="✅"
                                text="Today's Tasks"
                            />
                        </div>
                    </div>
                )}
                {messages.map((message) => (
                    <Message key={message.id} message={message} onAction={handleAction} />
                ))}
                {isTyping && (
                    <div className="flex items-center space-x-2 text-gray-500">
                        <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <span className="text-sm">Assistant is typing...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="bg-white border-t px-6 py-4">
                <div className="flex space-x-4">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Ask about leads, campaigns, or give instructions..."
                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isTyping}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}

function Message({ message, onAction }) {
    const isUser = message.role === 'user';
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-2xl px-4 py-2 rounded-lg ${
                isUser ? 'bg-blue-600 text-white' : 'bg-white border'
            } ${message.type === 'proactive' ? 'border-yellow-300' : ''}`}>
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.actions && (
                    <div className="mt-2 space-y-1">
                        {message.actions.map((action, idx) => (
                            <button
                                key={idx}
                                onClick={() => onAction(action)}
                                className="block w-full text-left px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
                <div className="text-xs mt-1 opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
}

function QuickActionButton({ onClick, icon, text }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center space-x-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
        >
            <span className="text-xl">{icon}</span>
            <span className="text-sm">{text}</span>
        </button>
    );
}
