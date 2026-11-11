import React, { useState } from 'react';
import {
  Navigation,
  Copy,
  Camera,
  CheckCircle,
  AlertOctagon,
  MapPin,
  Phone,
  Volume2,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Send,
  Eye,
  MessageCircle,
  ChevronDown,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Order, UserLocation } from '../types';
import {
  buildSingleGoogleMapsUrl,
  getWhatsAppUrl,
  cleanPhoneNumber,
  speakOrderDetails,
} from '../lib/geo';

interface OrderCardProps {
  order: Order;
  index: number;
  totalOrders: number;
  isOwner: boolean;
  driverLoc: UserLocation | null;
  onStartDelivery: (id: string) => Promise<void>;
  onTriggerPhoto: (id: string) => void;
  onCompleteWithoutPhoto: (id: string) => Promise<void>;
  onReportFail: (id: string) => void;
  onSendCurrentLocation: (id: string) => Promise<void>;
  onViewPhoto: (id: string) => void;
  onEditOrder: (order: Order) => void;
  onDeleteOrder: (id: string) => Promise<void>;
  onMoveOrderUp?: (id: string) => void;
  onMoveOrderDown?: (id: string) => void;
  onToast: (msg: string, bad?: boolean) => void;
  onSimulateOverdue?: (id: string) => Promise<void> | void;
}

