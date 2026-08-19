import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 w-full bg-gray-900 text-gray-300 py-2 px-2 sm:px-4 text-center border-t border-gray-700 z-40 overflow-hidden">
      <div className="max-w-7xl mx-auto text-[9px] sm:text-[10px] leading-tight">
        <p className="font-medium leading-tight sm:leading-relaxed">
          This web portal contains proprietary and confidential information. It is intended solely for the use of authorized personnel within MPS Limited, designated stakeholders, and authorized third-party users. Any unauthorized disclosure, copying, distribution, or use of this portal or any information contained herein is strictly prohibited and may result in legal and regulatory action. The information presented is business-sensitive and subject to intellectual property protections. All recipients must maintain confidentiality and handle the information in accordance with applicable data protection and confidentiality agreements.
        </p>
        <p className="mt-1 sm:mt-2 font-medium">
          © 2026 MPS Group. All rights reserved. This software contains proprietary and strictly confidential information of the Company.
        </p>
      </div>
    </footer>
  );
};
