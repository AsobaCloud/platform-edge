/**
 * Edge Device Registry
 * Manages device discovery, registration, and capability detection
 */

(function() {
    'use strict';

    // Edge Device Registry object
    const EdgeDeviceRegistry = {
        devices: new Map(),
        discoveryInProgress: false,
        apiBaseUrl: '/api', // Backend API URL
        
        /**
         * Initialize the device registry
         */
        init: function() {
            console.log('EdgeDeviceRegistry: Initializing...');
            this.loadStoredDevices();
            // If no devices found, load demo data
            if (this.devices.size === 0) {
                this.loadDemoDevices();
            }
            this.startPeriodicHealthCheck();
        },

        /**
         * Load demo devices (3 inverters)
         */
        loadDemoDevices: function() {
            console.log('EdgeDeviceRegistry: Loading demo devices...');
            
            const demoDevices = [
                {
                    id: 'inverter-001',
                    name: 'Solar Inverter Alpha',
                    ip: '192.168.1.101',
                    type: 'full-platform',
                    status: 'online',
                    lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
                    capabilities: {
                        docker: { installed: true, version: '24.0.0' },
                        platformEdge: { deployed: true, version: '1.2.0' },
                        services: [
                            { id: 'forecasting-api', name: 'Solar Energy Forecasting', version: '2.0.0' },
                            { id: 'fault-detection', name: 'Fault Detection', version: '1.0.0' }
                        ],
                        system: {
                            available: true,
                            architecture: 'arm64',
                            memory: '8GB',
                            storage: '128GB'
                        }
                    },
                    dataSources: ['cpu_metrics', 'ram_metrics', 'temperature_sensors', 'energy_consumption']
                },
                {
                    id: 'inverter-002',
                    name: 'Solar Inverter Beta',
                    ip: '192.168.1.102',
                    type: 'docker-ready',
                    status: 'online',
                    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                    capabilities: {
                        docker: { installed: true, version: '23.0.0' },
                        platformEdge: { deployed: false },
                        services: [
                            { id: 'energy-analyst-rag', name: 'Energy Analyst RAG', version: '1.0.0' }
                        ],
                        system: {
                            available: true,
                            architecture: 'x86_64',
                            memory: '16GB',
                            storage: '256GB'
                        }
                    },
                    dataSources: ['cpu_metrics', 'ram_metrics', 'disk_io', 'network_stats']
                },
                {
                    id: 'inverter-003',
                    name: 'Solar Inverter Gamma',
                    ip: '192.168.1.103',
                    type: 'legacy-edge',
                    status: 'offline',
                    lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
                    capabilities: {
                        docker: { installed: false },
                        platformEdge: { deployed: false },
                        services: [],
                        system: {
                            available: false,
                            architecture: 'armv7',
                            memory: '4GB',
                            storage: '64GB'
                        }
                    },
                    dataSources: ['cpu_metrics', 'ram_metrics']
                }
            ];

            demoDevices.forEach(device => {
                this.devices.set(device.id, device);
            });

            // Save demo devices to localStorage
            this.saveDevices();
            console.log(`EdgeDeviceRegistry: Loaded ${demoDevices.length} demo devices`);
        },

        /**
         * Load devices from API
         */
        loadStoredDevices: async function() {
            try {
                const response = await fetch(`${this.apiBaseUrl}/devices`);
                if (response.ok) {
                    const deviceList = await response.json();
                    deviceList.forEach(device => {
                        this.devices.set(device.id, device);
                    });
                    console.log(`EdgeDeviceRegistry: Loaded ${deviceList.length} devices from API`);
                } else {
                    console.log('EdgeDeviceRegistry: No devices found or API not available');
                }
            } catch (error) {
                console.error('EdgeDeviceRegistry: Error loading devices from API:', error);
                // Fallback to localStorage
                this.loadFromLocalStorage();
            }
        },

        /**
         * Load devices from localStorage (fallback)
         */
        loadFromLocalStorage: function() {
            try {
                const stored = localStorage.getItem('edgeDevices');
                if (stored) {
                    const deviceList = JSON.parse(stored);
                    deviceList.forEach(device => {
                        this.devices.set(device.id, device);
                    });
                    console.log(`EdgeDeviceRegistry: Loaded ${deviceList.length} devices from localStorage`);
                }
            } catch (error) {
                console.error('EdgeDeviceRegistry: Error loading stored devices:', error);
            }
        },

        /**
         * Save devices to localStorage
         */
        saveDevices: function() {
            try {
                const deviceList = Array.from(this.devices.values());
                localStorage.setItem('edgeDevices', JSON.stringify(deviceList));
                console.log('EdgeDeviceRegistry: Saved devices to storage');
            } catch (error) {
                console.error('EdgeDeviceRegistry: Error saving devices:', error);
            }
        },

        /**
         * Discover a new device
         */
        discoverDevice: async function(ip, username, password) {
            if (this.discoveryInProgress) {
                console.log('EdgeDeviceRegistry: Discovery already in progress');
                return null;
            }

            this.discoveryInProgress = true;
            console.log(`EdgeDeviceRegistry: Discovering device at ${ip}`);

            try {
                // Call backend API for device discovery
                const response = await fetch(`${this.apiBaseUrl}/devices`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ip: ip,
                        username: username,
                        password: password
                    })
                });

                if (response.ok) {
                    const device = await response.json();
                    // Initialize dataSources array if not present
                    if (!device.dataSources) {
                        device.dataSources = [];
                    }
                    this.devices.set(device.id, device);
                    this.saveDevices();
                    console.log('EdgeDeviceRegistry: Device discovery completed', device);
                    return device;
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Device discovery failed');
                }

            } catch (error) {
                console.error('EdgeDeviceRegistry: Device discovery failed:', error);
                throw error;
            } finally {
                this.discoveryInProgress = false;
            }
        },

        /**
         * Detect device capabilities
         */
        detectCapabilities: async function(device) {
            console.log(`EdgeDeviceRegistry: Detecting capabilities for ${device.ip}`);

            try {
                // Basic system info
                const systemInfo = await this.getSystemInfo(device);
                device.capabilities.system = systemInfo;

                // Check for Docker
                const dockerInfo = await this.checkDocker(device);
                device.capabilities.docker = dockerInfo;

                // Check for platform-edge
                const platformEdgeInfo = await this.checkPlatformEdge(device);
                device.capabilities.platformEdge = platformEdgeInfo;

                // Check for existing services
                const servicesInfo = await this.checkServices(device);
                device.capabilities.services = servicesInfo;

                // Determine device type based on capabilities
                device.type = this.determineDeviceType(device.capabilities);

                console.log(`EdgeDeviceRegistry: Capabilities detected for ${device.ip}:`, device.capabilities);

            } catch (error) {
                console.error(`EdgeDeviceRegistry: Capability detection failed for ${device.ip}:`, error);
                throw error;
            }
        },

        /**
         * Get basic system information
         */
        getSystemInfo: async function(device) {
            try {
                const response = await fetch(`http://${device.ip}/health`);
                if (response.ok) {
                    const healthData = await response.json();
                    return {
                        available: true,
                        service: healthData.service,
                        version: healthData.version,
                        timestamp: healthData.timestamp
                    };
                }
            } catch (error) {
                console.log(`EdgeDeviceRegistry: Health endpoint not available for ${device.ip}`);
            }

            // Fallback: try to get basic info via SSH simulation
            return {
                available: false,
                architecture: 'unknown',
                memory: 'unknown',
                storage: 'unknown'
            };
        },

        /**
         * Check for Docker installation
         */
        checkDocker: async function(device) {
            // This would typically be done via SSH or API
            // For now, we'll simulate based on the device profile
            return {
                installed: false,
                version: null,
                containers: []
            };
        },

        /**
         * Check for platform-edge deployment
         */
        checkPlatformEdge: async function(device) {
            // This would typically be done via SSH or API
            // For now, we'll simulate based on the device profile
            return {
                deployed: false,
                version: null,
                services: []
            };
        },

        /**
         * Check for existing services
         */
        checkServices: async function(device) {
            const services = [];

            // Check for Redis
            try {
                const redisResponse = await fetch(`http://${device.ip}/health`);
                if (redisResponse.ok) {
                    services.push({
                        name: 'redis',
                        status: 'running',
                        port: 6379
                    });
                }
            } catch (error) {
                // Redis not accessible via HTTP
            }

            // Check for Nginx
            try {
                const nginxResponse = await fetch(`http://${device.ip}/`);
                if (nginxResponse.ok) {
                    services.push({
                        name: 'nginx',
                        status: 'running',
                        port: 80
                    });
                }
            } catch (error) {
                // Nginx not accessible
            }

            return services;
        },

        /**
         * Determine device type based on capabilities
         */
        determineDeviceType: function(capabilities) {
            if (capabilities.docker?.installed && capabilities.platformEdge?.deployed) {
                return 'full-platform';
            } else if (capabilities.docker?.installed) {
                return 'docker-ready';
            } else if (capabilities.services?.length > 0) {
                return 'legacy-edge';
            } else {
                return 'basic-edge';
            }
        },

        /**
         * Get all devices
         */
        getAllDevices: function() {
            return Array.from(this.devices.values());
        },

        /**
         * Get device by ID
         */
        getDevice: function(id) {
            return this.devices.get(id);
        },

        /**
         * Update device
         */
        updateDevice: function(id, updates) {
            const device = this.devices.get(id);
            if (device) {
                Object.assign(device, updates);
                device.lastSeen = new Date().toISOString();
                this.devices.set(id, device);
                this.saveDevices();
                return device;
            }
            return null;
        },

        /**
         * Remove device
         */
        removeDevice: function(id) {
            const removed = this.devices.delete(id);
            if (removed) {
                this.saveDevices();
            }
            return removed;
        },

        /**
         * Start periodic health check
         */
        startPeriodicHealthCheck: function() {
            setInterval(() => {
                this.checkAllDevicesHealth();
            }, 30000); // Check every 30 seconds
        },

        /**
         * Check health of all devices
         */
        checkAllDevicesHealth: async function() {
            const devices = this.getAllDevices();
            for (const device of devices) {
                try {
                    const response = await fetch(`http://${device.ip}/health`, {
                        timeout: 5000
                    });
                    if (response.ok) {
                        this.updateDevice(device.id, { status: 'online' });
                    } else {
                        this.updateDevice(device.id, { status: 'offline' });
                    }
                } catch (error) {
                    this.updateDevice(device.id, { status: 'offline' });
                }
            }
        }
    };

    // Make EdgeDeviceRegistry available globally
    window.EdgeDeviceRegistry = EdgeDeviceRegistry;

})();