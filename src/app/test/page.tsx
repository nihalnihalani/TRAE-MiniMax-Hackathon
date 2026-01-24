'use client';

import { FolderGit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function TestPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Small timeout to avoid sync update warning, though empty deps usually fine
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <FolderGit2 className="w-8 h-8" />
        Smoke Test
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Monaco Editor Test</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
           <Editor
             height="100%"
             defaultLanguage="javascript"
             defaultValue="// some comment"
             theme="vs-dark"
           />
        </CardContent>
      </Card>

      <Card>
         <CardHeader>
           <CardTitle>UI Components Test</CardTitle>
         </CardHeader>
         <CardContent>
           <Button>Shadcn Button</Button>
         </CardContent>
      </Card>
    </div>
  );
}
