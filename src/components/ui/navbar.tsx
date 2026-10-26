// src/components/ui/navbar.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, X, HeartHandshake } from 'lucide-react';

export interface NavLinkItem {
  href: string;
  label: string;
  active?: boolean;
}

export interface NavbarProps {
  role?: 'student' | 'teacher' | 'guest';
  userName?: string;
  userInfo?: string;
  navLinks?: NavLinkItem[];
  onLogout?: () => void;
  className?: string;
}

export function Navbar({
  role = 'guest',
  userName,
  userInfo,
  navLinks = [],
  onLogout,
  className,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const roleBadgeMap = {
    student: { label: '학생', variant: 'sage' as const },
    teacher: { label: '선생님', variant: 'honey' as const },
    guest: { label: '방문자', variant: 'default' as const },
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b border-warm-200/80 bg-warm-50/90 backdrop-blur-md transition-all',
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & School Logo */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-sage-400 rounded-xl p-1"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sage-500 text-white shadow-warm-sm">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-sage-700 tracking-wider">
                김해영운고등학교
              </span>
              <span className="text-sm sm:text-base font-bold text-warm-900 leading-tight">
                상담 및 비밀 건의함
              </span>
            </div>
          </Link>

          {/* Role Indicator Badge */}
          {role !== 'guest' && (
            <div className="hidden sm:inline-flex ml-2">
              <Badge variant={roleBadgeMap[role].variant} size="sm">
                {roleBadgeMap[role].label}
              </Badge>
            </div>
          )}
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-3.5 py-2 text-sm font-medium rounded-xl transition-colors',
                link.active
                  ? 'bg-sage-100/80 text-sage-800'
                  : 'text-warm-700 hover:text-warm-900 hover:bg-warm-100/60'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* User Info & Actions */}
        <div className="hidden md:flex items-center gap-3">
          {(userName || userInfo) && (
            <div className="flex flex-col items-end text-right">
              {userName && (
                <span className="text-sm font-semibold text-warm-900">
                  {userName}
                </span>
              )}
              {userInfo && (
                <span className="text-xs text-warm-600">{userInfo}</span>
              )}
            </div>
          )}

          {onLogout && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onLogout}
              leftIcon={<LogOut className="h-3.5 w-3.5" />}
              className="text-warm-700 hover:text-warm-900"
            >
              로그아웃
            </Button>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center gap-2">
          {onLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              aria-label="로그아웃"
              className="px-2"
            >
              <LogOut className="h-4 w-4 text-warm-700" />
            </Button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl p-2 text-warm-700 hover:bg-warm-100 focus:outline-none focus:ring-2 focus:ring-sage-400"
            aria-label="메뉴 열기"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-warm-200/80 bg-warm-50 px-4 pt-3 pb-5 space-y-2">
          {/* User Profile Banner in Mobile Menu */}
          {(userName || userInfo) && (
            <div className="flex items-center justify-between pb-3 border-b border-warm-200/60 px-1">
              <div>
                <p className="text-sm font-bold text-warm-900">{userName}</p>
                <p className="text-xs text-warm-600">{userInfo}</p>
              </div>
              <Badge variant={roleBadgeMap[role].variant} size="sm">
                {roleBadgeMap[role].label}
              </Badge>
            </div>
          )}

          {/* Links */}
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'px-3 py-2.5 text-sm font-medium rounded-xl transition-colors',
                  link.active
                    ? 'bg-sage-100 text-sage-800'
                    : 'text-warm-800 hover:bg-warm-100'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {onLogout && (
            <div className="pt-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full justify-center"
                leftIcon={<LogOut className="h-4 w-4" />}
              >
                로그아웃
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
