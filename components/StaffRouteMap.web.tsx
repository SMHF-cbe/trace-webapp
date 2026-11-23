import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapStore = {
  id: number;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  entered_today?: boolean;
  is_active?: boolean;
  sort_order?: number;
};

type Props = {
  stores: MapStore[];
  nextStoreId: number | null;
};

type Position = {
  latitude: number;
  longitude: number;
};

const COLORS = {
  completed: "#16A34A",
  next: "#F59E0B",
  remaining: "#DC2626",
  current: "#2563EB",
};

function validCoordinate(value: number | null | undefined, min: number, max: number): boolean {
  return value != null && Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max;
}

function markerColor(store: MapStore, nextStoreId: number | null): string {
  if (store.entered_today) return COLORS.completed;
  if (store.id === nextStoreId) return COLORS.next;
  return COLORS.remaining;
}

function distanceKm(from: Position, to: Position): number {
  const earthRadius = 6371;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function StaffRouteMap({ stores, nextStoreId }: Props) {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pinsRef = useRef<L.LayerGroup | null>(null);
  const markerRefs = useRef<Map<number, L.CircleMarker>>(new Map());
  const [locationState, setLocationState] = useState("Requesting location…");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);

  const mappedStores = useMemo(
    () =>
      stores.filter(
        (store) =>
          validCoordinate(store.latitude, -90, 90) &&
          validCoordinate(store.longitude, -180, 180)
      ),
    [stores]
  );

  const missingCount = Math.max(0, stores.length - mappedStores.length);

  const nearbyStores = useMemo(() => {
    const ordered = mappedStores.map((store) => ({
      store,
      distance: currentPosition
        ? distanceKm(currentPosition, {
            latitude: Number(store.latitude),
            longitude: Number(store.longitude),
          })
        : null,
    }));

    if (currentPosition) {
      return ordered.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)).slice(0, 4);
    }

    return ordered
      .sort((a, b) => Number(a.store.sort_order ?? 0) - Number(b.store.sort_order ?? 0))
      .slice(0, 4);
  }, [currentPosition, mappedStores]);

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return;

    const map = L.map(mapElement.current, { zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    pinsRef.current = L.layerGroup().addTo(map);
    map.setView([11.0168, 76.9558], 11);

    return () => {
      map.remove();
      mapRef.current = null;
      pinsRef.current = null;
      markerRefs.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const pins = pinsRef.current;
    if (!map || !pins) return;

    pins.clearLayers();
    markerRefs.current.clear();
    const bounds: L.LatLngExpression[] = [];

    mappedStores.forEach((store, index) => {
      const latitude = Number(store.latitude);
      const longitude = Number(store.longitude);
      const color = markerColor(store, nextStoreId);
      const marker = L.circleMarker([latitude, longitude], {
        radius: store.id === nextStoreId ? 12 : 9,
        color: "#FFFFFF",
        weight: 3,
        fillColor: color,
        fillOpacity: 0.95,
      });
      const status = store.entered_today
        ? "Completed today"
        : store.id === nextStoreId
          ? "Next stop"
          : "Remaining";
      marker.bindPopup(
        `<strong>${index + 1}. ${escapeHtml(store.name)}</strong><br/><span style="color:${color};font-weight:700">${status}</span>`
      );
      marker.addTo(pins);
      markerRefs.current.set(store.id, marker);
      bounds.push([latitude, longitude]);
    });

    // Store pins define the initial viewport. Do not replace this with the
    // staff GPS position when GPS becomes available.
    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 15 });
    }
  }, [mappedStores, nextStoreId]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationState("Location is not supported by this browser");
      return;
    }

    setLocationState("Waiting for location…");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCurrentPosition(nextPosition);
        const map = mapRef.current;
        if (map) {
          // Keep the store route visible when pins exist. Only center on GPS
          // when there are no mapped stores to show.
          if (mappedStores.length === 0) {
            map.setView([nextPosition.latitude, nextPosition.longitude], 15);
          }
        }
        setLocationState("Live location active");
        setLocationError(null);
      },
      (error) => {
        setLocationState("Location unavailable");
        setLocationError(error.message || "Allow location access to see your position.");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [mappedStores.length]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentPosition) return;

    const currentMarker = L.circleMarker(
      [currentPosition.latitude, currentPosition.longitude],
      {
        radius: 8,
        color: "#FFFFFF",
        weight: 3,
        fillColor: COLORS.current,
        fillOpacity: 1,
      }
    ).addTo(map);
    currentMarker.bindPopup("Your current location");

    return () => {
      currentMarker.removeFrom(map);
    };
  }, [currentPosition]);

  const focusStore = (store: MapStore) => {
    const map = mapRef.current;
    const marker = markerRefs.current.get(store.id);
    if (!map || !marker) return;
    const latitude = Number(store.latitude);
    const longitude = Number(store.longitude);
    map.setView([latitude, longitude], 16, { animate: true });
    marker.openPopup();
  };

  const focusNext = () => {
    const next = mappedStores.find((store) => store.id === nextStoreId);
    if (next) focusStore(next);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 420 }}>
      <div ref={mapElement} style={{ width: "100%", height: "100%", minHeight: 420 }} />

      <div
        style={{
          position: "absolute",
          zIndex: 500,
          top: 12,
          left: 12,
          right: 12,
          background: "rgba(18, 22, 31, 0.95)",
          borderRadius: 12,
          padding: 10,
          color: "#FFFFFF",
          fontSize: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <b>{mappedStores.length} of {stores.length} stores mapped</b>
          {missingCount > 0 ? <span style={{ color: "#FCD34D" }}>({missingCount} missing location)</span> : null}
          <button type="button" onClick={focusNext} disabled={!mappedStores.some((store) => store.id === nextStoreId)} style={buttonStyle}>
            Focus next store
          </button>
        </div>
        {locationError ? <div style={{ color: "#FCD34D", marginTop: 6 }}>{locationError}</div> : null}
      </div>

      {mappedStores.length === 0 ? (
        <div style={emptyStyle}>
          No store coordinates were returned by the route API. The backend map-coordinate function is not reaching this staff response yet.
        </div>
      ) : null}

      <div style={nearbyPanelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <b>Nearby / next stores</b>
          <span style={{ color: "#D1D5DB", fontSize: 11 }}>{locationState}</span>
        </div>
        {nearbyStores.length === 0 ? (
          <div style={{ color: "#FCD34D" }}>No mapped stores to show.</div>
        ) : (
          nearbyStores.map(({ store, distance }) => (
            <button
              type="button"
              key={store.id}
              onClick={() => focusStore(store)}
              style={listButtonStyle}
            >
              <span style={{ color: markerColor(store, nextStoreId), marginRight: 6 }}>●</span>
              <span style={{ flex: 1, textAlign: "left" }}>{store.name}</span>
              <span style={{ color: "#D1D5DB", fontSize: 11 }}>
                {store.id === nextStoreId ? "NEXT" : distance == null ? "" : `${distance.toFixed(1)} km`}
              </span>
            </button>
          ))
        )}
      </div>

      <div
        style={{
          position: "absolute",
          zIndex: 500,
          left: 12,
          right: 12,
          bottom: 12,
          background: "rgba(18, 22, 31, 0.94)",
          borderRadius: 12,
          padding: "8px 12px",
          color: "#FFFFFF",
          fontSize: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        }}
      >
        <span><b style={{ color: COLORS.completed }}>●</b> Completed</span>{"  "}
        <span><b style={{ color: COLORS.next }}>●</b> Next</span>{"  "}
        <span><b style={{ color: COLORS.remaining }}>●</b> Remaining</span>{"  "}
        <span><b style={{ color: COLORS.current }}>●</b> You</span>
      </div>
    </div>
  );
}

const buttonStyle: CSSProperties = {
  marginLeft: "auto",
  border: "1px solid #F59E0B",
  borderRadius: 7,
  background: "#F59E0B",
  color: "#111827",
  padding: "5px 8px",
  fontSize: 11,
  fontWeight: 700,
};

const nearbyPanelStyle: CSSProperties = {
  position: "absolute",
  zIndex: 500,
  left: 12,
  right: 12,
  top: 72,
  maxHeight: 158,
  overflowY: "auto",
  background: "rgba(18, 22, 31, 0.94)",
  borderRadius: 10,
  padding: "8px 10px",
  color: "#FFFFFF",
  fontSize: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.22)",
};

const listButtonStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  border: 0,
  borderTop: "1px solid rgba(255,255,255,0.12)",
  background: "transparent",
  color: "#FFFFFF",
  padding: "7px 2px",
  cursor: "pointer",
};

const emptyStyle: CSSProperties = {
  position: "absolute",
  zIndex: 500,
  top: 238,
  left: 12,
  right: 12,
  background: "rgba(18, 22, 31, 0.95)",
  borderRadius: 10,
  padding: 10,
  color: "#FCD34D",
  fontSize: 13,
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}
 