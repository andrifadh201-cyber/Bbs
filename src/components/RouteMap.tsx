/// <reference types="google.maps" />
import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Navigation,
  Crosshair,
  Route as RouteIcon,
  Sparkles,
  MapPin,
  ExternalLink,
  Phone,
  Play,
  Camera,
  MessageCircle,
} from 'lucide-react';
import { Order, UserLocation } from '../types';
import {
  buildAllRouteGoogleMapsUrl,
  buildSingleGoogleMapsUrl,
  getWhatsAppUrl,
  cleanPhoneNumber,
  haversineDistanceKm,
  optimizeRouteOrder,
} from '../lib/geo';

interface RouteMapProps {
  orders: Order[];
  apiKey: string;
  driverLoc: UserLocation | null;
  onUpdateDriverLoc: () => Promise<void>;
  onSelectOrder?: (order: Order) => void;
  onOptimizeRoute: (sorted: Order[]) => void;
  onOpenEditRoute: () => void;
  onStartDelivery: (id: string) => Promise<void>;
  onCompleteDelivery: (id: string) => void;
  onFailDelivery: (id: string) => void;
}

// Inner map child component
function MapContent({
  orders,
  driverLoc,
  selectedOrder,
  setSelectedOrder,
  onStartDelivery,
  onCompleteDelivery,
  onFailDelivery,
}: {
  orders: Order[];
  driverLoc: UserLocation | null;
  selectedOrder: Order | null;
  setSelectedOrder: (o: Order | null) => void;
  onStartDelivery: (id: string) => Promise<void>;
  onCompleteDelivery: (id: string) => void;
  onFailDelivery: (id: string) => void;
}) {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const [routeStats, setRouteStats] = useState<{ distanceKm: number; durationMin: number } | null>(null);

  const mappedOrders = useMemo(() => {
    return orders.filter((o) => o.lat != null && o.lng != null);
  }, [orders]);

  useEffect(() => {
    if (!map || mappedOrders.length === 0) return;

    try {
      const bounds = new google.maps.LatLngBounds();
      if (driverLoc) {
        bounds.extend({ lat: driverLoc.lat, lng: driverLoc.lng });
      }
      mappedOrders.forEach((o) => {
        if (o.lat != null && o.lng != null) {
          bounds.extend({ lat: o.lat, lng: o.lng });
        }
      });

      if (mappedOrders.length === 1 && !driverLoc) {
        map.setCenter({ lat: mappedOrders[0].lat!, lng: mappedOrders[0].lng! });
        map.setZoom(15);
      } else {
        map.fitBounds(bounds, { top: 70, right: 70, bottom: 130, left: 70 });
      }
    } catch (err) {
      console.warn('fitBounds error:', err);
    }
  }, [map, mappedOrders, driverLoc]);

  // Render polyline route in fresh light green
  useEffect(() => {
    if (!map) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    const activeStops = mappedOrders.filter((o) => o.st === 'baru' || o.st === 'jalan');
    if (activeStops.length === 0) {
      setRouteStats(null);
      return;
    }

    const pathPoints: google.maps.LatLngLiteral[] = [];
    if (driverLoc) {
      pathPoints.push({ lat: driverLoc.lat, lng: driverLoc.lng });
    }
    activeStops.forEach((o) => {
      pathPoints.push({ lat: o.lat!, lng: o.lng! });
    });

    let totalKm = 0;
    for (let i = 0; i < pathPoints.length - 1; i++) {
      totalKm += haversineDistanceKm(
        pathPoints[i].lat,
        pathPoints[i].lng,
        pathPoints[i + 1].lat,
        pathPoints[i + 1].lng
      );
    }
    const durationMin = Math.round((totalKm / 28) * 60) + activeStops.length * 6;
    setRouteStats({
      distanceKm: parseFloat(totalKm.toFixed(1)),
      durationMin: Math.max(5, durationMin),
    });

    drawFallbackPolyline(pathPoints);

    function drawFallbackPolyline(points: google.maps.LatLngLiteral[]) {
      const polyline = new google.maps.Polyline({
        path: points,
        geodesic: true,
        strokeColor: '#16a34a',
        strokeOpacity: 0.9,
        strokeWeight: 6,
        icons: [
          {
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 2.5,
              strokeColor: '#ffffff',
              fillColor: '#15803d',
              fillOpacity: 1,
            },
            offset: '50%',
            repeat: '90px',
          },
        ],
      });
      polyline.setMap(map);
      polylinesRef.current = [polyline];
    }

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, mappedOrders, driverLoc]);

  return (
    <>
      {/* Driver Location Marker: Fresh Light Green Pulse */}
      {driverLoc && (
        <AdvancedMarker
          position={{ lat: driverLoc.lat, lng: driverLoc.lng }}
          title="Lokasi Anda (Driver)"
          zIndex={100}
        >
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-emerald-400 opacity-75"></span>
            <div className="relative bg-[#16a34a] text-white p-2 rounded-full border-2 border-white shadow-xl flex items-center justify-center">
              <Navigation className="w-5 h-5 fill-white transform -rotate-45" />
            </div>
            <div className="absolute -bottom-5 bg-white text-[#15803d] text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 whitespace-nowrap shadow-md">
              Driver Aktif
            </div>
          </div>
        </AdvancedMarker>
      )}

      {/* Delivery Order Markers */}
      {mappedOrders.map((order, index) => {
        const orderNum = order.orderIndex || index + 1;
        const isJalan = order.st === 'jalan';
        const isSelesai = order.st === 'selesai';
        const isGagal = order.st === 'gagal';

        let bgColor = '#ffffff';
        let textColor = '#15803d';
        let borderColor = '#22c55e';

        if (isJalan) {
          bgColor = '#16a34a';
          textColor = '#ffffff';
          borderColor = '#ffffff';
        } else if (isSelesai) {
          bgColor = '#15803d';
          textColor = '#ffffff';
          borderColor = '#86efac';
        } else if (isGagal) {
          bgColor = '#e11d48';
          textColor = '#ffffff';
          borderColor = '#ffffff';
        }

        return (
          <AdvancedMarker
            key={order.id}
            position={{ lat: order.lat!, lng: order.lng! }}
            title={`#${orderNum} - ${order.name}`}
            zIndex={isJalan ? 90 : 50 - index}
            onClick={() => setSelectedOrder(order)}
          >
            <div
              className={`cursor-pointer transition-transform hover:scale-110 flex flex-col items-center ${
                selectedOrder?.id === order.id ? 'scale-125 z-50' : ''
              }`}
            >
              <div
                style={{
                  backgroundColor: bgColor,
                  color: textColor,
                  borderColor: borderColor,
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 shadow-lg font-condensed"
              >
                {isSelesai ? '✓' : isGagal ? '✕' : orderNum}
              </div>
              <div className="bg-white/95 text-[#14532d] font-bold text-[11px] px-2 py-0.5 rounded-md shadow mt-0.5 max-w-[110px] truncate border border-emerald-200">
                {order.name}
              </div>
            </div>
          </AdvancedMarker>
        );
      })}

      {/* Info Window for Selected Stop */}
      {selectedOrder && selectedOrder.lat != null && selectedOrder.lng != null && (
        <InfoWindow
          position={{ lat: selectedOrder.lat, lng: selectedOrder.lng }}
          onCloseClick={() => setSelectedOrder(null)}
        >
          <div className="p-1 max-w-[260px] text-[#0f172a]">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-1.5">
              <span className="font-bold font-condensed text-base text-[#15803d] truncate">
                #{selectedOrder.orderIndex || 1} {selectedOrder.name}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  selectedOrder.st === 'jalan'
                    ? 'bg-emerald-100 text-emerald-800'
                    : selectedOrder.st === 'selesai'
                    ? 'bg-emerald-50 text-emerald-700'
                    : selectedOrder.st === 'gagal'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {selectedOrder.st}
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-2 line-clamp-2">{selectedOrder.addr}</p>

            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
              <a
                href={buildSingleGoogleMapsUrl(selectedOrder, driverLoc)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 bg-[#16a34a] text-white font-bold text-xs py-1.5 px-2 rounded-lg shadow-xs hover:bg-[#15803d]"
              >
                <Navigation className="w-3.5 h-3.5 fill-white" /> Maps
              </a>
              {cleanPhoneNumber(selectedOrder.tel) && (
                <a
                  href={getWhatsAppUrl(selectedOrder, 'otw')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 bg-[#22c55e] text-white font-bold text-xs py-1.5 px-2 rounded-lg shadow-xs hover:bg-[#16a34a]"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-white" /> WA
                </a>
              )}
            </div>

            {selectedOrder.st === 'baru' && (
              <button
                type="button"
                onClick={() => onStartDelivery(selectedOrder.id)}
                className="w-full mt-2 bg-[#16a34a] text-white text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-[#15803d]"
              >
                <Play className="w-3.5 h-3.5 text-white" /> Mulai Antar Titik Ini
              </button>
            )}

            {selectedOrder.st === 'jalan' && (
              <div className="flex gap-1 mt-2">
                <button
                  type="button"
                  onClick={() => onCompleteDelivery(selectedOrder.id)}
                  className="flex-1 bg-[#22c55e] text-white text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-[#16a34a]"
                >
                  <Camera className="w-3.5 h-3.5" /> Selesai
                </button>
                <button
                  type="button"
                  onClick={() => onFailDelivery(selectedOrder.id)}
                  className="bg-rose-600 text-white text-xs font-bold px-2 py-1.5 rounded-lg hover:bg-rose-700"
                >
                  Kendala
                </button>
              </div>
            )}
          </div>
        </InfoWindow>
      )}

      {/* Cockpit HUD (Top-Left) */}
      {routeStats && (
        <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md border border-emerald-200 rounded-2xl p-3 shadow-lg max-w-[210px] pointer-events-auto">
          <div className="flex items-center gap-1.5 text-xs text-[#15803d] font-bold uppercase tracking-wider mb-1">
            <RouteIcon className="w-4 h-4 text-[#16a34a]" />
            <span>Info Perjalanan</span>
          </div>
          <div className="flex justify-between items-baseline gap-2 text-sm font-condensed">
            <span className="text-slate-500 font-sans text-xs">Total Jarak:</span>
            <b className="text-lg text-[#15803d]">{routeStats.distanceKm} km</b>
          </div>
          <div className="flex justify-between items-baseline gap-2 text-sm font-condensed">
            <span className="text-slate-500 font-sans text-xs">Est. Waktu:</span>
            <b className="text-lg text-emerald-600">~{routeStats.durationMin} menit</b>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 border-t border-emerald-100 pt-1 flex items-center justify-between">
            <span>Sisa perhentian:</span>
            <span className="font-bold text-[#15803d]">
              {mappedOrders.filter((o) => o.st === 'baru' || o.st === 'jalan').length}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export function RouteMap({
  orders,
  apiKey,
  driverLoc,
  onUpdateDriverLoc,
  onOptimizeRoute,
  onOpenEditRoute,
  onStartDelivery,
  onCompleteDelivery,
  onFailDelivery,
}: RouteMapProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const activeOrders = useMemo(() => {
    return orders
      .filter((o) => o.st === 'baru' || o.st === 'jalan')
      .sort((a, b) => (a.orderIndex || 999) - (b.orderIndex || 999));
  }, [orders]);

  const defaultCenter = useMemo(() => {
    if (driverLoc) return { lat: driverLoc.lat, lng: driverLoc.lng };
    const firstWithLoc = orders.find((o) => o.lat != null && o.lng != null);
    if (firstWithLoc) return { lat: firstWithLoc.lat!, lng: firstWithLoc.lng! };
    return { lat: -6.2088, lng: 106.8456 };
  }, [driverLoc, orders]);

  const handleOpenAllRoutesInGoogleMaps = () => {
    const url = buildAllRouteGoogleMapsUrl(activeOrders, driverLoc);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAutoOptimize = () => {
    const sorted = optimizeRouteOrder(activeOrders, driverLoc);
    onOptimizeRoute(sorted);
  };

  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      await onUpdateDriverLoc();
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-210px)] md:h-[640px] bg-slate-100 rounded-3xl overflow-hidden border-2 border-emerald-200 shadow-md">
      {/* Top Floating Control Bar: Fresh Green & White */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={handleOpenAllRoutesInGoogleMaps}
          className="flex items-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-sm md:text-base px-4 py-2.5 rounded-2xl shadow-lg border-2 border-white active:scale-95 transition-all"
          title="Buka seluruh rute multi-stop di Google Maps"
        >
          <Navigation className="w-5 h-5 fill-white" />
          <span>Navigasi All Rute</span>
          <ExternalLink className="w-4 h-4 ml-0.5 opacity-80" />
        </button>

        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-emerald-200 shadow-md">
          <button
            type="button"
            onClick={handleAutoOptimize}
            className="flex items-center gap-1 bg-[#16a34a] text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-[#15803d] transition-colors"
            title="Optimasi urutan perhentian terdekat"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>Optimalkan</span>
          </button>

          <button
            type="button"
            onClick={onOpenEditRoute}
            className="flex items-center gap-1 bg-emerald-50 text-[#15803d] text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-emerald-100 border border-emerald-200 transition-colors"
            title="Atur urutan perhentian manual"
          >
            <RouteIcon className="w-3.5 h-3.5" />
            <span>Edit Rute</span>
          </button>

          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="p-1.5 text-slate-700 hover:text-[#16a34a] hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-50"
            title="Pusatkan posisi GPS saya"
            aria-label="Posisi GPS Saya"
          >
            <Crosshair className={`w-4 h-4 ${isLocating ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Google Maps Container */}
      <div className="w-full h-full">
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={13}
          mapId="DEMO_MAP_ID"
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
        >
          <MapContent
            orders={orders}
            driverLoc={driverLoc}
            selectedOrder={selectedOrder}
            setSelectedOrder={setSelectedOrder}
            onStartDelivery={onStartDelivery}
            onCompleteDelivery={onCompleteDelivery}
            onFailDelivery={onFailDelivery}
          />
        </Map>
      </div>

      {/* Bottom Tray: Next Delivery Quick Navigation Card */}
      {activeOrders.length > 0 && (
        <div className="absolute bottom-3 left-3 right-3 z-20 bg-white/95 backdrop-blur-md border border-emerald-200 rounded-2xl p-3 shadow-xl flex items-center justify-between gap-3 pointer-events-auto">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Tujuan Terdekat (#{activeOrders[0].orderIndex || 1})
            </div>
            <div className="font-bold text-[#14532d] truncate text-sm">
              {activeOrders[0].name}
            </div>
            <div className="text-xs text-slate-600 truncate">{activeOrders[0].addr}</div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={buildSingleGoogleMapsUrl(activeOrders[0], driverLoc)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 bg-[#16a34a] text-white font-bold text-xs py-2 px-3 rounded-xl shadow hover:bg-[#15803d]"
            >
              <Navigation className="w-3.5 h-3.5 fill-white" />
              <span>G. Maps</span>
            </a>
            {activeOrders[0].st === 'baru' ? (
              <button
                type="button"
                onClick={() => onStartDelivery(activeOrders[0].id)}
                className="bg-[#15803d] text-white font-bold text-xs py-2 px-3 rounded-xl shadow hover:bg-[#16a34a]"
              >
                Mulai Antar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onCompleteDelivery(activeOrders[0].id)}
                className="bg-[#22c55e] text-white font-bold text-xs py-2 px-3 rounded-xl shadow hover:bg-[#16a34a]"
              >
                Selesai
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
