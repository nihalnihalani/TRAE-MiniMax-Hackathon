import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/Logo";
import { Mic, Code2, Sparkles, ArrowRight, Video, Lock, GraduationCap } from "lucide-react";
import { MetricsDashboard } from "@/components/interview/MetricsDashboard";
import { StartInterviewButton } from "@/components/interview/StartInterviewButton";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-purple-100">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 md:-top-[20%] left-[20%] w-[500px] h-[500px] bg-purple-100 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-0 md:-bottom-[20%] right-[20%] w-[500px] h-[500px] bg-blue-100 rounded-full blur-[120px] opacity-60" />
      </div>

      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-bold text-xl flex items-center gap-2">
            <Logo size={32} />
            Daytona Interview Sandbox
          </div>
          <div className="flex gap-4">
            <Link href="/test">
              <Button variant="ghost">Smoke Test</Button>
            </Link>
            <StartInterviewButton size="default" showIcon={false} />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-20 flex flex-col items-center text-center space-y-12 relative z-10">

        {/* Hero Section */}
        <div className="space-y-6 flex flex-col items-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-xs font-medium text-purple-600 animate-slide-up-fade">
            <Sparkles className="w-3 h-3" />
            <span>Mock Interview Mode Coming Soon</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight flex flex-col items-center gap-2 pb-2">
            <span className="animate-slide-up-fade">Meet <span className="animate-color-wave font-extrabold tracking-tight">Alexis</span></span>
            <span className="animate-slide-up-fade delay-200 text-4xl md:text-6xl text-muted-foreground font-normal">
              Your AI Technical Interviewer
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl animate-slide-up-fade leading-relaxed" style={{ animationDelay: '400ms' }}>
            Experience the future of technical hiring with a voice-first AI agent powered by Gemini 3 Pro.
            Real-time coding, deep analysis, and instant feedback in a secure Daytona sandbox.
          </p>

          <div className="flex flex-wrap justify-center gap-4 animate-slide-up-fade" style={{ animationDelay: '600ms' }}>
            <StartInterviewButton size="lg" className="h-14 px-8 text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-full" />
            <Link href="/practice">
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full transition-all duration-300">
                <GraduationCap className="mr-2 w-5 h-5" />
                Practice Mode
              </Button>
            </Link>
            <Link href="https://github.com/daytonaio/sdk" target="_blank">
              <Button variant="ghost" size="lg" className="h-14 px-8 text-lg rounded-full transition-all duration-300">
                View on GitHub
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mt-20 text-left">
          <Card className="hover:shadow-lg transition-all duration-300 group border-muted/60">
            <CardHeader>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Mic className="w-6 h-6 text-blue-500" />
              </div>
              <CardTitle className="text-xl">Voice-First AI</CardTitle>
              <CardDescription className="text-base">
                Converse naturally with Alexis using ElevenLabs' ultra-realistic voice synthesis. No typing required.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 group border-muted/60">
            <CardHeader>
              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Lock className="w-6 h-6 text-green-500" />
              </div>
              <CardTitle className="text-xl">Secure Sandbox</CardTitle>
              <CardDescription className="text-base">
                Execute code safely in isolated Daytona containers. Full terminal access with zero risk.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 group border-muted/60">
            <CardHeader>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-6 h-6 text-purple-500" />
              </div>
              <CardTitle className="text-xl">Gemini 3 Pro Analysis</CardTitle>
              <CardDescription className="text-base">
                Receive comprehensive feedback on code quality, complexity, and security instantly.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Metrics Dashboard Section */}
        <div className="w-full max-w-6xl mt-24 animate-slide-up-fade" style={{ animationDelay: '800ms' }}>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-2">Platform Metrics</h2>
            <p className="text-muted-foreground">Real-time performance stats from our interview engine</p>
          </div>
          <div className="bg-muted/30 border rounded-3xl p-6">
            <MetricsDashboard />
          </div>
        </div>
      </main>

      <footer className="border-t py-12 bg-muted/20 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Built with Next.js, Daytona, ElevenLabs, Gemini, and CodeRabbit.
          </p>
        </div>
      </footer>
    </div>
  );
}
