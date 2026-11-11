import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowUp,
  ArrowDown,
  Sparkles,
  MapPin,
  Check,
  Navigation,
  ExternalLink,
  Route as RouteIcon,
} from 'lucide-react';
import { Order, UserLocation } from '../types';
import { optimizeRouteOrder, buildAllRouteGoogleMapsUrl } from '../lib/geo';

interface EditRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  driverLoc: UserLocation | null;
  onSaveRouteOrder: (orderedOrders: Order[]) => Promise<void>;
}

export function EditRouteModal({
  isOpen,
  onClose,
  orders,
  driverLoc,
  onSaveRouteOrder,
}: EditRouteModalProps) {
  const [list, setList] = useState<Order[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const active = orders
        .filter((o) => o.st === 'baru' || o.st === 'jalan')
        .sort((a, b) => (a.orderIndex || 999) - (b.orderIndex || 999));
      setList(active);
    }
  }, [isOpen, orders]);

  if (!isOpen) return null;

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...list];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setList(next.map((o, i) => ({ ...o, orderIndex: i + 1 })));
  };

  const moveDown = (index: number) => {
    if (index === list.length - 1) return;
    const next = [...list];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setList(next.map((o, i) => ({ ...o, orderIndex: i + 1 })));
  };

  const handleAutoOptimize = () => {
    const optimized = optimizeRouteOrder(list, driverLoc);
    setList(optimized);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = list.map((o, i) => ({ ...o, orderIndex: i + 1 }));
      await onSaveRouteOrder(updated);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const allRouteUrl = buildAllRouteGoogleMapsUrl(list, driverLoc);

  return (
    <div className="fixed inset-0 z-50 bg-[#064e3b]/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-emerald-300 overflow-hidden">
        {/* Header: Emerald Gradient */}
        <div className="bg-gradient-to-r from-[#064e3b] to-[#047857] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <RouteIcon className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-condensed text-xl font-bold tracking-wide">
                Edit Urutan Rute Pengantaran
              </h2>
              <p className="text-xs text-emerald-100">
                Susun urutan perhentian dari stop #1 hingga terakhir
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="p-3 bg-emerald-50/60 border-b border-emerald-100 flex flex-wrap gap-2 items-center justify-between">
          <button
            type="button"
            onClick={handleAutoOptimize}
            className="flex items-center gap-1.5 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>Optimalkan Jarak Terdekat</span>
          </button>

          <a
            href={allRouteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[#064e3b] hover:text-[#047857] font-bold"
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-600" />
            <span>Buka di Google Maps</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>

        {/* Stops List */}
        <div className="p-3 overflow-y-auto flex-1 space-y-2">
          {list.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              Tidak ada order aktif untuk diurutkan.
            </div>
          ) : (
            list.map((order, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === list.length - 1;

              return (
                <div
                  key={order.id}
                  className="flex items-center gap-2.5 p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-emerald-300 transition-all"
                >
                  {/* Stop Number Badge */}
                  <div className="w-8 h-8 rounded-lg bg-[#064e3b] text-white font-condensed font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                    #{idx + 1}
                  </div>

                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-[#064e3b] truncate">
                      {order.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                      <span className="truncate">{order.addr}</span>
                    </div>
                  </div>

                  {/* Up / Down Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => moveUp(idx)}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-emerald-50 hover:text-[#064e3b] disabled:opacity-25"
                      title="Pindahkan ke atas"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => moveDown(idx)}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-emerald-50 hover:text-[#064e3b] disabled:opacity-25"
                      title="Pindahkan ke bawah"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold text-xs hover:bg-white transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-bold text-xs disabled:opacity-50 transition-colors shadow"
          >
            <Check className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan…' : 'Terapkan Urutan Rute'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
