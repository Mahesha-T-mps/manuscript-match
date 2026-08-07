import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-900 text-gray-300 py-3 px-4 text-center text-sm z-50 border-t border-gray-700">
      <p className="font-medium">
        This document contains proprietary and confidential information. It is intended solely for the use of authorized personnel within MPS Limited, designated stakeholders, and authorized third-party users. Any unauthorized disclosure, copying, distribution, or use of this document or any information contained herein is strictly prohibited and may result in legal and regulatory action. The information presented is business-sensitive and subject to intellectual property protections. All recipients must maintain confidentiality and handle this document in accordance with applicable data protection and confidentiality agreements.
      </p>
    </footer>
  );
};
