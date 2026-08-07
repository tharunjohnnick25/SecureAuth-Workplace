'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumbs() {
  const pathname = usePathname();
  
  if (pathname === '/dashboard') return null;

  const paths = pathname.split('/').filter(p => p !== '');
  
  return (
    <nav className="flex items-center text-sm text-gray-400 mb-2">
      <Link href="/dashboard" className="hover:text-white transition-colors flex items-center">
        <Home className="w-4 h-4" />
      </Link>
      
      {paths.map((path, index) => {
        const href = `/${paths.slice(0, index + 1).join('/')}`;
        const isLast = index === paths.length - 1;
        
        const label = path.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        return (
          <div key={path} className="flex items-center">
            <ChevronRight className="w-4 h-4 mx-1 opacity-50" />
            {isLast ? (
              <span className="text-white font-medium">{label}</span>
            ) : (
              <Link href={href} className="hover:text-white transition-colors">
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
