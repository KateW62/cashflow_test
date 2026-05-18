import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export function BottomSheet({ isOpen, title, onClose, children, maxWidth = 'max-w-2xl' }: BottomSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 md:p-4">
      <section className={`max-h-[86vh] w-full ${maxWidth} overflow-hidden rounded-t-3xl bg-white shadow-2xl md:rounded-3xl`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(86vh-65px)] overflow-y-auto p-4">
          {children}
        </div>
      </section>
    </div>
  );
}
