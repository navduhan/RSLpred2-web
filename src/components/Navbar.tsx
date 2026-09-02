'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Info, Terminal, CloudDownload, HelpCircle } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'About', href: '/', icon: Info },
    { name: 'Prediction', href: '/prediction', icon: Terminal },
    { name: 'Download', href: '/download', icon: CloudDownload },
    { name: 'Help', href: '/help', icon: HelpCircle },
  ];

  return (
    <header className="bg-[#00263A] text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            href="/"
            className="text-2xl font-extrabold italic tracking-tight text-white hover:text-[#1b9467] transition-colors"
          >
            RSLpred 2.0
          </Link>

          <nav className="flex items-center gap-3 sm:gap-7">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 border-b-2 py-1 text-sm font-semibold transition-all sm:text-base ${
                    isActive
                      ? 'text-[#1b9467] border-[#1b9467]'
                      : 'text-white border-transparent hover:text-[#1b9467]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden xs:inline sm:inline">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
