'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface SubAgentMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
}

export interface SubAgentProps {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  isLoading?: boolean;
  messages: SubAgentMessage[];
  onSendMessage: (message: string) => Promise<void>;
  placeholder?: string;
}

export function SubAgent({
  id,
  name,
  description,
  icon: Icon,
  iconColor,
  bgColor,
  borderColor,
  isLoading = false,
  messages,
  onSendMessage,
  placeholder = "Ask a question..."
}: SubAgentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(input.trim());
      setInput('');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} overflow-hidden transition-all duration-200`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconColor} bg-white/10`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="font-medium text-sm">{name}</div>
            <div className="text-xs text-muted-foreground">{description}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {messages.length > 0 && (
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-white/10">
          {/* Messages */}
          <div className="max-h-48 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                No messages yet. Ask me something!
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`text-xs p-2 rounded ${
                    msg.role === 'user'
                      ? 'bg-blue-500/20 ml-4'
                      : 'bg-white/5 mr-4'
                  }`}
                >
                  <div className="font-medium mb-1 opacity-60">
                    {msg.role === 'user' ? 'You' : name}
                  </div>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
              disabled={isSending}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="px-2"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
