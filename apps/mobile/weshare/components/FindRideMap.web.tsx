import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { FindRideMapHandle, FindRideMapProps, LatLng, MapRegion } from '@/components/find-ride-map-shared';

const TEAL = '#00C9B1';
const ACCENT = '#FF6B35';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

type LeafletMap = {
  setView: (center: [number, number], zoom: number) => void;
  flyTo: (center: [number, number], zoom: number, options?: { duration?: number }) => void;
  fitBounds: (bounds: [[number, number], [number, number]], options?: { paddingTopLeft?: [number, number]; paddingBottomRight?: [number, number]; animate?: boolean }) => void;
  remove: () => void;
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler: () => void) => void;
  invalidateSize: () => void;
};

type LeafletLayer = { remove: () => void };

type LeafletLib = {
  map: (el: HTMLElement, options?: { zoomControl?: boolean }) => LeafletMap;
  tileLayer: (url: string, options?: { attribution?: string; maxZoom?: number }) => { addTo: (map: LeafletMap) => LeafletLayer };
  marker: (latlng: [number, number], options?: { icon?: unknown }) => { addTo: (map: LeafletMap) => LeafletLayer };
  divIcon: (options: { className?: string; html: string; iconSize: [number, number]; iconAnchor: [number, number] }) => unknown;
  polyline: (latlngs: [number, number][], options?: { color?: string; weight?: number; dashArray?: string }) => { addTo: (map: LeafletMap) => LeafletLayer };
};

function regionToZoom(region: MapRegion) {
  const zoom = Math.log2(360 / Math.max(region.latitudeDelta, 0.0001));
  return Math.max(3, Math.min(18, Math.round(zoom)));
}

function pinHtml(color: string) {
  return `<div style="display:flex;flex-direction:column;align-items:center;width:24px">
    <div style="width:24px;height:24px;border-radius:12px;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px ${color}">
      <div style="width:8px;height:8px;border-radius:4px;background:rgba(255,255,255,0.9)"></div>
    </div>
    <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid ${color};margin-top:-1px"></div>
  </div>`;
}

function loadStylesheet() {
  if (document.getElementById('weshare-leaflet-css')) return;
  const link = document.createElement('link');
  link.id = 'weshare-leaflet-css';
  link.rel = 'stylesheet';
  link.href = LEAFLET_CSS;
  document.head.appendChild(link);
}

function loadLeaflet(): Promise<LeafletLib | null> {
  const existing = (window as Window & { L?: LeafletLib }).L;
  if (existing) return Promise.resolve(existing);

  loadStylesheet();

  const current = document.getElementById('weshare-leaflet-js') as HTMLScriptElement | null;
  if (current) {
    return new Promise((resolve) => {
      current.addEventListener('load', () => resolve((window as Window & { L?: LeafletLib }).L ?? null), { once: true });
      current.addEventListener('error', () => resolve(null), { once: true });
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.id = 'weshare-leaflet-js';
    script.async = true;
    script.src = LEAFLET_JS;
    script.onload = () => resolve((window as Window & { L?: LeafletLib }).L ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

const FindRideMap = forwardRef<FindRideMapHandle, FindRideMapProps>(function FindRideMap(
  { isDark, initialRegion, fromCoord, toCoord, routeCoords, routeDashed, onPress },
  ref,
) {
  const containerRef = useRef<View>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileRef = useRef<LeafletLayer | null>(null);
  const overlayRef = useRef<LeafletLayer[]>([]);
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;
  const leafletRef = useRef<LeafletLib | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useImperativeHandle(ref, () => ({
    animateToRegion(region, duration) {
      const map = mapRef.current;
      if (!map) return;
      const center: [number, number] = [region.latitude, region.longitude];
      const zoom = regionToZoom(region);
      if (duration && duration > 0) map.flyTo(center, zoom, { duration: duration / 1000 });
      else map.setView(center, zoom);
    },
    fitToCoordinates(coordinates, options) {
      const map = mapRef.current;
      if (!map || coordinates.length === 0) return;
      let north = -90;
      let south = 90;
      let east = -180;
      let west = 180;
      for (const coord of coordinates) {
        north = Math.max(north, coord.latitude);
        south = Math.min(south, coord.latitude);
        east = Math.max(east, coord.longitude);
        west = Math.min(west, coord.longitude);
      }
      const pad = options?.edgePadding;
      map.fitBounds(
        [[south, west], [north, east]],
        {
          paddingTopLeft: [pad?.left ?? 40, pad?.top ?? 40],
          paddingBottomRight: [pad?.right ?? 40, pad?.bottom ?? 40],
          animate: options?.animated ?? true,
        },
      );
    },
  }));

  useEffect(() => {
    let cancelled = false;
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node) return;

    void loadLeaflet().then((L) => {
      if (cancelled || !L || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(node, { zoomControl: false }).setView(
        [initialRegion.latitude, initialRegion.longitude],
        regionToZoom(initialRegion),
      ) as unknown as LeafletMap;
      mapRef.current = map;
      map.on('click', () => onPressRef.current());
      requestAnimationFrame(() => map.invalidateSize());
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      tileRef.current = null;
      overlayRef.current = [];
      setMapReady(false);
    };
    // Map is created once for this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    tileRef.current?.remove();
    const url = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    tileRef.current = L.tileLayer(url, {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);
  }, [isDark, mapReady]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    overlayRef.current.forEach((layer) => layer.remove());
    overlayRef.current = [];

    const addPin = (coord: LatLng, color: string) => {
      const icon = L.divIcon({
        className: '',
        html: pinHtml(color),
        iconSize: [24, 36],
        iconAnchor: [12, 36],
      });
      overlayRef.current.push(
        L.marker([coord.latitude, coord.longitude], { icon }).addTo(map),
      );
    };

    if (fromCoord) addPin(fromCoord, TEAL);
    if (toCoord) addPin(toCoord, ACCENT);
    if (routeCoords && routeCoords.length >= 2) {
      overlayRef.current.push(
        L.polyline(
          routeCoords.map((coord) => [coord.latitude, coord.longitude]),
          {
            color: ACCENT,
            weight: 3.5,
            dashArray: routeDashed ? '10 7' : undefined,
          },
        ).addTo(map),
      );
    }
  }, [fromCoord, toCoord, routeCoords, routeDashed, mapReady]);

  return (
    <View
      ref={containerRef}
      style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#0d1b2a' : '#e8eef4' }]}
    />
  );
});

export default FindRideMap;