export function OrderCard({
  order,
  index,
  totalOrders,
  isOwner,
  driverLoc,
  onStartDelivery,
  onTriggerPhoto,
  onCompleteWithoutPhoto,
  onReportFail,
  onSendCurrentLocation,
  onViewPhoto,
  onEditOrder,
  onDeleteOrder,
  onMoveOrderUp,
  onMoveOrderDown,
  onToast,
  onSimulateOverdue,
}: OrderCardProps) {
  const [showWaMenu, setShowWaMenu] = useState(false);
  const isJalan = order.st === 'jalan';
  const isSelesai = order.st === 'selesai';
  const isGagal = order.st === 'gagal';
  const isBaru = order.st === 'baru';

  // Hitung durasi berjalan dari waktu startAt (ms)
  const elapsedMinutes =
    isJalan && order.startAt ? Math.floor((Date.now() - order.startAt) / 60000) : null;
  const isOverdue = elapsedMinutes !== null && elapsedMinutes >= 120;

  const orderNum = order.orderIndex || index + 1;

  let borderStyle = 'border-l-[6px] border-l-amber-400 bg-white';
  let badgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
  let statusText = 'Baru';

  if (isJalan) {
    borderStyle = isOverdue
      ? 'border-l-[6px] border-l-amber-500 bg-amber-50/20'
      : 'border-l-[6px] border-l-[#16a34a] bg-emerald-50/20';
    badgeClass = isOverdue
      ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
      : 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
    statusText = 'Sedang Diantar';
  } else if (isSelesai) {
    borderStyle = 'border-l-[6px] border-l-[#22c55e] bg-white';
    badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    statusText = 'Selesai';
  } else if (isGagal) {
    borderStyle = 'border-l-[6px] border-l-rose-500 bg-white';
    badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
    statusText = 'Kendala';
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(`${order.name}\n${order.addr}`);
    onToast('Alamat disalin ke clipboard!');
  };

  const handleSpeak = () => {
    speakOrderDetails(order);
    onToast('🔊 Membacakan alamat pengantaran…');
  };

  const formatTime = (ts?: number | null) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const gMapsUrl = buildSingleGoogleMapsUrl(order, driverLoc);
  const hasPhone = Boolean(cleanPhoneNumber(order.tel));

  return (
    <article
      className={`rounded-2xl border border-emerald-100 ${borderStyle} p-4 shadow-sm hover:shadow-md transition-all mb-3 relative overflow-visible`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2.5 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Order Sequence Badge in Fresh Green */}
          <div className="w-7 h-7 rounded-lg bg-[#16a34a] text-white font-condensed font-bold text-sm flex items-center justify-center shrink-0 shadow-xs border border-emerald-500">
            #{orderNum}
          </div>

          <h3 className="font-condensed text-xl font-bold text-[#14532d] leading-tight truncate">
            {order.name}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs ${badgeClass}`}
          >
            {statusText}
          </span>

          {/* Overdue Badge if duration exceeds 120 minutes */}
          {isOverdue && (
            <span
              className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white border border-amber-600 shadow-2xs flex items-center gap-1 animate-pulse"
              title="Pengantaran sudah melebihi 120 menit dari startAt"
            >
              <Clock className="w-3 h-3" /> &gt;120M
            </span>
          )}

          {/* Voice Text-to-Speech Button */}
          <button
            type="button"
            onClick={handleSpeak}
            className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/60 rounded-lg transition-colors"
            title="Bacakan alamat ini dengan suara"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onEditOrder(order)}
            className="p-1.5 text-slate-400 hover:text-[#16a34a] hover:bg-emerald-50 rounded-lg transition-colors"
            title="Edit Rincian Order"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Overdue Alert Banner if delivery duration > 120 minutes */}
      {isOverdue && (
        <div className="flex items-center justify-between gap-2.5 text-xs text-amber-950 bg-amber-50/95 border-2 border-amber-300 p-2.5 rounded-xl mb-3 shadow-2xs">
          <div className="flex items-start gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <span className="font-bold block leading-tight text-amber-900">
                Peringatan SLA: Pengantaran &gt;120 Menit ({Math.floor(elapsedMinutes / 60)}j {elapsedMinutes % 60}m)
              </span>
              <span className="text-[11px] text-amber-800 leading-tight block mt-0.5">
                Mulai sejak {formatTime(order.startAt)}. Harap periksa kendala di jalan atau segera selesaikan order.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Address */}
      <p className="text-sm text-slate-700 mb-2.5 leading-snug break-words font-normal">
        {order.addr || '(Alamat belum diisi)'}
      </p>

      {/* Metadata Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-600 mb-3.5 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100/80">
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-slate-400 w-16 shrink-0">Driver:</span>
          <span className="font-bold text-[#14532d] truncate">
            {order.driver || 'Belum ditugaskan'}
          </span>
        </div>

        {order.tel && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400 w-16 shrink-0">Penerima:</span>
            <a
              href={`tel:${order.tel}`}
              className="text-[#15803d] font-bold hover:underline inline-flex items-center gap-1"
              title="Panggil Telepon"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>{order.tel}</span>
            </a>
          </div>
        )}

        {order.note && (
          <div className="flex items-start gap-2 sm:col-span-2">
            <span className="font-semibold text-slate-400 w-16 shrink-0">Catatan:</span>
            <span className="text-slate-800 break-words font-medium">{order.note}</span>
          </div>
        )}

        <div className="flex items-center gap-2 sm:col-span-2 text-[11px]">
          <span className="font-semibold text-slate-400 w-16 shrink-0">Titik Peta:</span>
          {order.lat != null ? (
            <span className="text-emerald-800 font-semibold flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-emerald-200">
              <MapPin className="w-3 h-3 text-emerald-600" /> Akurat ({order.lat.toFixed(4)}, {order.lng?.toFixed(4)})
            </span>
          ) : (
            <span className="text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-200">
              Mencari lewat teks alamat
            </span>
          )}
        </div>

        {order.dLat != null && isJalan && (
          <div className="flex items-center gap-2 sm:col-span-2 text-[11px] text-emerald-800 font-semibold">
            <span className="font-semibold text-slate-400 w-16 shrink-0">Posisi:</span>
            <span>Driver update pukul {formatTime(order.dAt)}</span>
          </div>
        )}

        {isJalan && order.startAt && (
          <div className="flex items-center gap-2 sm:col-span-2 text-[11px]">
            <span className="font-semibold text-slate-400 w-16 shrink-0">Waktu Mulai:</span>
            <span
              className={`font-semibold flex items-center gap-1.5 ${
                isOverdue ? 'text-amber-700 font-bold' : 'text-emerald-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                Pukul {formatTime(order.startAt)} • Berjalan{' '}
                {elapsedMinutes !== null && elapsedMinutes >= 60
                  ? `${Math.floor(elapsedMinutes / 60)}j ${elapsedMinutes % 60}m`
                  : `${elapsedMinutes} menit`}
              </span>
            </span>
          </div>
        )}

        {order.doneAt && (
          <div className="flex items-center gap-2 sm:col-span-2 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-400 w-16 shrink-0">Selesai:</span>
            <span>{new Date(order.doneAt).toLocaleString('id-ID')}</span>
          </div>
        )}

        {isGagal && order.failReason && (
          <div className="flex items-start gap-2 sm:col-span-2 text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
            <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>
              Kendala: <b>{order.failReason}</b>
            </span>
          </div>
        )}
      </div>

      {/* Main Action Buttons: Google Maps & Direct WhatsApp */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Google Maps Navigasi */}
        <a
          href={gMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-xs transition-all active:scale-95"
          title="Buka Navigasi Google Maps Langsung"
        >
          <Navigation className="w-3.5 h-3.5 fill-white" />
          <span>Google Maps</span>
        </a>

        {/* WhatsApp Button with Template Dropdown */}
        {hasPhone ? (
          <div className="relative">
            <a
              href={getWhatsAppUrl(order, 'otw')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-xs transition-all active:scale-95"
              title="Kirim pesan WhatsApp: Sedang OTW ke lokasi"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-white" />
              <span>WA OTW</span>
            </a>
          </div>
        ) : null}

        {/* Copy Address */}
        <button
          type="button"
          onClick={handleCopy}
          className="p-2.5 text-slate-600 hover:text-[#16a34a] hover:bg-emerald-50 rounded-xl border border-slate-300 transition-colors"
          title="Salin Nama & Alamat"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        {/* Delivery State Actions */}
        {isBaru && (
          <button
            type="button"
            onClick={() => onStartDelivery(order.id)}
            className="flex-1 min-w-[120px] bg-[#14532d] hover:bg-[#16a34a] text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all"
          >
            Mulai Antar
          </button>
        )}

        {isJalan && (
          <button
            type="button"
            onClick={() => onTriggerPhoto(order.id)}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-xs py-2.5 px-3.5 rounded-xl shadow-sm transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Foto & Selesai</span>
          </button>
        )}

        {isSelesai && order.hasPhoto && (
          <button
            type="button"
            onClick={() => onViewPhoto(order.id)}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 border border-emerald-300 bg-emerald-50 px-3.5 py-2 rounded-xl transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-700" /> Lihat Foto Bukti
          </button>
        )}
      </div>

      {/* Sub Controls: Urutan Naik/Turun & In-Transit secondary buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-emerald-100 text-xs">
        {/* Reorder Stop Up/Down */}
        {(isBaru || isJalan) && (
          <div className="flex items-center gap-1 text-slate-500">
            <span className="text-[11px] font-semibold text-slate-400">Urutan Stop:</span>
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMoveOrderUp && onMoveOrderUp(order.id)}
              className="p-1 rounded-md text-slate-600 hover:bg-emerald-50 disabled:opacity-25"
              title="Pindahkan stop ke atas"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={index === totalOrders - 1}
              onClick={() => onMoveOrderDown && onMoveOrderDown(order.id)}
              className="p-1 rounded-md text-slate-600 hover:bg-emerald-50 disabled:opacity-25"
              title="Pindahkan stop ke bawah"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* In-Transit Secondary Actions */}
        {isJalan && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onCompleteWithoutPhoto(order.id)}
              className="text-slate-600 hover:text-slate-900 underline text-xs"
            >
              Selesai tanpa foto
            </button>
            <button
              type="button"
              onClick={() => onReportFail(order.id)}
              className="text-rose-600 hover:text-rose-800 underline text-xs font-semibold"
            >
              Kendala
            </button>
            <button
              type="button"
              onClick={() => onSendCurrentLocation(order.id)}
              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 text-xs font-bold"
              title="Kirim lokasi GPS saya sekarang"
            >
              <Send className="w-3 h-3" /> Kirim Posisi
            </button>
            {onSimulateOverdue && elapsedMinutes !== null && elapsedMinutes < 120 && (
              <button
                type="button"
                onClick={() => onSimulateOverdue(order.id)}
                className="text-amber-700 hover:text-amber-900 text-xs font-bold underline ml-1"
                title="Uji simulasi pengantaran >120 menit untuk memicu toast performa otomatis"
              >
                Tes &gt;120m
              </button>
            )}
          </div>
        )}

        {/* Delete button (Owner only) */}
        {isOwner && (
          <button
            type="button"
            onClick={() => onDeleteOrder(order.id)}
            className="text-rose-600 hover:text-rose-800 ml-auto inline-flex items-center gap-1 text-xs font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" /> Hapus
          </button>
        )}
      </div>
    </article>
  );
}
