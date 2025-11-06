import { ROME_CENTER } from "./utils.js";

let map;
let baseTileLayer;
export function getMap() {
  return map;
}

// ✅ MapTiler API key
const MAPTILER_API_KEY = window.MAPTILER_API_KEY || "JkKDNqB2qGVP6SPbJOtO";

export function initMap() {
  map = L.map("map", {
    zoomControl: false,
    scrollWheelZoom: true,
    wheelDebounceTime: 100,
    wheelPxPerZoomLevel: 120,
    zoomAnimation: true,
    zoomSnap: 1,
    zoomDelta: 1,
    touchZoom: true,
    doubleClickZoom: true,
    inertia: true,
    inertiaDeceleration: 4000,
    inertiaMaxSpeed: 1500,
    keyboard: true,
    boxZoom: true,
    preferCanvas: true,
    fadeAnimation: true,
    markerZoomAnimation: true,
    transform3DLimit: 8388608,
    worldCopyJump: false,
  }).setView(ROME_CENTER, 10);

  // Create custom SVG pane for markers to bypass canvas rendering issues
  if (!map.getPane('markerPane')) {
    map.createPane('markerPane');
  }
  const markerPane = map.getPane('markerPane');
  if (markerPane) {
    markerPane.style.zIndex = 600; // Above other layers
  }

  // ✅ Add zoom controls manually for better positioning
  L.control.zoom({
    position: 'topright',
    zoomInTitle: 'Zoom in',
    zoomOutTitle: 'Zoom out'
  }).addTo(map);

  // ✅ MapTiler basemap - optimized to prevent excessive loading
  baseTileLayer = L.tileLayer(
    `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`,
    {
      maxZoom: 19,
      minZoom: 1,
      tileSize: 256,
      zoomOffset: 0,
      detectRetina: false,
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 3,
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
    }
  ).addTo(map);
}

export function setBaseTileBounds(bounds) {
  if (!map) return;
  if (baseTileLayer) {
    map.removeLayer(baseTileLayer);
  }
  
  baseTileLayer = L.tileLayer(
    `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`,
    {
      maxZoom: 19,
      minZoom: 1,
      tileSize: 256,
      zoomOffset: 0,
      detectRetina: false,
      updateWhenIdle: true, // ✅ Only load tiles when map stops moving (prevents "200 shots")
      updateWhenZooming: false, // ✅ Don't update during zoom to reduce loads
      keepBuffer: 3, // Slightly increased buffer for smoother panning
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
    }
  ).addTo(map);
}