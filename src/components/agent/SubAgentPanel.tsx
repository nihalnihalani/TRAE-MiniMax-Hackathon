'use client';

import { useState, useCallback } from 'react';
import { SubAgent, SubAgentMessage } from './SubAgent';
import { useInterviewStore } from '@/lib/store';
import { Code2, Bug, Lightbulb, FileSearch } from 'lucide-react';

interface SubAgentState {
  messages: SubAgentMessage[];
  isLoading: boolean;
}

export function SubAgentPanel() {
  const { code, workspaceId, addLog } = useInterviewStore();

  const [codeReviewer, setCodeReviewer] = useState<SubAgentState>({
    messages: [],
    isLoading: false
  });

  const [debugAssistant, setDebugAssistant] = useState<SubAgentState>({
    messages: [],
    isLoading: false
  });

  const [hintProvider, setHintProvider] = useState<SubAgentState>({
    messages: [],
    isLoading: false
  });

  const [codeExplainer, setCodeExplainer] = useState<SubAgentState>({
    messages: [],
    isLoading: false
  });

  const handleCodeReviewerMessage = useCallback(async (message: string) => {
    setCodeReviewer(prev => ({
      ...prev,
      messages: [...prev.messages, { role: 'user', content: message, timestamp: Date.now() }],
      isLoading: true
    }));

    try {
      const res = await fetch('/api/subagent/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, query: message, workspaceId })
      });
      const data = await res.json();
      const response = data.response || data.error || 'No response';

      setCodeReviewer(prev => ({
        messages: [...prev.messages, { role: 'agent', content: response, timestamp: Date.now() }],
        isLoading: false
      }));
    } catch (err) {
      setCodeReviewer(prev => ({
        messages: [...prev.messages, { role: 'agent', content: 'Error: Failed to get response', timestamp: Date.now() }],
        isLoading: false
      }));
    }
  }, [code, workspaceId]);

  const handleDebugMessage = useCallback(async (message: string) => {
    setDebugAssistant(prev => ({
      ...prev,
      messages: [...prev.messages, { role: 'user', content: message, timestamp: Date.now() }],
      isLoading: true
    }));

    try {
      const res = await fetch('/api/subagent/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, query: message, workspaceId })
      });
      const data = await res.json();
      const response = data.response || data.error || 'No response';

      setDebugAssistant(prev => ({
        messages: [...prev.messages, { role: 'agent', content: response, timestamp: Date.now() }],
        isLoading: false
      }));
    } catch (err) {
      setDebugAssistant(prev => ({
        messages: [...prev.messages, { role: 'agent', content: 'Error: Failed to get response', timestamp: Date.now() }],
        isLoading: false
      }));
    }
  }, [code, workspaceId]);

  const handleHintMessage = useCallback(async (message: string) => {
    setHintProvider(prev => ({
      ...prev,
      messages: [...prev.messages, { role: 'user', content: message, timestamp: Date.now() }],
      isLoading: true
    }));

    try {
      const res = await fetch('/api/subagent/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, query: message, workspaceId })
      });
      const data = await res.json();
      const response = data.response || data.error || 'No response';

      setHintProvider(prev => ({
        messages: [...prev.messages, { role: 'agent', content: response, timestamp: Date.now() }],
        isLoading: false
      }));
    } catch (err) {
      setHintProvider(prev => ({
        messages: [...prev.messages, { role: 'agent', content: 'Error: Failed to get response', timestamp: Date.now() }],
        isLoading: false
      }));
    }
  }, [code, workspaceId]);

  const handleExplainerMessage = useCallback(async (message: string) => {
    setCodeExplainer(prev => ({
      ...prev,
      messages: [...prev.messages, { role: 'user', content: message, timestamp: Date.now() }],
      isLoading: true
    }));

    try {
      const res = await fetch('/api/subagent/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, query: message, workspaceId })
      });
      const data = await res.json();
      const response = data.response || data.error || 'No response';

      setCodeExplainer(prev => ({
        messages: [...prev.messages, { role: 'agent', content: response, timestamp: Date.now() }],
        isLoading: false
      }));
    } catch (err) {
      setCodeExplainer(prev => ({
        messages: [...prev.messages, { role: 'agent', content: 'Error: Failed to get response', timestamp: Date.now() }],
        isLoading: false
      }));
    }
  }, [code, workspaceId]);

  return (
    <div className="flex flex-col gap-2 p-3 h-full overflow-y-auto">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        AI Assistants
      </div>

      <SubAgent
        id="code-reviewer"
        name="Code Reviewer"
        description="Reviews code quality & best practices"
        icon={Code2}
        iconColor="text-green-400"
        bgColor="bg-green-900/10"
        borderColor="border-green-500/20"
        isLoading={codeReviewer.isLoading}
        messages={codeReviewer.messages}
        onSendMessage={handleCodeReviewerMessage}
        placeholder="Ask about code quality..."
      />

      <SubAgent
        id="debug-assistant"
        name="Debug Assistant"
        description="Helps identify & fix bugs"
        icon={Bug}
        iconColor="text-red-400"
        bgColor="bg-red-900/10"
        borderColor="border-red-500/20"
        isLoading={debugAssistant.isLoading}
        messages={debugAssistant.messages}
        onSendMessage={handleDebugMessage}
        placeholder="Describe the bug..."
      />

      <SubAgent
        id="hint-provider"
        name="Hint Provider"
        description="Provides subtle hints without solutions"
        icon={Lightbulb}
        iconColor="text-yellow-400"
        bgColor="bg-yellow-900/10"
        borderColor="border-yellow-500/20"
        isLoading={hintProvider.isLoading}
        messages={hintProvider.messages}
        onSendMessage={handleHintMessage}
        placeholder="What are you stuck on?"
      />

      <SubAgent
        id="code-explainer"
        name="Code Explainer"
        description="Explains code concepts & patterns"
        icon={FileSearch}
        iconColor="text-blue-400"
        bgColor="bg-blue-900/10"
        borderColor="border-blue-500/20"
        isLoading={codeExplainer.isLoading}
        messages={codeExplainer.messages}
        onSendMessage={handleExplainerMessage}
        placeholder="What do you want explained?"
      />
    </div>
  );
}
