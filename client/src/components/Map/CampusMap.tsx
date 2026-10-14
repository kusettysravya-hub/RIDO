import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from '../../context/ThemeContext';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface UserLiveLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface CampusMapProps {
  center?: [number, number];
  zoom?: number;
  pickup?: Coordinate | null;
  dropoff?: Coordinate | null;
  vehicleLocation?: Coordinate | null;
  userLocation?: UserLiveLocation | null;
  routeCoordinates?: Coordinate[];
  vehiclePlate?: string;
  vehicleModel?: string;
  className?: string;
}

export type MapStyleType = 'street' | 'dark' | 'satellite';

// Custom Leaflet DivIcons using clean SVG HTML with realistic navigation badges
const createPickupIcon = () =>
  L.divIcon({
    className: 'custom-pin-pickup',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));">
        <div style="padding: 2px 6px; border-radius: 5px; background: #059669; color: #ffffff; font-size: 9px; font-weight: 800; font-family: system-ui, sans-serif; letter-spacing: 0.5px; margin-bottom: 2px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.8);">
          PICKUP
        </div>
        <div style="width: 28px; height: 28px; border-radius: 9999px; background: #059669; border: 2.5px solid #FFFFFF; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 13px;">
          P
        </div>
        <div style="width: 2px; height: 6px; background: #059669;"></div>
      </div>
    `,
    iconSize: [44, 48],
    iconAnchor: [22, 48],
  });

const createDropoffIcon = () =>
  L.divIcon({
    className: 'custom-pin-dropoff',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));">
        <div style="padding: 2px 6px; border-radius: 5px; background: #dc2626; color: #ffffff; font-size: 9px; font-weight: 800; font-family: system-ui, sans-serif; letter-spacing: 0.5px; margin-bottom: 2px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.8);">
          DESTINATION
        </div>
        <div style="width: 28px; height: 28px; border-radius: 9999px; background: #dc2626; border: 2.5px solid #FFFFFF; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 13px;">
          D
        </div>
        <div style="width: 2px; height: 6px; background: #dc2626;"></div>
      </div>
    `,
    iconSize: [60, 48],
    iconAnchor: [30, 48],
  });

const createVehicleIcon = (model = 'Campus Shuttle') =>
  L.divIcon({
    className: 'custom-pin-vehicle',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: all 0.4s ease-out; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));">
        <div style="padding: 2px 6px; border-radius: 5px; background: #0f172a; color: #38bdf8; font-size: 9px; font-weight: 700; font-family: system-ui, sans-serif; border: 1px solid #38bdf8; margin-bottom: 2px; white-space: nowrap;">
          SHUTTLE ⚡
        </div>
        <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #0284c7, #0369a1); border: 2.5px solid #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 18px;">
          🚗
        </div>
      </div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 52],
  });

