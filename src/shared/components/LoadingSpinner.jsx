import React from 'react';
import { useBranding } from '../../core/context/BrandingContext';

// ─── Branded spinner — tries to read school color, falls back to emerald ───

const LoadingSpinner = ({ message = 'Loading...', fullPage = false }) => {
  let primaryColor = '#10b981';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const branding = useBranding();
    if (branding?.primaryColor) primaryColor = branding.primaryColor;
  } catch (_) {
    // BrandingContext not available (e.g. pre-auth screens) — use default
  }

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Three bouncing dots */}
      <div className="flex items-center gap-2">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="block w-3 h-3 rounded-full animate-bounce"
            style={{
              backgroundColor: primaryColor,
              animationDelay: `${i * 0.15}s`,
              animationDuration: '0.8s',
            }}
          />
        ))}
      </div>
      {message && (
        <p className="text-sm font-medium" style={{ color: primaryColor }}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: `${primaryColor}08` }}
      >
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-16">
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
