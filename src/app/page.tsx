import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderGit2, Mic, BrainCircuit, Terminal, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-bold text-xl flex items-center gap-2">
            <FolderGit2 className="w-6 h-6" />
            Daytona Interview Sandbox
          </div>
          <div className="flex gap-4">
             <Link href="/test">
               <Button variant="ghost">Smoke Test</Button>
             </Link>
             <Link href="/interview">
               <Button>Start Interview</Button>
             </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-16 flex flex-col items-center text-center space-y-8">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl flex flex-col items-center gap-2">
          <span className="animate-slide-up-fade">The Next Generation of</span>
          <span className="animate-shimmer animate-slide-up-fade delay-200">
            Technical Interviews
          </span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl animate-slide-up-fade" style={{ animationDelay: '400ms' }}>
          Experience a voice-first coding interview with "Alex", an AI agent powered by Gemini 3 Pro and ElevenLabs, running in a secure Daytona sandbox.
        </p>

        <div className="flex gap-4 animate-slide-up-fade" style={{ animationDelay: '600ms' }}>
          <Link href="/interview">
            <Button size="lg" className="h-12 px-8 text-lg">
              Start Interview <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="https://github.com/daytonaio/sdk" target="_blank">
            <Button variant="outline" size="lg" className="h-12 px-8 text-lg">
              View on GitHub
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-16 text-left">
          <Card>
            <CardHeader>
              <Mic className="w-10 h-10 mb-2 text-blue-500" />
              <CardTitle>Voice-First AI</CardTitle>
              <CardDescription>Conversational agent "Alex" guides you through problems naturally.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Terminal className="w-10 h-10 mb-2 text-green-500" />
              <CardTitle>Secure Sandbox</CardTitle>
              <CardDescription>Real code execution in isolated Daytona containers.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <BrainCircuit className="w-10 h-10 mb-2 text-purple-500" />
              <CardTitle>Deep Analysis</CardTitle>
              <CardDescription>Gemini 3 Pro reviews code for complexity, bugs, and security.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Built with Next.js, Daytona, ElevenLabs, and Gemini.
      </footer>
    </div>
  );
}
