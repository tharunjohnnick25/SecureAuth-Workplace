'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import {
  LayoutDashboard,
  Shield,
  Smartphone,
  Bell,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Security', href: '/security', icon: Shield },
  { name: 'Devices', href: '/devices', icon: Smartphone },
  { name: 'Alerts', href: '/notifications', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#020617]/90 backdrop-blur-xl border-t border-white/10 safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const tKey = item.name.toLowerCase();
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px]',
                isActive
                  ? 'text-blue-400'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                isActive ? 'bg-blue-600/20' : ''
              )}>
                <item.icon className={cn('w-5 h-5', isActive ? 'text-blue-400' : '')} />
              </div>
              <span className="text-[10px] font-medium leading-none">{t(tKey) !== tKey ? t(tKey) : item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
