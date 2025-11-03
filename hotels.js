import { getMap } from "./map.js";
import { getStatusColor, romanToNumber } from "./utils.js";
import { municipioLayers } from "./municipi.js";
import { API_URL } from "./config.js";

let hotels = [];
let currentMarkers = [];
let currentHotel = null;

export async function loadHotels() {
  try {
    const response = await fetch(`${API_URL}/api/hotels`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data || !Array.isArray(data)) throw new Error("Invalid data format");

    // ✅ FIX: Remove 'const' - update the GLOBAL variable
    hotels = data.map((r) => ({
      id: r.id,
      hotel_name: r.hotel_name || r.Hotel_Name,
      latitude: Number(r.latitude || r.Latitude),
      longitude: Number(r.longitude || r.Longitude),
      star_rating: r.star_rating || r.Star_Rating,
      municipio: r.municipio || r.Municipio,
      status: r.status || r.Status,
      phase: r.phase || r.Phase,
      notes: r.notes || r.Notes,
      address: r.address || r.Address,
    }));

    console.log("[hotels] fetched", {
      count: hotels.length, // Now shows global count
      sample: hotels.slice(0, 3),
    });

    handleHotelViewChange(); // Now uses the populated global array
  } catch (error) {
    console.error("[hotels] fetch error", error);
    hotels = []; // Clear global array on error
    handleHotelViewChange();
  }
}

