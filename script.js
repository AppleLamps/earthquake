class EarthquakeMonitor {
    constructor() {
        this.earthquakes = [];
        this.filteredEarthquakes = [];
        this.lastUpdateTime = null;
        this.notificationsEnabled = false;
        this.seenEarthquakes = new Set();
        this.updateInterval = null;
        this.map = null;
        this.mapMarkers = [];
        this.mapVisible = true;
        
        this.apiUrls = {
            'hour': 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
            'day': 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
            'week': 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
            'month': 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson',
            'all': 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson' // Use month as max for "all"
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkNotificationPermission();
        this.initializeMap();
        this.setInitialMapState();
        this.loadEarthquakeData();
        this.startAutoUpdate();
    }

    bindEvents() {
        // Notification toggle
        document.getElementById('notification-toggle').addEventListener('click', () => {
            this.toggleNotifications();
        });

        // Map toggle button
        document.getElementById('map-toggle').addEventListener('click', () => {
            this.toggleMap();
        });

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadEarthquakeData();
        });

        // Filter and sort controls
        document.getElementById('magnitude-filter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('time-filter').addEventListener('change', () => {
            this.loadEarthquakeData(); // Reload data when time range changes
        });

        document.getElementById('depth-filter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('location-search').addEventListener('input', () => {
            this.applyFilters();
        });

        document.getElementById('sort-filter').addEventListener('change', () => {
            this.applyFilters();
        });
    }

    async loadEarthquakeData() {
        try {
            this.updateStatus('Loading earthquake data...', 'loading');
            
            const timeRange = document.getElementById('time-filter').value || 'day';
            const apiUrl = this.apiUrls[timeRange];
            
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.processEarthquakeData(data);
            this.updateStatus(`Loaded ${this.earthquakes.length} earthquakes`, 'success');
            this.updateLastUpdatedTime();
            
        } catch (error) {
            console.error('Error loading earthquake data:', error);
            this.updateStatus('Failed to load data', 'error');
            this.showErrorState();
        }
    }

    processEarthquakeData(data) {
        const newEarthquakes = data.features.map(feature => ({
            id: feature.id,
            magnitude: feature.properties.mag || 0,
            location: feature.properties.place || 'Unknown location',
            time: feature.properties.time,
            depth: feature.geometry.coordinates[2] || 0,
            coordinates: [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
            url: feature.properties.url,
            title: feature.properties.title,
            isNew: !this.seenEarthquakes.has(feature.id)
        }));

        // Check for new significant earthquakes for notifications
        if (this.notificationsEnabled && this.earthquakes.length > 0) {
            this.checkForNotificationWorthy(newEarthquakes);
        }

        // Add all earthquake IDs to seen set
        newEarthquakes.forEach(eq => this.seenEarthquakes.add(eq.id));

        this.earthquakes = newEarthquakes;
        this.applyFilters();
    }

    initializeMap() {
        // Initialize map centered on global view
        this.map = L.map('map', {
            center: [20, 0],
            zoom: 2,
            minZoom: 1,
            maxZoom: 18,
            worldCopyJump: false, // Prevents jumping to the other side
            maxBounds: [         // Restricts panning to world bounds
                [-85, -180],
                [85, 180]
            ]
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(this.map);

        // Add a subtle earthquake layer legend
        this.addMapLegend();
    }

    addMapLegend() {
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = function() {
            const div = L.DomUtil.create('div', 'map-legend');
            div.innerHTML = `
                <div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); font-size: 12px;">
                    <strong>Magnitude</strong><br>
                    <div style="display: flex; align-items: center; margin: 4px 0;">
                        <div style="width: 12px; height: 12px; background: #27ae60; border-radius: 50%; margin-right: 6px;"></div>
                        < 3.0
                    </div>
                    <div style="display: flex; align-items: center; margin: 4px 0;">
                        <div style="width: 16px; height: 16px; background: #f39c12; border-radius: 50%; margin-right: 6px;"></div>
                        3.0 - 5.0
                    </div>
                    <div style="display: flex; align-items: center; margin: 4px 0;">
                        <div style="width: 20px; height: 20px; background: #e74c3c; border-radius: 50%; margin-right: 6px;"></div>
                        > 5.0
                    </div>
                </div>
            `;
            return div;
        };
        legend.addTo(this.map);
    }

    setInitialMapState() {
        // Set the initial state to show map with proper button state
        const mapToggleBtn = document.getElementById('map-toggle');
        mapToggleBtn.classList.add('active');
        mapToggleBtn.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            List
        `;
        
        // Ensure map size is properly calculated
        setTimeout(() => {
            this.map.invalidateSize();
        }, 100);
    }

    toggleMap() {
        const mapContainer = document.getElementById('earthquake-map');
        const mapToggleBtn = document.getElementById('map-toggle');
        
        this.mapVisible = !this.mapVisible;
        
        if (this.mapVisible) {
            mapContainer.classList.remove('hidden');
            mapToggleBtn.classList.add('active');
            mapToggleBtn.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                List
            `;
            
            // Invalidate map size after showing (required by Leaflet)
            setTimeout(() => {
                this.map.invalidateSize();
                this.updateMapMarkers();
            }, 100);
            
        } else {
            mapContainer.classList.add('hidden');
            mapToggleBtn.classList.remove('active');
            mapToggleBtn.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/>
                </svg>
                Map
            `;
        }
    }

    updateMapMarkers() {
        if (!this.map) return;

        // Clear existing markers
        this.mapMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.mapMarkers = [];

        // Add markers for filtered earthquakes
        this.filteredEarthquakes.forEach(earthquake => {
            const marker = this.createEarthquakeMarker(earthquake);
            marker.addTo(this.map);
            this.mapMarkers.push(marker);
        });

        // Fit map to show all markers if there are any
        if (this.mapMarkers.length > 0) {
            const group = new L.featureGroup(this.mapMarkers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    createEarthquakeMarker(earthquake) {
        const [lat, lng] = earthquake.coordinates;
        const magnitude = earthquake.magnitude;
        
        // Determine marker size and color based on magnitude
        let radius, color;
        if (magnitude < 3) {
            radius = 8;
            color = '#27ae60';
        } else if (magnitude < 5) {
            radius = 12;
            color = '#f39c12';
        } else {
            radius = 16;
            color = '#e74c3c';
        }

        const marker = L.circleMarker([lat, lng], {
            radius: radius,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        });

        // Create popup content
        const magnitudeClass = this.getMagnitudeClass(magnitude);
        const formattedTime = this.formatTime(earthquake.time);
        const popupContent = `
            <div class="earthquake-popup">
                <div class="magnitude-badge ${magnitudeClass}">M ${magnitude.toFixed(1)}</div>
                <h3>${this.escapeHtml(earthquake.title || earthquake.location)}</h3>
                <p><strong>Location:</strong> ${this.escapeHtml(earthquake.location)}</p>
                <p><strong>Time:</strong> ${formattedTime.time}, ${formattedTime.date}</p>
                <p><strong>Depth:</strong> ${earthquake.depth ? `${earthquake.depth.toFixed(1)} km` : 'Unknown'}</p>
                ${earthquake.url ? `<p><a href="${earthquake.url}" target="_blank" rel="noopener">View Details</a></p>` : ''}
            </div>
        `;

        marker.bindPopup(popupContent);

        // Add click event to highlight corresponding list item
        marker.on('click', () => {
            if (!this.mapVisible) {
                // If we're in list view, scroll to the earthquake item
                const earthquakeItem = document.querySelector(`[data-id="${earthquake.id}"]`);
                if (earthquakeItem) {
                    earthquakeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    earthquakeItem.style.background = '#fff3cd';
                    setTimeout(() => {
                        earthquakeItem.style.background = '';
                    }, 2000);
                }
            }
        });

        return marker;
    }

    checkForNotificationWorthy(newEarthquakes) {
        const significantThreshold = 4.5;
        const newSignificantEarthquakes = newEarthquakes.filter(eq => 
            eq.magnitude >= significantThreshold && eq.isNew
        );

        newSignificantEarthquakes.forEach(earthquake => {
            this.showNotification(earthquake);
        });
    }

    applyFilters() {
        const magnitudeFilter = parseFloat(document.getElementById('magnitude-filter').value);
        const depthFilter = document.getElementById('depth-filter').value;
        const locationSearch = document.getElementById('location-search').value.toLowerCase().trim();
        const sortFilter = document.getElementById('sort-filter').value;

        // Apply all filters
        this.filteredEarthquakes = this.earthquakes.filter(eq => {
            // Magnitude filter
            if (eq.magnitude < magnitudeFilter) return false;
            
            // Depth filter
            if (depthFilter !== 'all') {
                const depth = eq.depth || 0;
                switch (depthFilter) {
                    case 'shallow':
                        if (depth > 70) return false;
                        break;
                    case 'intermediate':
                        if (depth <= 70 || depth > 300) return false;
                        break;
                    case 'deep':
                        if (depth <= 300) return false;
                        break;
                }
            }
            
            // Location search filter
            if (locationSearch && !eq.location.toLowerCase().includes(locationSearch)) {
                return false;
            }
            
            return true;
        });

        // Apply sorting
        this.filteredEarthquakes.sort((a, b) => {
            switch (sortFilter) {
                case 'time-desc':
                    return b.time - a.time;
                case 'time-asc':
                    return a.time - b.time;
                case 'magnitude-desc':
                    return b.magnitude - a.magnitude;
                case 'magnitude-asc':
                    return a.magnitude - b.magnitude;
                case 'depth-asc':
                    return (a.depth || 0) - (b.depth || 0);
                case 'depth-desc':
                    return (b.depth || 0) - (a.depth || 0);
                default:
                    return b.time - a.time;
            }
        });

        this.renderEarthquakes();
    }

    renderEarthquakes() {
        const container = document.getElementById('earthquake-list');
        
        if (this.filteredEarthquakes.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            this.updateMapMarkers(); // Update map even with no results
            return;
        }

        const earthquakeHTML = this.filteredEarthquakes.map(earthquake => 
            this.getEarthquakeItemHTML(earthquake)
        ).join('');

        container.innerHTML = earthquakeHTML;

        // Update map markers
        this.updateMapMarkers();

        // Add animation class to new earthquakes
        setTimeout(() => {
            container.querySelectorAll('.earthquake-item.new').forEach(item => {
                item.classList.remove('new');
            });
        }, 500);
    }

    getEarthquakeItemHTML(earthquake) {
        const magnitudeClass = this.getMagnitudeClass(earthquake.magnitude);
        const formattedTime = this.formatTime(earthquake.time);
        const formattedDepth = earthquake.depth ? `${earthquake.depth.toFixed(1)} km deep` : 'Depth unknown';
        
        return `
            <div class="earthquake-item ${earthquake.isNew ? 'new' : ''}" data-id="${earthquake.id}" onclick="earthquakeMonitor.showEarthquakeOnMap('${earthquake.id}')">
                <div class="magnitude ${magnitudeClass}">
                    ${earthquake.magnitude.toFixed(1)}
                </div>
                <div class="earthquake-details">
                    <div class="earthquake-title">${this.escapeHtml(earthquake.title || earthquake.location)}</div>
                    <div class="earthquake-location">${this.escapeHtml(earthquake.location)}</div>
                    <div class="earthquake-depth">${formattedDepth}</div>
                </div>
                <div class="earthquake-time">
                    <div class="time-value">${formattedTime.time}</div>
                    <div>${formattedTime.date}</div>
                </div>
            </div>
        `;
    }

    showEarthquakeOnMap(earthquakeId) {
        const earthquake = this.filteredEarthquakes.find(eq => eq.id === earthquakeId);
        if (!earthquake || !this.map) return;

        // Switch to map view if not already visible
        if (!this.mapVisible) {
            this.toggleMap();
            // Wait for map to be visible before proceeding
            setTimeout(() => {
                this.centerMapOnEarthquake(earthquake);
            }, 200);
        } else {
            this.centerMapOnEarthquake(earthquake);
        }
    }

    centerMapOnEarthquake(earthquake) {
        const [lat, lng] = earthquake.coordinates;
        this.map.setView([lat, lng], 8);
        
        // Find and open the corresponding marker popup
        const marker = this.mapMarkers.find(m => {
            const markerLatLng = m.getLatLng();
            return Math.abs(markerLatLng.lat - lat) < 0.001 && Math.abs(markerLatLng.lng - lng) < 0.001;
        });
        
        if (marker) {
            marker.openPopup();
        }
    }

    getEmptyStateHTML() {
        return `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <h3>No earthquakes found</h3>
                <p>Try adjusting your filters or check back later.</p>
            </div>
        `;
    }

    getMagnitudeClass(magnitude) {
        if (magnitude < 3) return 'low';
        if (magnitude < 5) return 'moderate';
        return 'high';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMinutes = Math.floor((now - date) / (1000 * 60));
        
        let timeString;
        if (diffMinutes < 1) {
            timeString = 'Just now';
        } else if (diffMinutes < 60) {
            timeString = `${diffMinutes}m ago`;
        } else if (diffMinutes < 1440) {
            const hours = Math.floor(diffMinutes / 60);
            timeString = `${hours}h ago`;
        } else {
            timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        return {
            time: timeString,
            date: date.toLocaleDateString()
        };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateStatus(message, type = 'info') {
        const statusText = document.getElementById('status-text');
        const statusIcon = statusText.parentElement.querySelector('.status-icon');
        
        statusText.textContent = message;
        
        // Update icon based on status type
        let iconPath;
        switch (type) {
            case 'loading':
                iconPath = 'M12 6v6l4 2-1.5 2.5-5.5-3.25V6z'; // Clock icon
                break;
            case 'error':
                iconPath = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'; // Error icon
                break;
            case 'success':
            default:
                iconPath = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'; // Success icon
                break;
        }
        
        statusIcon.innerHTML = `<path d="${iconPath}"/>`;
    }

    updateLastUpdatedTime() {
        this.lastUpdateTime = new Date();
        const lastUpdatedElement = document.getElementById('last-updated');
        lastUpdatedElement.textContent = `Last updated: ${this.lastUpdateTime.toLocaleTimeString()}`;
    }

    showErrorState() {
        const container = document.getElementById('earthquake-list');
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <h3>Failed to load earthquake data</h3>
                <p>Please check your internet connection and try refreshing.</p>
            </div>
        `;
    }

    async toggleNotifications() {
        if (!('Notification' in window)) {
            alert('This browser does not support notifications');
            return;
        }

        if (Notification.permission === 'denied') {
            alert('Notifications are blocked. Please enable them in your browser settings.');
            return;
        }

        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                this.updateNotificationButtonState('denied');
                return;
            }
        }

        this.notificationsEnabled = !this.notificationsEnabled;
        this.updateNotificationButtonState(this.notificationsEnabled ? 'enabled' : 'disabled');
        
        // Store preference in localStorage
        localStorage.setItem('earthquakeNotifications', this.notificationsEnabled.toString());
    }

    checkNotificationPermission() {
        if (!('Notification' in window)) {
            this.updateNotificationButtonState('not-supported');
            return;
        }

        // Check stored preference
        const storedPreference = localStorage.getItem('earthquakeNotifications');
        if (storedPreference === 'true' && Notification.permission === 'granted') {
            this.notificationsEnabled = true;
            this.updateNotificationButtonState('enabled');
        } else {
            this.updateNotificationButtonState(Notification.permission === 'denied' ? 'denied' : 'disabled');
        }
    }

    updateNotificationButtonState(state) {
        const button = document.getElementById('notification-toggle');
        const icon = button.querySelector('.icon');
        
        // Reset classes
        button.classList.remove('enabled', 'denied');
        
        switch (state) {
            case 'enabled':
                button.classList.add('enabled');
                button.innerHTML = `
                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                    </svg>
                    Notifications On
                `;
                break;
            case 'denied':
                button.classList.add('denied');
                button.innerHTML = `
                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 18.69L7.84 6.14L5.27 3.49L4 4.76l2.8 2.8v.01c-.52.99-.8 2.16-.8 3.42v5l-2 2v1h13.73l2 2L21 19.73l-1-1.04zM12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-7.32V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68c-.15.03-.29.08-.42.12L18 14.68z"/>
                    </svg>
                    Notifications Blocked
                `;
                break;
            case 'not-supported':
                button.disabled = true;
                button.innerHTML = `
                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    Not Supported
                `;
                break;
            default:
                button.innerHTML = `
                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                    </svg>
                    Enable Notifications
                `;
                break;
        }
    }

    showNotification(earthquake) {
        if (!this.notificationsEnabled || Notification.permission !== 'granted') {
            return;
        }

        const title = `Magnitude ${earthquake.magnitude.toFixed(1)} Earthquake`;
        const options = {
            body: `${earthquake.location}\n${this.formatTime(earthquake.time).time}`,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23e74c3c"><path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/></svg>',
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23e74c3c"><path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/></svg>',
            tag: `earthquake-${earthquake.id}`,
            requireInteraction: earthquake.magnitude >= 5.0,
            silent: false
        };

        const notification = new Notification(title, options);
        
        notification.onclick = () => {
            window.focus();
            notification.close();
            
            // Scroll to the earthquake item
            const earthquakeItem = document.querySelector(`[data-id="${earthquake.id}"]`);
            if (earthquakeItem) {
                earthquakeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                earthquakeItem.style.background = '#fff3cd';
                setTimeout(() => {
                    earthquakeItem.style.background = '';
                }, 2000);
            }
        };

        // Auto-close notification after 10 seconds for non-critical earthquakes
        if (earthquake.magnitude < 5.0) {
            setTimeout(() => notification.close(), 10000);
        }
    }

    startAutoUpdate() {
        // Update every 5 minutes
        this.updateInterval = setInterval(() => {
            this.loadEarthquakeData();
        }, 5 * 60 * 1000);
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

// Initialize the earthquake monitor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.earthquakeMonitor = new EarthquakeMonitor();
});

// Handle page visibility changes to pause/resume updates
document.addEventListener('visibilitychange', () => {
    if (window.earthquakeMonitor) {
        if (document.hidden) {
            window.earthquakeMonitor.stopAutoUpdate();
        } else {
            window.earthquakeMonitor.startAutoUpdate();
            // Refresh data when page becomes visible again
            window.earthquakeMonitor.loadEarthquakeData();
        }
    }
});

// Handle online/offline events
window.addEventListener('online', () => {
    if (window.earthquakeMonitor) {
        window.earthquakeMonitor.loadEarthquakeData();
    }
});

window.addEventListener('offline', () => {
    if (window.earthquakeMonitor) {
        window.earthquakeMonitor.updateStatus('You are offline', 'error');
        window.earthquakeMonitor.stopAutoUpdate();
    }
}); 