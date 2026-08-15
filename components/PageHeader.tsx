'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GlobalSearch } from './SearchCommand';
import { usePathname } from 'next/navigation';
import { format } from 'date-fns';
import { 
  Breadcrumb, 
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbSeparator, 
  BreadcrumbPage 
} from '@/components/ui/breadcrumb';

interface PageHeaderProps {
  title: string;
  description: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  showDate?: boolean;
  children?: React.ReactNode;
  hideSearch?: boolean;
}

export function PageHeader({ title, description, breadcrumbs, showDate = true, hideSearch = false, children }: PageHeaderProps) {
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting);
      },
      {
        rootMargin: '-64px 0px 0px 0px',
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Generate breadcrumbs from pathname if not provided
  const generatedBreadcrumbs = React.useMemo(() => {
    if (breadcrumbs) return breadcrumbs;
    if (!pathname || pathname === '/') return [{ label: 'Dashboard', href: '/dashboard' }];
    
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return [{ label: 'Dashboard' }];

    const result = [{ label: 'Dashboard', href: '/dashboard' }];
    let currentPath = '';
    
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      result.push({
        label,
        href: index === segments.length - 1 ? undefined : currentPath
      });
    });
    
    return result;
  }, [pathname, breadcrumbs]);

  return (
    <div className="mb-8 w-full max-w-full relative z-10">
      {/* Breadcrumb & Date Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pt-4">
        <Breadcrumb>
          <BreadcrumbList>
            {generatedBreadcrumbs.map((bc, index) => (
              <React.Fragment key={index}>
                <BreadcrumbItem>
                  {bc.href ? (
                    <BreadcrumbLink href={bc.href}>{bc.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="font-semibold">{bc.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {index < generatedBreadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        
        {showDate && (
          <div className="text-sm text-gray-500 hidden sm:block">
            {format(new Date(), 'EEEE, MMM d, yyyy')}
          </div>
        )}
      </div>

      {/* Page Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold mb-2 tracking-tight text-white">{title}</h1>
          <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
          {children}
        </div>
      </div>

      {/* Sentinel div */}
      <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />

      {/* Sticky Search Bar Wrapper */}
      {!hideSearch && (
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
      )}
    </div>
  );
}
