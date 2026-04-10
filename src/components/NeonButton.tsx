import React from 'react';
import '../styles/electric-velocity.css';

interface NeonButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function NeonButton({ 
  children, 
  onClick, 
  disabled = false,
  variant = 'primary',
  size = 'medium',
  className = ''
}: NeonButtonProps) {
  const sizeClasses = {
    small: 'px-3 py-2 text-sm',
    medium: 'px-4 py-3 text-base',
    large: 'px-6 py-4 text-lg',
  };

  const variantClasses = {
    primary: 'ev-button',
    secondary: 'ev-button-secondary',
    success: 'ev-button-success',
    danger: 'ev-button-danger',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        rounded-lg font-semibold transition-all duration-300
        ${disabled 
          ? 'opacity-50 grayscale cursor-not-allowed pointer-events-none' 
          : 'hover:scale-105 active:scale-95 cursor-pointer'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}