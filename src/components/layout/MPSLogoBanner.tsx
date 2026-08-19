import React from 'react';
import mpsLogo from '@/assets/mps_logo_transparent1.png';

export const MPSLogoBanner: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-white shadow-md">
      <div className="flex justify-end items-center h-16 px-4">
        <img 
          src={mpsLogo} 
          alt="MPS Logo" 
          className="h-12 w-auto object-contain"
        />
      </div>
    </div>
  );
};
