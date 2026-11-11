import React from 'react';
import { X, Download } from 'lucide-react';

interface PhotoModalProps {
  photoData: string | null;
  onClose: () => void;
  orderName?: string;
}

export function PhotoModal({ photoData, onClose, orderName }: PhotoModalProps) {
  if (!photoData) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0f2547]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border-2 border-[#0f2547] flex flex-col max-h-[90vh]">
        <div className="bg-[#0f2547] text-white p-3 flex items-center justify-between">
          <div className="truncate">
            <h3 className="font-condensed font-bold text-lg leading-tight">
              Bukti Pengantaran Selesai
            </h3>
            {orderName && <p className="text-xs text-slate-300 truncate">{orderName}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-slate-900 flex items-center justify-center overflow-auto flex-1">
          <img
            src={photoData}
            alt="Bukti Pengantaran"
            className="max-h-[65vh] w-auto rounded object-contain shadow-lg"
          />
        </div>

        <div className="p-3 bg-white border-t border-slate-200 flex justify-between items-center">
          <a
            href={photoData}
            download={`bukti-${Date.now()}.jpg`}
            className="inline-flex items-center gap-1.5 text-xs text-[#0f2547] font-bold border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100"
          >
            <Download className="w-4 h-4" /> Unduh Foto
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 bg-[#0f2547] text-white rounded font-bold text-xs hover:bg-[#183a6f]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
