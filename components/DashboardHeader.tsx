'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GlobalSearch } from './SearchCommand';

interface DashboardHeaderProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function DashboardHeader({ title, description, children }: DashboardHeaderProps) {
  const [isSticky, setIsSticky] = useState(false);
  // Sentinel sits just above the search bar. When it scrolls out of view,
  // the search bar has reached the navbar — activate sticky styles.
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // IntersectionObserver works correctly inside ANY scroll container
    // (unlike window.scrollY which stays at 0 when <main> has overflow-y-auto).
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel leaves the viewport (scrolled past), activate sticky styles
        setIsSticky(!entry.isIntersecting);
      },
      {
        // rootMargin accounts for the 64px fixed navbar height so the transition
        // triggers exactly when the search bar would dock under the navbar
        rootMargin: '-64px 0px 0px 0px',
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mb-8">
      {/* Page Title & Actions — always rendered above search bar, always visible */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 tracking-tight text-white">{title}</h1>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {children}
        </div>
      </div>

      {/* Sentinel div — sits just above the search bar. IntersectionObserver watches this. */}
      <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />

      {/*
        Sticky Search Bar Wrapper
        ─────────────────────────
        z-[35]: above page content (z-auto) but below the navbar (z-[50])
                and below the sidebar (z-[45]) so nothing clips through.
        top-16:  64px = exact height of the fixed Navbar. The search bar docks
                 flush under the navbar with zero gap when sticky.
        A solid bg + shadow are applied while sticky (no backdrop-blur to avoid
        a double-blur overlap with the page content behind the navbar).
      */}
      <div
        className={[
          'sticky top-16 z-[35] w-full',
          'transition-all duration-300 ease-in-out',
          'rounded-xl',
          isSticky
            ? [
                'bg-[#020617]/95',
                'border border-white/10',
                'shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]',
                'py-2.5 px-4',
                // negative horizontal margin so bar extends edge-to-edge
                '-mx-4 sm:-mx-6 lg:-mx-8',
                'w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)]',
                'rounded-none',
              ].join(' ')
            : 'bg-transparent border-transparent py-0',
        ].join(' ')}
      >
        <div className="max-w-2xl mx-auto lg:mx-0">
          <GlobalSearch />
        </div>
      </div>
    </div>
  );
}

