import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({ title, onClose, children, size = 'md' }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1C1916]/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${sizeClass[size]} bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5DFD5]">
          <h2 className="text-xl font-semibold text-[#1C1916]" style={{ fontFamily: "'Georgia', serif" }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B6460] hover:bg-[#F7F3EC] hover:text-[#1C1916] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
