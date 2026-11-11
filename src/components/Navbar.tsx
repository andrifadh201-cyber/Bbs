import React from 'react';
import { ListOrdered, Map as MapIcon, CheckCircle2, History, FileText } from 'lucide-react';
import { ActiveTab } from '../types';

interface NavbarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeCount: number;
}

export function Navbar({ currentTab, onSelectTab, activeCount }: NavbarProps) {
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'aktif',
      label: 'Daftar Aktif',
      icon: <ListOrdered className="w-5 h-5" />,
      badge: activeCount > 0 ? activeCount : undefined,
    },
    {
      id: 'peta',
      label: 'Peta & Rute',
      icon: <MapIcon className="w-5 h-5" />,
    },
    {
      id: 'selesai',
      label: 'Selesai',
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
    {
      id: 'riw',
      label: 'Riwayat',
      icon: <History className="w-5 h-5" />,
    },
    {
      id: 'rekap',
      label: 'Rekap PDF',
      icon: <FileText className="w-5 h-5" />,
    },
  ];

  return (
    <nav className="fixed left-0 right-0 bottom-0 bg-white/95 backdrop-blur-md border-t border-emerald-200 z-40 shadow-[0_-4px_16px_rgba(6,78,59,0.08)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-1">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all relative ${
                isActive
                  ? 'text-[#064e3b] font-bold bg-emerald-50/80 shadow-xs'
                  : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50 font-medium'
              }`}
            >
              <div className="relative">
                <span className={isActive ? 'text-[#059669]' : 'text-slate-400'}>
                  {tab.icon}
                </span>
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2.5 bg-[#059669] text-white text-[10px] font-condensed font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] leading-tight tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="w-3 h-0.5 bg-[#059669] rounded-full mt-0.5"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
