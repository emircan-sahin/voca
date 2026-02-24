import { Button } from 'poyraz-ui/atoms';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <img src="/voca_logo.png" alt="Voca" className="mb-8 h-16 w-16 opacity-40" />
      <h1 className="mb-2 text-6xl font-bold text-neutral-900">404</h1>
      <p className="mb-8 text-lg text-neutral-500">
        This page doesn&apos;t exist. Maybe it was transcribed wrong.
      </p>
      <a href="/">
        <Button>
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to home
        </Button>
      </a>
    </div>
  );
}
