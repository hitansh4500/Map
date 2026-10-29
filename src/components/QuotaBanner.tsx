import React from 'react';

interface QuotaBannerProps {
  visible: boolean;
  onDismiss?: () => void;
}

export const QuotaBanner: React.FC<QuotaBannerProps> = ({ visible, onDismiss }) => {
  if (!visible) return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 backdrop-blur-md text-amber-200 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-lg flex items-center justify-between">
      <div className="flex-1 text-center">
        <span>
          Google Maps Platform quota reached. If you are the app owner, visit{' '}
          <a
            href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold text-amber-300 hover:text-amber-100"
          >
            maps developer site
          </a>{' '}
          for instructions to update your account.
        </span>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-amber-400 hover:text-amber-200 ml-3 text-sm px-1.5 py-0.5 rounded focus:outline-none"
        >
          ✕
        </button>
      )}
    </div>
  );
};
