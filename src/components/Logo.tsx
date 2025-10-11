'use client';

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
      {/* SVG Logo Icon */}
      <div className={`${sizeClasses[size]} flex-shrink-0`}>
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Background circle with gradient */}
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor: '#3B82F6'}} />
              <stop offset="100%" style={{stopColor: '#1E40AF'}} />
            </linearGradient>
          </defs>
          
          {/* Main circle background */}
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            fill="url(#logoGradient)"
            stroke="#1E40AF"
            strokeWidth="2"
          />
          
          {/* Task list lines */}
          <g stroke="white" strokeWidth="3" strokeLinecap="round">
            {/* First task - completed (with checkmark) */}
            <circle cx="25" cy="30" r="3" fill="white" />
            <path d="M22 30l2 2 4-4" stroke="#10B981" strokeWidth="2" fill="none" />
            <line x1="35" y1="30" x2="70" y2="30" />
            
            {/* Second task - completed (with checkmark) */}
            <circle cx="25" cy="45" r="3" fill="white" />
            <path d="M22 45l2 2 4-4" stroke="#10B981" strokeWidth="2" fill="none" />
            <line x1="35" y1="45" x2="65" y2="45" />
            
            {/* Third task - in progress */}
            <circle cx="25" cy="60" r="3" fill="none" />
            <line x1="35" y1="60" x2="75" y2="60" />
            
            {/* Fourth task - pending */}
            <circle cx="25" cy="75" r="3" fill="none" />
            <line x1="35" y1="75" x2="60" y2="75" />
          </g>
        </svg>
      </div>
      
      {/* Logo Text */}
      {!iconOnly && (
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            TaskFlow
          </h1>
          <p className="text-xs text-gray-500 leading-tight">
            Project Manager
          </p>
        </div>
      )}
    </div>
  );
}