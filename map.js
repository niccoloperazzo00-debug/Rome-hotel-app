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
    zoomControl: false, // Will be added manually with custom positioning
    scrollWheelZoom: true,
    wheelDebounceTime: 100, // Increased debounce for smoother scrolling
    wheelPxPerZoomLevel: 120,
    zoomAnimation: true,
    zoomSnap: 1, // Smoother zoom steps
    zoomDelta: 1, // Smoother zoom steps
    touchZoom: true,
    doubleClickZoom: true,
    inertia: true,
    inertiaDeceleration: 4000, // Increased for faster stopping
    inertiaMaxSpeed: 1500, // Increased max speed for faster movement
    keyboard: true,
    boxZoom: true,
    preferCanvas: true,
    fadeAnimation: true, // Enable smooth fade animations
    markerZoomAnimation: true, // Enable marker animations
    transform3DLimit: 8388608,
    worldCopyJump: false, // Prevent map jumping
  }).setView(ROME_CENTER, 10);

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
      detectRetina: false, // Disable retina to load faster
      updateWhenIdle: true, // ✅ CRITICAL: Only load tiles when map stops moving (prevents "200 shots")
      updateWhenZooming: false, // ✅ Don't update during zoom to reduce loads
      keepBuffer: 3, // Slightly increased buffer for smoother panning
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
    }
  ).addTo(map);
}

export function setBaseTileBounds(bounds) {
  if (!map) return;
  if (baseTileLayer) {
    map.removeLayer(baseTileLayer);
  }
  
  // Use MapTiler raster tiles with streets-v2 style - optimized to prevent excessive loading
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