const createUserLocationIcon = () =>
  L.divIcon({
    className: 'custom-pin-user-live',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
        <div style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background: rgba(14, 165, 233, 0.45); animation: radar-pulse 2s infinite ease-out;"></div>
        <div style="width: 16px; height: 16px; border-radius: 9999px; background: #0284c7; border: 3px solid #ffffff; box-shadow: 0 0 12px rgba(2, 132, 199, 0.9); z-index: 2;"></div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

// Map Controller for safe auto-fitting and container invalidation
const MapController: React.FC<{ pointsKey: string; points: Coordinate[] }> = ({ pointsKey, points }) => {
  const map = useMap();
  const prevKeyRef = useRef<string>('');

  useEffect(() => {
    // Invalidate size on mount and multiple layout settlement ticks
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    const t3 = setTimeout(() => map.invalidateSize(), 600);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  useEffect(() => {
    if (pointsKey && pointsKey !== prevKeyRef.current && points.length >= 2) {
      prevKeyRef.current = pointsKey;
      try {
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      } catch (e) {
        console.warn('Map fitBounds error:', e);
      }
    }
  }, [pointsKey, points, map]);

  return null;
};

export const CampusMap: React.FC<CampusMapProps> = ({
  center,
  zoom = 14,
  pickup,
  dropoff,
  vehicleLocation,
  userLocation,
  routeCoordinates = [],
  vehiclePlate = 'CAMPUS-01',
  vehicleModel = 'Tesla Model Y Campus EV',
  className = 'h-[340px] sm:h-[350px] w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // State for Map Layer Selector (Default to 'street' for full realistic street & landmark rendering)
  const [mapStyle, setMapStyle] = useState<MapStyleType>('street');

  // Realistic Basemap Tile Layer Configurations (All 100% free, zero API key required, zero watermarks)
  const tileConfigs: Record<MapStyleType, { url: string; attribution: string; maxZoom: number }> = {
    street: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri &mdash; Streets & Navigation Network',
      maxZoom: 19,
    },
    dark: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri &mdash; Dark Canvas Transit Map',
      maxZoom: 16,
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri &mdash; High-Resolution Aerial Imagery',
      maxZoom: 19,
    },
  };

  // Determine initial center
  const initialCenter: [number, number] = center
    ? center
    : pickup && typeof pickup.lat === 'number'
    ? [pickup.lat, pickup.lng]
    : [37.7749, -122.4194];

  // Collect all valid active points for auto-fit
  const activePoints: Coordinate[] = [];
  if (pickup && typeof pickup.lat === 'number' && !isNaN(pickup.lat)) {
    activePoints.push(pickup);
  }
  if (dropoff && typeof dropoff.lat === 'number' && !isNaN(dropoff.lat)) {
    activePoints.push(dropoff);
  }
  if (vehicleLocation && typeof vehicleLocation.lat === 'number' && !isNaN(vehicleLocation.lat)) {
    activePoints.push(vehicleLocation);
  }
  if (userLocation && typeof userLocation.lat === 'number' && !isNaN(userLocation.lat)) {
    activePoints.push({ lat: userLocation.lat, lng: userLocation.lng });
  }

  const pointsKey = activePoints.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(';');
  const polylinePositions: [number, number][] = routeCoordinates
    .filter((c) => typeof c.lat === 'number' && typeof c.lng === 'number' && !isNaN(c.lat) && !isNaN(c.lng))
    .map((c) => [c.lat, c.lng]);

  const currentTile = tileConfigs[mapStyle];

  return (
    <div className={`relative w-full max-w-full overflow-hidden isolate z-0 min-h-[340px] ${className}`}>
      {/* Real Map Style Switcher (Street / Dark / Satellite) */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center p-1 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-md text-xs">
        <button
          type="button"
          onClick={() => setMapStyle('street')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
            mapStyle === 'street'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Realistic Street Map with Road Names & Landmarks"
        >
          🗺️ Street
        </button>
        <button
          type="button"
          onClick={() => setMapStyle('dark')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
            mapStyle === 'dark'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Clean Dark Night Navigation"
        >
          🌙 Dark
        </button>
        <button
          type="button"
          onClick={() => setMapStyle('satellite')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
            mapStyle === 'satellite'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Real Aerial Satellite Imagery"
        >
          🛰️ Satellite
        </button>
      </div>

      <MapContainer
        center={initialCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', minHeight: '340px' }}
      >
        <TileLayer
          key={mapStyle}
          attribution={currentTile.attribution}
          url={currentTile.url}
          maxZoom={currentTile.maxZoom}
        />

        <MapController pointsKey={pointsKey} points={activePoints} />

        {/* Pickup Pin */}
        {pickup && typeof pickup.lat === 'number' && !isNaN(pickup.lat) && (
          <Marker position={[pickup.lat, pickup.lng]} icon={createPickupIcon()}>
            <Popup className="custom-popup">
              <div className="text-xs p-1 font-sans">
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">Pickup Location</p>
                </div>
                <p className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                  ({pickup.lat.toFixed(4)}, {pickup.lng.toFixed(4)})
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Boarding point for campus commute</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Dropoff Pin */}
        {dropoff && typeof dropoff.lat === 'number' && !isNaN(dropoff.lat) && (
          <Marker position={[dropoff.lat, dropoff.lng]} icon={createDropoffIcon()}>
            <Popup className="custom-popup">
              <div className="text-xs p-1 font-sans">
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <p className="font-bold text-rose-600 dark:text-rose-400">Destination</p>
                </div>
                <p className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                  ({dropoff.lat.toFixed(4)}, {dropoff.lng.toFixed(4)})
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">End destination of trip</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Simulated Vehicle Marker */}
        {vehicleLocation && typeof vehicleLocation.lat === 'number' && !isNaN(vehicleLocation.lat) && (
          <Marker
            position={[vehicleLocation.lat, vehicleLocation.lng]}
            icon={createVehicleIcon(vehicleModel)}
          >
            <Popup className="custom-popup">
              <div className="text-xs p-1 font-sans">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                  <p className="font-bold text-cyan-600 dark:text-cyan-400">{vehicleModel}</p>
                </div>
                <p className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">Plate: {vehiclePlate}</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                  ⚡ Simulated Telematics (Prototype Simulation)
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Real User Live Location Marker */}
        {userLocation && typeof userLocation.lat === 'number' && !isNaN(userLocation.lat) && (
          <>
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={createUserLocationIcon()}
            >
              <Popup className="custom-popup">
                <div className="text-xs p-1 font-sans">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                    <p className="font-bold text-blue-600 dark:text-cyan-400">Your Live Location</p>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                    ({userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)})
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                    📍 Real Browser GPS (Accuracy: ±{Math.round(userLocation.accuracy || 10)}m)
                  </p>
                </div>
              </Popup>
            </Marker>
            {userLocation.accuracy && userLocation.accuracy > 0 && (
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={Math.min(userLocation.accuracy, 200)}
                pathOptions={{
                  color: '#0284c7',
                  fillColor: '#0284c7',
                  fillOpacity: 0.12,
                  weight: 1,
                  dashArray: '4, 4',
                }}
              />
            )}
          </>
        )}

        {/* Route Casing & Foreground Navigation Polyline (Google Maps / Uber Navigation Style) */}
        {polylinePositions.length > 0 && (
          <>
            {/* Outer road contrast casing */}
            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: mapStyle === 'dark' ? '#0369a1' : '#075985',
                weight: 7,
                opacity: 0.6,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Inner vibrant route line */}
            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: mapStyle === 'dark' ? '#38bdf8' : '#0284c7',
                weight: 4.5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default CampusMap;
