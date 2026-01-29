'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useInterviewStore } from '@/lib/store';
import { ArrowRight } from 'lucide-react';
import { getAllCompanyProblems } from '@/data/company-problems';

interface StartInterviewButtonProps {
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  showIcon?: boolean;
}

export function StartInterviewButton({ size = 'lg', className, variant = 'default', showIcon = true }: StartInterviewButtonProps) {
  const router = useRouter();
  const { setInterviewMode, setSelectedCompanyId, setCurrentProblemId, setCode } = useInterviewStore();

  const handleStartInterview = () => {
    // Reset to real interview mode
    setInterviewMode('real');
    setSelectedCompanyId(null);

    // Get all problems from all companies and pick one randomly
    const allProblems = getAllCompanyProblems();
    if (allProblems.length > 0) {
      const randomIndex = Math.floor(Math.random() * allProblems.length);
      const randomProblem = allProblems[randomIndex];
      setCurrentProblemId(randomProblem.id);
      setCode(randomProblem.starterCode);
    }

    // Navigate to interview page
    router.push('/interview');
  };

  return (
    <Button size={size} className={className} variant={variant} onClick={handleStartInterview}>
      Start Interview {showIcon && <ArrowRight className="ml-2 w-5 h-5" />}
    </Button>
  );
}
