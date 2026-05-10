/**
 * VPN.js - Geolocation Spoofer for Colombia
 * Mocks the browser's Geolocation API to return Colombian location data
 */

(function() {
    // Colombian coordinates (Bogotá as default)
    const COLOMBIA_COORDS = {
        latitude: 4.7110,
        longitude: -74.0055,
        accuracy: 50,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
    };

    // Store the original geolocation object
    const originalGeolocation = navigator.geolocation;

    // Create a mock geolocation object
    const mockGeolocation = {
        getCurrentPosition: function(successCallback, errorCallback, options) {
            // Simulate a slight delay to mimic real geolocation API
            setTimeout(function() {
                try {
                    const position = {
                        coords: {
                            latitude: COLOMBIA_COORDS.latitude,
                            longitude: COLOMBIA_COORDS.longitude,
                            accuracy: COLOMBIA_COORDS.accuracy,
                            altitude: COLOMBIA_COORDS.altitude,
                            altitudeAccuracy: COLOMBIA_COORDS.altitudeAccuracy,
                            heading: COLOMBIA_COORDS.heading,
                            speed: COLOMBIA_COORDS.speed
                        },
                        timestamp: Date.now()
                    };
                    successCallback(position);
                } catch (error) {
                    if (errorCallback) {
                        errorCallback({
                            code: 1,
                            message: 'User denied geolocation'
                        });
                    }
                }
            }, 500);
        },

        watchPosition: function(successCallback, errorCallback, options) {
            // Return a watch ID (same as getCurrentPosition but returns a watch ID)
            let watchId = Math.random();
            
            const sendPosition = () => {
                try {
                    const position = {
                        coords: {
                            latitude: COLOMBIA_COORDS.latitude,
                            longitude: COLOMBIA_COORDS.longitude,
                            accuracy: COLOMBIA_COORDS.accuracy,
                            altitude: COLOMBIA_COORDS.altitude,
                            altitudeAccuracy: COLOMBIA_COORDS.altitudeAccuracy,
                            heading: COLOMBIA_COORDS.heading,
                            speed: COLOMBIA_COORDS.speed
                        },
                        timestamp: Date.now()
                    };
                    successCallback(position);
                } catch (error) {
                    if (errorCallback) {
                        errorCallback({
                            code: 1,
                            message: 'User denied geolocation'
                        });
                    }
                }
            };

            // Send initial position
            setTimeout(sendPosition, 500);

            // Set up interval if needed
            const interval = setInterval(sendPosition, 5000);

            return watchId;
        },

        clearWatch: function(watchId) {
            // Placeholder for clearing watches
            return true;
        }
    };

    // Override the geolocation API
    Object.defineProperty(navigator, 'geolocation', {
        value: mockGeolocation,
        writable: false,
        configurable: true
    });

    // Console log to confirm VPN is active
    console.log('🌎 VPN.js activated - Location spoofed to Colombia (Bogotá)');
    console.log('📍 Coordinates: Lat ' + COLOMBIA_COORDS.latitude + ', Lng ' + COLOMBIA_COORDS.longitude);
})();
