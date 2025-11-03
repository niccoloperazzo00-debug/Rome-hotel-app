import { initMap } from "./map.js";
import { loadDifferenceMask, removeDifferenceMask } from "./countries.js";
import { applyRomeBoundsAndSoften, removeRomeSoftener } from "./rome.js";
import {
  loadMunicipioBoundaries,
  handleMunicipioViewChange,
} from "./municipi.js";
import { loadHotels, handleHotelViewChange } from "./hotels.js";

window.onload = () => {
  initMap();

  // ✅ Initialize performance optimizations
  setTimeout(() => {
    if (window.setupMapPerformance) {
      setupMapPerformance();
    }
  }, 1000);

  loadDifferenceMask();
  loadMunicipioBoundaries(true).then(() => {
    loadHotels();
  });

  // Mask toggle
  let maskEnabled = true;
  const maskBtn = document.getElementById("maskToggle");
  if (maskBtn) {
    maskBtn.addEventListener("click", () => {
      maskEnabled = !maskEnabled;
      if (maskEnabled) {
        loadDifferenceMask();
        // applyRomeBoundsAndSoften(); // ✅ REMOVED to prevent patina/darkening
        maskBtn.textContent = "Hide Mask";
      } else {
        removeDifferenceMask();
        removeRomeSoftener();
        maskBtn.textContent = "Show Mask";
      }
    });
  }

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

  window.handleHotelViewChange = handleHotelViewChange;
  
  // Phase dropdown change handler
  document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'popupPhase') {
      const phaseDisplay = document.getElementById('phaseDisplay');
      if (phaseDisplay) {
        phaseDisplay.textContent = e.target.value ? `Phase ${e.target.value}` : "Phase 1";
      }
    }
  });
};