export function handleHotelViewChange() {
  const map = getMap();
  if (!map) return;

  // ✅ Debounce rapid filter changes
  if (window.hotelFilterTimeout) clearTimeout(window.hotelFilterTimeout);
  window.hotelFilterTimeout = setTimeout(() => {
    map.closePopup();

    // ✅ PROPERLY Clear all existing markers
    currentMarkers.forEach((marker) => {
      if (marker && map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
    currentMarkers = [];

    const currentZoom = map.getZoom();
    const initialRadius = getMarkerRadius(currentZoom);
    const view = document.getElementById("viewSelect").value;
    const starFilter = document.getElementById("starFilter").value;

    const normalizeMunicipioToNumber = (val) => {
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (/^\d+$/.test(trimmed)) return Number(trimmed);
        return romanToNumber(trimmed);
      }
      return 0;
    };

    const viewNum = normalizeMunicipioToNumber(view);

    let hotelsInView = 0;
    const markersToAdd = [];

    hotels.forEach((hotel) => {
      const hotelMunicipioNum = normalizeMunicipioToNumber(hotel.municipio);

      // Apply filters
      if (view !== "full" && hotelMunicipioNum !== viewNum) return;
      if (starFilter !== "all" && hotel.star_rating != parseInt(starFilter))
        return;

      hotelsInView++;

      const marker = L.circleMarker([hotel.latitude, hotel.longitude], {
        radius: initialRadius,
        fillColor: getStatusColor(hotel.status),
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.9,
        interactive: true,
        bubblingMouseEvents: false,
      });

      marker.hotelData = hotel;
      marker.on("click", onMarkerClick);
      marker.on("touchstart", function (e) {
        e.originalEvent.preventDefault();
        onMarkerClick(e);
      });

      marker.addTo(map);
      markersToAdd.push(marker);
    });

    currentMarkers = markersToAdd;

    // ✅ SHOW "NO HOTELS" POPUP WHEN NEEDED
    if (view !== "full" && hotelsInView === 0) {
      const selectedMunicipio = municipioLayers.find(
        (layer) => layer.municipioId === viewNum
      );

      if (selectedMunicipio && selectedMunicipio.getBounds) {
        try {
          const bounds = selectedMunicipio.getBounds();
          if (bounds && bounds.isValid && bounds.isValid()) {
            const center = bounds.getCenter();

            // Close any existing popups first
            map.closePopup();

            // Small delay to ensure clean state
            setTimeout(() => {
              L.popup()
                .setLatLng(center)
                .setContent(
                  `<div style="padding: 10px; text-align: center;">
                              <h3>No Hotels Found</h3>
                              <p>No hotels available in Municipio ${view}</p>
                              <p><small>Try changing star rating filter</small></p>
                            </div>`
                )
                .openOn(map);
            }, 100);
          }
        } catch (error) {
          console.warn("[hotels] Could not show no-hotels popup:", error);
        }
      }

      console.warn("[hotels] no markers after filtering", {
        view,
        viewNum,
        starFilter,
        totalHotels: hotels.length,
        hotelsInView: hotelsInView,
      });
    }

    console.log("[hotels] filtering complete", {
      view,
      viewNum,
      starFilter,
      totalHotels: hotels.length,
      hotelsInView: hotelsInView,
      markersDisplayed: currentMarkers.length,
    });
  }, 150); // ✅ Wait 150ms before applying filters
}

let zoomTimeout;
export function setupMapPerformance() {
  const map = getMap();
  if (!map) return;

  // ✅ Debounced zoom handler to prevent excessive marker updates
  map.on("zoomend", function () {
    clearTimeout(zoomTimeout);
    zoomTimeout = setTimeout(() => {
      const currentZoom = map.getZoom();
      updateMarkerSizes(currentZoom);
    }, 150); // Wait 150ms after zoom ends
  });
}

function updateMarkerSizes(zoom) {
  const newRadius = getMarkerRadius(zoom);
  currentMarkers.forEach((marker) => {
    if (marker.setRadius) {
      marker.setRadius(newRadius);
    }
  });
}

function getMarkerRadius(zoom) {
  const minSize = 3,
    maxSize = 8,
    zoomRange = 15;
  return minSize + ((zoom - 10) / zoomRange) * (maxSize - minSize);
}

function onMarkerClick(e) {
  const hotel = e.target.hotelData;
  const map = getMap();

  console.log("[hotels] click", hotel);
  map.closePopup();

  setTimeout(() => {
    // Update hotel name - bold serif font
    document.getElementById("popupName").textContent = hotel.hotel_name;

    // Update municipality in top right
    const municipioEl = document.getElementById("popupMunicipio");
    if (municipioEl) {
      municipioEl.textContent = hotel.municipio || "—";
    }

    // Update star rating - golden yellow, format: "3★"
    const starsEl = document.getElementById("popupStars");
    if (starsEl) {
      starsEl.innerHTML = `<span class="star-number">${hotel.star_rating || "—"}</span>★`;
    }

    // Convert status to Italian for display only
    const statusItalian = getStatusItalian(hotel.status);
    document.getElementById("statusText").textContent = statusItalian;
    document.getElementById(
      "statusText"
    ).className = `status-text status-${statusItalian.toLowerCase()}`;
    
    // Update status dropdown trigger background color
    const statusTrigger = document.getElementById("statusDropdownTrigger");
    if (statusTrigger) {
      statusTrigger.className = `status-dropdown-trigger status-${statusItalian.toLowerCase()}`;
    }
    
    updateNeatlineColor(statusItalian);

    // Ensure dropdown is closed when opening popup
    const dropdown = document.getElementById("statusDropdown");
    if (dropdown) {
      dropdown.classList.add("hidden");
    }

    // Update address section
    const addressValue = document.getElementById("addressValue");
    if (addressValue) {
      addressValue.textContent = hotel.address || "—";
    }

    // Update coordinates
    const lat = Number(hotel.latitude);
    const lng = Number(hotel.longitude);
    const coordLat = document.getElementById("coordLat");
    const coordLong = document.getElementById("coordLong");
    if (coordLat) {
      coordLat.value = isFinite(lat) ? lat.toFixed(5) : "";
    }
    if (coordLong) {
      coordLong.value = isFinite(lng) ? lng.toFixed(5) : "";
    }

    // Update phase display and dropdown
    const phaseDisplay = document.getElementById("phaseDisplay");
    const phaseDropdown = document.getElementById("popupPhase");
    if (phaseDisplay) {
      phaseDisplay.textContent = hotel.phase ? `Phase ${hotel.phase}` : "Phase 1";
    }
    if (phaseDropdown) {
      phaseDropdown.value = hotel.phase || "";
      // Update display when dropdown changes
      phaseDropdown.addEventListener('change', function() {
        const display = document.getElementById('phaseDisplay');
        if (display) {
          display.textContent = this.value ? `Phase ${this.value}` : "Phase 1";
        }
      });
    }

    // Update notes
    const notesEl = document.getElementById("popupNotes");
    if (notesEl) {
      notesEl.value = hotel.notes || "";
    }

    // Show/hide phase controls based on Italian status
    const phaseControls = document.querySelector(".phase-controls");
    if (statusItalian === "VERDE" || statusItalian === "GIALLO") {
      phaseControls.classList.remove("hidden");
    } else {
      phaseControls.classList.add("hidden");
    }

    document.getElementById("popup").classList.remove("hidden");
    currentHotel = hotel;
  }, 50);
}

function positionPopupForMobile() {
  const popup = document.getElementById("popup");
  const map = getMap();
  const mapRect = map.getContainer().getBoundingClientRect();

  // Check if mobile device
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    // Position popup at bottom for mobile
    popup.style.position = "fixed";
    popup.style.bottom = "0";
    popup.style.left = "0";
    popup.style.right = "0";
    popup.style.top = "auto";
    popup.style.transform = "none";
    popup.style.zIndex = "1000";
    popup.style.maxHeight = "60vh";
    popup.style.overflowY = "auto";

    // Add backdrop for mobile
    addMobileBackdrop();
  } else {
    // Reset styles for desktop
    popup.style.position = "";
    popup.style.bottom = "";
    popup.style.left = "";
    popup.style.right = "";
    popup.style.top = "";
    popup.style.transform = "";
    popup.style.zIndex = "";
    popup.style.maxHeight = "";
    popup.style.overflowY = "";

    removeMobileBackdrop();
  }
}

function addMobileBackdrop() {
  let backdrop = document.getElementById("mobileBackdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "mobileBackdrop";
    backdrop.style.position = "fixed";
    backdrop.style.top = "0";
    backdrop.style.left = "0";
    backdrop.style.right = "0";
    backdrop.style.bottom = "0";
    backdrop.style.backgroundColor = "rgba(0,0,0,0.5)";
    backdrop.style.zIndex = "999";
    backdrop.addEventListener("click", closePopup);
    document.body.appendChild(backdrop);
  }
  backdrop.classList.remove("hidden");
}

function removeMobileBackdrop() {
  const backdrop = document.getElementById("mobileBackdrop");
  if (backdrop) {
    backdrop.classList.add("hidden");
  }
}

// Fix toggleStatusDropdown function
function toggleStatusDropdown(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById("statusDropdown");
  if (dropdown) {
    dropdown.classList.toggle("hidden");
  }
}

// Phase dropdown is handled by native select overlay
// Add click outside to close dropdown
document.addEventListener("click", function (event) {
  const dropdown = document.getElementById("statusDropdown");
  const trigger = document.querySelector(".status-dropdown-trigger");

  if (
    dropdown &&
    !dropdown.contains(event.target) &&
    !trigger.contains(event.target)
  ) {
    dropdown.classList.add("hidden");
  }
});

// Helper function to convert status to Italian
function getStatusItalian(status) {
  const statusMap = {
    Green: "VERDE",
    Yellow: "GIALLO",
    Red: "ROSSO",
    White: "BIANCO",
  };
  return statusMap[status] || status;
}

// Helper function to convert Italian back to English for saving
function getStatusEnglish(italianStatus) {
  const statusMap = {
    VERDE: "Green",
    GIALLO: "Yellow",
    ROSSO: "Red",
    BIANCO: "White",
  };
  return statusMap[italianStatus] || italianStatus;
}

function updateNeatlineColor(status) {
  const neatline = document.querySelector(".popup-top-line");
  if (!neatline) return;

  // Remove all color classes
  neatline.classList.remove(
    "neatline-verde",
    "neatline-giallo",
    "neatline-rosso",
    "neatline-bianco"
  );

  // Add the appropriate color class
  switch (status) {
    case "VERDE":
      neatline.classList.add("neatline-verde");
      break;
    case "GIALLO":
      neatline.classList.add("neatline-giallo");
      break;
    case "ROSSO":
      neatline.classList.add("neatline-rosso");
      break;
    case "BIANCO":
      neatline.classList.add("neatline-bianco");
      break;
    default:
      neatline.classList.add("neatline-verde"); // Default fallback
  }
}

function changeStatus(newStatus) {
  const statusTextEl = document.getElementById("statusText");
  statusTextEl.textContent = newStatus;
  statusTextEl.className = `status-text status-${newStatus.toLowerCase()}`;
  
  // Update status dropdown trigger background color
  const statusTrigger = document.getElementById("statusDropdownTrigger");
  if (statusTrigger) {
    statusTrigger.className = `status-dropdown-trigger status-${newStatus.toLowerCase()}`;
  }
  
  // Update the top neatline color
  updateNeatlineColor(newStatus);
  
  // Close dropdown after selection
  const dropdown = document.getElementById("statusDropdown");
  if (dropdown) {
    dropdown.classList.add("hidden");
  }

  const phaseControls = document.querySelector(".phase-controls");
  if (newStatus === "VERDE" || newStatus === "GIALLO") {
    phaseControls.classList.remove("hidden");
  } else {
    phaseControls.classList.add("hidden");
    const phaseDropdown = document.getElementById("popupPhase");
    if (phaseDropdown) {
      phaseDropdown.value = "";
    }
    const phaseDisplay = document.getElementById("phaseDisplay");
    if (phaseDisplay) {
      phaseDisplay.textContent = "—";
    }
  }
}

// Add global click listener to close dropdown when clicking outside
document.addEventListener("click", function (event) {
  const dropdown = document.getElementById("statusDropdown");
  const trigger = document.querySelector(".status-dropdown-trigger");

  if (dropdown && !dropdown.classList.contains("hidden")) {
    if (!dropdown.contains(event.target) && !trigger.contains(event.target)) {
      dropdown.classList.add("hidden");
    }
  }
});

async function saveHotel() {
  if (!currentHotel) return;
  const id = currentHotel.id;

  // Convert Italian status back to English for API
  const italianStatus = document.getElementById("statusText").textContent;
  const status = getStatusEnglish(italianStatus);

  const phaseVal = document.getElementById("popupPhase").value;
  const notes = document.getElementById("popupNotes").value;
  const phase = phaseVal === "" ? null : phaseVal;

  try {
    const response = await fetch(`${API_URL}/api/hotels/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        phase: phase ? Number(phase) : null,
        notes: notes || null,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const updatedHotel = await response.json();

    // Update local data
    currentHotel.status = updatedHotel.status;
    currentHotel.phase = updatedHotel.phase;
    currentHotel.notes = updatedHotel.notes;

    // Update hotels array
    const idx = hotels.findIndex((h) => h.id === id);
    if (idx !== -1) {
      hotels[idx] = { ...hotels[idx], ...updatedHotel };
    }

    // Update marker color (using English status for color function)
    const marker = currentMarkers.find(
      (m) => m.hotelData && m.hotelData.id === id
    );
    if (marker) {
      marker.hotelData = { ...marker.hotelData, ...updatedHotel };
      marker.setStyle({ fillColor: getStatusColor(updatedHotel.status) });
    }

    console.log("✅ Hotel saved successfully:", updatedHotel);
    closePopup();
  } catch (err) {
    console.error("[hotels] save error", err);
    alert("Failed to save hotel. Please try again.");
  }
}

// Fix the closePopup function to handle null elements
function closePopup() {
  const popup = document.getElementById("popup");
  if (popup) {
    popup.classList.add("hidden");
  }

  const dropdown = document.getElementById("statusDropdown");
  if (dropdown) {
    dropdown.classList.add("hidden");
  }

  // Remove mobile backdrop if it exists
  const backdrop = document.getElementById("mobileBackdrop");
  if (backdrop) {
    backdrop.classList.add("hidden");
  }

  document.body.classList.remove("popup-open");
  currentHotel = null;
}

window.closePopup = closePopup;
window.saveHotel = saveHotel;
window.toggleStatusDropdown = toggleStatusDropdown;
window.changeStatus = changeStatus;
