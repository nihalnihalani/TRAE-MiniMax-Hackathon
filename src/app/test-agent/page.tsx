'use client';

import { useState } from 'react';

export default function TestAgentPage() {
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (message: string) => {
        console.log(message);
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const handleTest = async () => {
        addLog('Testing MiniMax interview API...');
        try {
            const res = await fetch('/api/stt');
            const data = await res.json();
            addLog(`STT available: ${data.available}`);

            addLog('Sending test chat message...');
            const chatRes = await fetch('/api/interview/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: 'Hello, this is a test.',
                    history: [],
                    interviewMode: 'real',
                }),
            });
            const chatData = await chatRes.json();
            addLog(`Chat response: ${chatData.text?.slice(0, 100) || 'No text'}`);
            addLog(`Audio present: ${!!chatData.audio}`);
        } catch (err: any) {
            addLog(`Error: ${err.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Agent Test Page</h1>

                <div className="bg-gray-800 p-6 rounded-lg mb-6">
                    <button
                        onClick={handleTest}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition"
                    >
                        Run Test
                    </button>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-bold mb-4">Console Logs</h2>
                    <div className="bg-black p-4 rounded font-mono text-sm h-96 overflow-y-auto">
                        {logs.length === 0 ? (
                            <p className="text-gray-500">No logs yet. Click &quot;Run Test&quot; to begin.</p>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="mb-1">{log}</div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
