'use client';

import { useEffect } from 'react';

export default function NotesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Notes Page Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-900/20 text-white p-8">
      <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong in Secure Notes!</h2>
      <div className="bg-black/50 p-4 rounded-lg font-mono text-sm mb-4 max-w-2xl overflow-auto text-left w-full border border-red-500/30">
        <p className="text-red-400 font-bold">Error Message:</p>
        <p className="break-all">{error.message}</p>
        {error.stack && (
          <>
            <p className="text-red-400 font-bold mt-4">Stack Trace:</p>
            <pre className="text-xs text-gray-300 mt-2">{error.stack}</pre>
          </>
        )}
      </div>
      <button
        className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded font-bold"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
