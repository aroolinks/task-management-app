'use client';

import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
}

export default function Logo({ className = '', size = 'md', iconOnly = false }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Metalogics Logo */}
      <div className={`${sizeClasses[size]} flex-shrink-0`}>
        <Image
          src="/metalogics-logo.svg"
          alt="Metalogics Logo"
          width={48}
          height={48}
          className="w-full h-full"
          priority
        />
      </div>
      
      {/* Logo Text */}
      {!iconOnly && (
        <div className="flex flex-col">
<h1 className="text-xl font-bold text-blue-900 leading-tight">
            Metalogics
          </h1>
          <p className="text-xs text-gray-500 leading-tight">
            Task Manager
          </p>
        </div>
      )}
    </div>
  );
}
