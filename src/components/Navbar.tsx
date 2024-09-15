'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Download, FlaskConical, Home } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const navItems = [
    { name: 'About', href: '/', icon: Home },
    { name: 'Prediction', href: '/prediction', icon: FlaskConical },
    { name: 'Download', href: '/download', icon: Download },
    { name: 'Help', href: '/help', icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#d2d8d2] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-auto text-[#1e2a33]">
          <span>
            <span className="block font-sans text-xl font-semibold leading-none">RSLpred 2.0</span>
            <span className="mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.12em] text-[#69736b] sm:block">Rice subcellular localization</span>
          </span>
        </Link>

        <nav className="flex h-full items-center" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex h-full items-center gap-1.5 px-2.5 text-sm font-semibold transition sm:px-4 ${isActive ? 'text-[#234b6b]' : 'text-[#626c64] hover:text-[#1e2a33]'}`}
              >
                <Icon className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">{item.name}</span>
                {isActive && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-[#466b86] sm:inset-x-4" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
