import { initMap, getMap } from "./map.js";
import {
  loadMunicipioBoundaries,
  handleMunicipioViewChange,
} from "./municipi.js";
import { loadHotels, handleHotelViewChange, setupMapPerformance } from "./hotels.js";

window.onload = () => {
  initMap();

  // ✅ Initialize performance optimizations (zoom handler for marker sizing)
  setupMapPerformance();

  loadMunicipioBoundaries(true).then(() => {
    loadHotels();
  });

  // ✅ DEBOUNCE view changes to prevent rapid redraws
  let viewChangeTimeout;
  document.getElementById("viewSelect").addEventListener("change", () => {
    clearTimeout(viewChangeTimeout);
    viewChangeTimeout = setTimeout(() => {
      handleMunicipioViewChange();
      handleHotelViewChange();
    }, 100);
  });

  // ✅ DEBOUNCE star filter changes
  let starFilterTimeout;
  document.getElementById("starFilter").addEventListener("change", () => {
    clearTimeout(starFilterTimeout);
    starFilterTimeout = setTimeout(() => {
      handleHotelViewChange();
    }, 100);
  });

  // ✅ DEBOUNCE status filter changes (includes highlight filter)
  let statusFilterTimeout;
  document.getElementById("statusFilter").addEventListener("change", () => {
    clearTimeout(statusFilterTimeout);
    statusFilterTimeout = setTimeout(() => {
      handleHotelViewChange();
    }, 100);
  });

  // ✅ DEBOUNCE phase filter changes
  let phaseFilterTimeout;
  document.getElementById("phaseFilter").addEventListener("change", () => {
    clearTimeout(phaseFilterTimeout);
    phaseFilterTimeout = setTimeout(() => {
      handleHotelViewChange();
    }, 100);
  });

  // ✅ Info Mode toggle
  const infoModeBtn = document.getElementById("infoModeToggle");
  if (infoModeBtn) {
    infoModeBtn.addEventListener("click", () => {
      const isOn = infoModeBtn.textContent.includes("ON");
      infoModeBtn.textContent = isOn ? "Info Mode: OFF" : "Info Mode: ON";
      infoModeBtn.style.backgroundColor = isOn ? "#95a5a6" : "#3498db";
      infoModeBtn.style.color = "#fff";
      
      // Close any open info popups when toggling off
      if (isOn) {
        const map = getMap();
        if (map) {
          map.closePopup();
        }
      }
    });
    // Button styles are handled by CSS (.info-mode-btn)
  }

  window.handleHotelViewChange = handleHotelViewChange;
  
  // Phase dropdown change handler
  document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'popupPhase') {
      const phaseDisplay = document.getElementById('phaseDisplay');
      if (phaseDisplay) {
        // Use "No Phase" when value is empty, not "Phase 1"
        phaseDisplay.textContent = e.target.value ? `Phase ${e.target.value}` : "No Phase";
      }
    }
  });
};
