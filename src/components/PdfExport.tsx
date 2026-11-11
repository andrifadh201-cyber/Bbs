import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { FileDown, Trash2, AlertTriangle, CheckCircle, RefreshCw, Printer } from 'lucide-react';
import { Order } from '../types';
import { fetchPhotoApi } from '../lib/supabase';

interface PdfExportProps {
  orders: Order[];
  selectedDate: string;
  selectedDriver: string;
  isOwner: boolean;
  onResetDate: () => Promise<void>;
  onResetAll: () => Promise<void>;
  onToast: (msg: string, bad?: boolean) => void;
}

export function PdfExport({
  orders,
  selectedDate,
  selectedDriver,
  isOwner,
  onResetDate,
  onResetAll,
  onToast,
}: PdfExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const filtered = orders.filter((o) => {
    const orderDate = new Date(o.doneAt || o.at).toLocaleDateString('sv');
    const matchesDate = orderDate === selectedDate;
    const matchesDriver = !selectedDriver || o.driver === selectedDriver;
    return matchesDate && matchesDriver;
  });

  const handleGeneratePdf = async () => {
    if (filtered.length === 0) {
      onToast('Tidak ada pengantaran pada tanggal ini untuk dibuatkan PDF.', true);
      return;
    }

    setIsGenerating(true);
    onToast('Menyusun PDF rekap harian…');

    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = 210;
      const H = 297;
      const M = 15;
      let y = M;

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(`DRIVER BBS - Rekap Pengantaran ${selectedDate}`, M, y + 4);
      y += 9;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const driverLabel = selectedDriver ? `Driver: ${selectedDriver}` : 'Semua Driver';
      const selesaiCount = filtered.filter((o) => o.st === 'selesai').length;
      const gagalCount = filtered.filter((o) => o.st === 'gagal').length;
      doc.text(
        `${driverLabel}  |  Total: ${filtered.length}  |  Selesai: ${selesaiCount}  |  Kendala: ${gagalCount}`,
        M,
        y
      );
      y += 7;

      doc.setDrawColor(5, 150, 105);
      doc.setLineWidth(0.6);
      doc.line(M, y, W - M, y);
      y += 6;

      let idx = 0;
      for (const order of filtered) {
        idx++;
        let imgData: string | null = null;
        if (order.hasPhoto) {
          try {
            imgData = await fetchPhotoApi(order.id);
          } catch {
            imgData = null;
          }
        }

        const t1 = doc.splitTextToSize(
          `${idx}. ${order.name} (Driver: ${order.driver || '-'})`,
          W - 2 * M
        );
        const t2 = doc.splitTextToSize(
          `${order.addr || '-'}${order.note ? ' | Catatan: ' + order.note : ''}`,
          W - 2 * M
        );

        const startTime = order.startAt
          ? new Date(order.startAt).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '-';
        const doneTime = order.doneAt
          ? new Date(order.doneAt).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '-';
        const t3 = `Mulai: ${startTime}  |  Selesai: ${doneTime}  |  Status: ${order.st.toUpperCase()}${
          order.failReason ? ' (' + order.failReason + ')' : ''
        }`;

        let imgH = 0;
        let imgW = 0;
        if (imgData) {
          imgW = 80;
          imgH = 60;
        }

        const blockHeight = (t1.length + t2.length + 1) * 5 + (imgData ? imgH + 4 : 6) + 6;
        if (y + blockHeight > H - M) {
          doc.addPage();
          y = M;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(t1, M, y + 4);
        y += t1.length * 5 + 1;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(t2, M, y + 3);
        y += t2.length * 4.5 + 1;

        doc.setTextColor(order.st === 'gagal' ? 198 : 5, order.st === 'gagal' ? 47 : 150, 105);
        doc.text(t3, M, y + 3);
        doc.setTextColor(0, 0, 0);
        y += 6;

        if (imgData) {
          try {
            doc.addImage(imgData, 'JPEG', M, y, imgW, imgH);
            y += imgH + 4;
          } catch {
            doc.text('(foto gagal dimuat)', M, y + 3);
            y += 5;
          }
        }

        doc.setDrawColor(220, 225, 230);
        doc.setLineWidth(0.2);
        doc.line(M, y, W - M, y);
        y += 5;
      }

      const fileName = `rekap-${selectedDate}-${(selectedDriver || 'semua').replace(
        /\W+/g,
        '_'
      )}.pdf`;
      doc.save(fileName);
      onToast('PDF rekap berhasil diunduh!');
    } catch (err: any) {
      console.error(err);
      onToast(`Gagal menyusun PDF: ${err.message || err}`, true);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Download PDF Card: Emerald & White Realistic */}
      <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm">
        <div className="flex items-center gap-2.5 text-[#064e3b] mb-1.5">
          <div className="p-2 bg-emerald-50 rounded-xl text-[#059669]">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-condensed text-2xl font-bold leading-tight">
              Rekap Harian & Bukti Foto
            </h3>
            <p className="text-xs text-slate-500">
              Cetak dokumen laporan pengantaran resmi harian lengkap dengan foto bukti
            </p>
          </div>
        </div>

        <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100 my-4 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Tanggal Rekap:</span>
            <span className="font-bold text-[#064e3b]">{selectedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Driver:</span>
            <span className="font-bold text-[#064e3b]">
              {selectedDriver || 'Semua Driver'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Total Order:</span>
            <span className="font-bold text-[#059669]">{filtered.length} pengantaran</span>
          </div>
        </div>

        <button
          type="button"
          disabled={isGenerating || filtered.length === 0}
          onClick={handleGeneratePdf}
          className="w-full flex items-center justify-center gap-2 bg-[#059669] hover:bg-[#047857] text-white font-bold text-sm py-3 px-4 rounded-xl disabled:opacity-50 transition-colors shadow-sm"
        >
          {isGenerating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4 text-emerald-200" />
          )}
          <span>{isGenerating ? 'Menyusun Dokumen…' : 'Unduh Laporan PDF Lengkap'}</span>
        </button>
      </div>

      {/* Danger Zone */}
      {isOwner && (
        <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-rose-700 mb-1">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h3 className="font-condensed text-2xl font-bold">Zona Reset Data</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Menghapus riwayat order beserta file foto bukti dari database. Pastikan Anda sudah
            mengunduh rekap PDF terlebih dahulu.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onResetDate}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 border border-rose-300 text-rose-700 rounded-xl font-bold text-xs hover:bg-rose-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Tanggal Ini ({selectedDate})</span>
            </button>
            <button
              type="button"
              onClick={onResetAll}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Seluruh Data</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
