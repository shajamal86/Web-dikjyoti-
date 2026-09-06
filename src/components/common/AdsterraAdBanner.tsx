import React from 'react';

interface AdsterraAdBannerProps {
  className?: string;
  label?: string;
}

export const AdsterraAdBanner: React.FC<AdsterraAdBannerProps> = ({
  className = '',
  label = 'Sponsored',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-3 rounded-2xl bg-[#FAF9FD] border border-[#ECE7F5] shadow-xs ${className}`}
    >
      <div className="flex items-center justify-between w-full max-w-[300px] mb-2 px-1">
        <span className="text-[10px] font-semibold text-[#9B93A8] uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div
        className="w-[300px] h-[250px] bg-white rounded-xl border border-[#ECE7F5] overflow-hidden flex items-center justify-center shadow-xs"
        style={{ minWidth: 300, minHeight: 250 }}
      >
        <iframe
          src="/adsterra-banner.html"
          width="300"
          height="250"
          title="Sponsored Ad"
          className="w-[300px] h-[250px] border-0"
          scrolling="no"
          loading="lazy"
        />
      </div>
    </div>
  );
};
