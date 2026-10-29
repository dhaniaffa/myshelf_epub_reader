import React from 'react';

export interface AppLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  variant?: 'solid' | 'outline';
}

/**
 * MyShelf Brand App Logo
 * Transparent background, supports dynamic color via Tailwind (e.g. text-primary) or currentColor.
 */
export const AppLogo: React.FC<AppLogoProps> = ({
  size = 24,
  variant = 'solid',
  className = '',
  ...props
}) => {
  if (variant === 'outline') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="14 14 36 36"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
      >
        <path d="M32 20c-4-3-10-4-16-3v27c6-1 12 0 16 3 4-3 10-4 16-3V17c-6-1-12 0-16 3Z" />
        <path d="M32 20v27" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="14 14 36 36"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      {...props}
    >
      {/* Left Page */}
      <path d="M30.5 20.3c-3.7-2.8-9.1-3.7-14.5-3.3v27c5.4-.9 10.8 0 14.5 2.7V20.3Z" />
      {/* Right Page */}
      <path d="M33.5 20.3v26.4c3.7-2.7 9.1-3.6 14.5-2.7v-27c-5.4-.4-10.8.5-14.5 3.3Z" />
    </svg>
  );
};
