/**
 * Edge Device UI Manager
 * Handles dynamic UI generation based on device capabilities
 */

(function() {
    'use strict';

    // Edge Device UI Manager
    const EdgeDeviceUI = {
        currentSection: 'dashboard',
        
        /**
         * Initialize the UI manager
         */
        init: function() {
            console.log('EdgeDeviceUI: Initializing...');
            
            // Wait for DOM to be fully ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.setupEventListeners();
                    this.loadDeviceDashboard();
                });
            } else {
                this.setupEventListeners();
                this.loadDeviceDashboard();
            }
        },

        /**
         * Setup event listeners
         */
        setupEventListeners: function() {
            // Navigation buttons
            const navButtons = document.querySelectorAll('.nav-button');
            console.log('EdgeDeviceUI: Found', navButtons.length, 'nav buttons');
            
            navButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = e.currentTarget.dataset.section;
                    console.log('EdgeDeviceUI: Nav button clicked, section:', section);
                    this.switchSection(section);
                });
            });
        },

        /**
         * Switch between sections
         */
        switchSection: function(sectionId) {
            console.log('EdgeDeviceUI: Switching to section:', sectionId);
            
            // Update navigation
            document.querySelectorAll('.nav-button').forEach(btn => {
                btn.classList.remove('active');
            });
            const navButton = document.querySelector(`[data-section="${sectionId}"]`);
            if (navButton) {
                navButton.classList.add('active');
                console.log('EdgeDeviceUI: Nav button activated');
            } else {
                console.error('EdgeDeviceUI: Nav button not found for section:', sectionId);
            }

            // Update content
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            const contentSection = document.getElementById(sectionId);
            if (contentSection) {
                contentSection.classList.add('active');
                console.log('EdgeDeviceUI: Content section activated');
            } else {
                console.error('EdgeDeviceUI: Content section not found:', sectionId);
            }

            this.currentSection = sectionId;

            // Load section-specific content
            this.loadSectionContent(sectionId);
        },

        /**
         * Load section-specific content
         */
        loadSectionContent: function(sectionId) {
            switch (sectionId) {
                case 'dashboard':
                    this.loadDeviceDashboard();
                    break;
                case 'discovery':
                    this.loadDiscoverySection();
                    break;
                case 'deployment':
                    this.loadDeploymentSection();
                    break;
                case 'monitoring':
                    this.loadMonitoringSection();
                    break;
                case 'configuration':
                    this.loadConfigurationSection();
                    break;
                case 'performance':
                    this.loadPerformanceSection();
                    break;
                case 'logs':
                    this.loadLogsSection();
                    break;
            }
        },

        /**
         * Load device dashboard
         */
        loadDeviceDashboard: function() {
            console.log('EdgeDeviceUI: Loading dashboard with activity feed');
            this.renderActivityFeed();
        },

        /**
         * Render activity feed
         */
        renderActivityFeed: function() {
            const container = document.getElementById('deviceActivityStream');
            if (!container) {
                console.error('EdgeDeviceUI: Activity stream container not found');
                return;
            }

            // Get activity data (mock for now, can be connected to API later)
            const activities = this.getDeviceActivities();

            if (activities.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <h3>No recent activity</h3>
                        <p>Activity will appear here as you discover and manage devices.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = activities.map(activity => this.renderActivityItem(activity)).join('');
        },

        /**
         * Get device activities (mock data for now)
         */
        getDeviceActivities: function() {
            const activities = [];
            const devices = window.EdgeDeviceRegistry.getAllDevices();
            const now = Date.now();

            // Generate activities from devices with realistic timestamps
            devices.forEach((device, index) => {
                // Calculate discovery time based on device index (most recent first)
                const hoursAgo = index * 2; // 0, 2, 4 hours ago
                const discoveryTime = new Date(now - hoursAgo * 60 * 60 * 1000);

                // Device discovery activity
                activities.push({
                    type: 'discovery',
                    title: 'Device Discovered',
                    description: `Device "${device.name}" (${device.ip}) was discovered and added to the system`,
                    timestamp: discoveryTime,
                    deviceId: device.id,
                    deviceName: device.name
                });

                // Data source configuration activity (if configured)
                if (device.dataSources && device.dataSources.length > 0) {
                    const configTime = new Date(discoveryTime.getTime() + 5 * 60 * 1000);
                    activities.push({
                        type: 'configuration',
                        title: 'Data Sources Configured',
                        description: `${device.dataSources.length} data source(s) configured for ${device.name}`,
                        timestamp: configTime,
                        deviceId: device.id,
                        deviceName: device.name
                    });
                }

                // Service deployment activity (if services exist)
                if (device.capabilities?.services && device.capabilities.services.length > 0) {
                    const deployTime = new Date(discoveryTime.getTime() + 10 * 60 * 1000);
                    device.capabilities.services.forEach((service, sIndex) => {
                        activities.push({
                            type: 'deployment',
                            title: 'Service Deployed',
                            description: `Service "${service.name || service.id}" deployed to ${device.name}`,
                            timestamp: new Date(deployTime.getTime() + sIndex * 2 * 60 * 1000),
                            deviceId: device.id,
                            deviceName: device.name,
                            serviceName: service.name || service.id
                        });
                    });
                }

                // Status change activity
                if (device.status === 'online') {
                    const statusTime = new Date(discoveryTime.getTime() + 15 * 60 * 1000);
                    activities.push({
                        type: 'status',
                        title: 'Device Online',
                        description: `${device.name} is now online and responding`,
                        timestamp: statusTime,
                        deviceId: device.id,
                        deviceName: device.name
                    });
                }

                // Add monitoring activity for online devices
                if (device.status === 'online') {
                    const monitoringTime = new Date(now - (hoursAgo * 60 + 45) * 60 * 1000);
                    activities.push({
                        type: 'monitoring',
                        title: 'Health Check Completed',
                        description: `Health check passed for ${device.name}. All systems operational.`,
                        timestamp: monitoringTime,
                        deviceId: device.id,
                        deviceName: device.name
                    });
                }
            });

            // Sort by timestamp (newest first) and limit to 20
            return activities
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 20);
        },

        /**
         * Render activity item
         */
        renderActivityItem: function(activity) {
            const icons = {
                discovery: '<i class="fas fa-search"></i>',
                deployment: '<i class="fas fa-rocket"></i>',
                monitoring: '<i class="fas fa-chart-line"></i>',
                configuration: '<i class="fas fa-cog"></i>',
                status: '<i class="fas fa-circle"></i>'
            };

            const icon = icons[activity.type] || '<i class="fas fa-circle"></i>';
            const timeAgo = this.formatTimestamp(activity.timestamp);

            return `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type}">${icon}</div>
                    <div class="activity-content">
                        <div class="activity-title">${this.escapeHtml(activity.title)}</div>
                        <div class="activity-description">${this.escapeHtml(activity.description)}</div>
                        <div class="activity-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        },

        /**
         * Add activity to feed
         */
        addActivity: function(type, title, description, deviceId = null, deviceName = null) {
            const activity = {
                type: type,
                title: title,
                description: description,
                timestamp: new Date(),
                deviceId: deviceId,
                deviceName: deviceName
            };

            // Re-render activity feed
            this.renderActivityFeed();

            return activity;
        },

        /**
         * Generate device card HTML
         * @param {Object} device - Device object
         * @param {boolean} showConfigure - Whether to show Configure button (for Discovery section)
         */
        generateDeviceCard: function(device, showConfigure = false) {
            const statusClass = this.getStatusClass(device.status);
            const deviceType = this.getDeviceTypeDisplay(device.type);
            const capabilities = this.getCapabilitySummary(device.capabilities);
            const dataSources = this.getDeviceDataSources(device.id);
            const dataSourceCount = dataSources ? dataSources.length : 0;

            return `
                <div class="device-card" data-device-id="${device.id}">
                    <div class="device-header">
                        <div>
                            <div class="device-name">${device.name}</div>
                            <div class="device-type">${deviceType}</div>
                        </div>
                        <div class="device-status ${statusClass}">${device.status}</div>
                    </div>
                    
                    <div class="device-info">
                        <div class="info-row">
                            <span class="info-label">IP Address:</span>
                            <span class="info-value">${device.ip}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Last Seen:</span>
                            <span class="info-value">${this.formatTimestamp(device.lastSeen)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Capabilities:</span>
                            <span class="info-value">${capabilities}</span>
                        </div>
                        ${showConfigure ? `
                        <div class="info-row">
                            <span class="info-label">Data Sources:</span>
                            <span class="info-value">${dataSourceCount} configured</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="device-actions">
                        ${showConfigure ? `
                        <button class="btn btn-primary" onclick="EdgeDeviceUI.openDataSourceConfigModal('${device.id}')">
                            <span class="nav-icon">⚙️</span>
                            Configure
                        </button>
                        ` : ''}
                        <button class="btn btn-secondary" onclick="EdgeDeviceUI.viewDevice('${device.id}')">
                            <span class="nav-icon">👁️</span>
                            View Details
                        </button>
                        ${!showConfigure ? `
                        <button class="btn btn-secondary" onclick="EdgeDeviceUI.manageDevice('${device.id}')">
                            <span class="nav-icon">⚙️</span>
                            Manage
                        </button>
                        ${device.status === 'online' ? 
                            `<button class="btn btn-success" onclick="EdgeDeviceUI.deployToDevice('${device.id}')">
                                <span class="nav-icon">🚀</span>
                                Deploy
                            </button>` : ''
                        }
                        ` : ''}
                    </div>
                </div>
            `;
        },

        /**
         * Get status CSS class
         */
        getStatusClass: function(status) {
            switch (status) {
                case 'online': return 'status-online';
                case 'offline': return 'status-offline';
                default: return 'status-unknown';
            }
        },

        /**
         * Get device type display name
         */
        getDeviceTypeDisplay: function(type) {
            switch (type) {
                case 'full-platform': return 'Full Platform Edge';
                case 'docker-ready': return 'Docker Ready';
                case 'legacy-edge': return 'Legacy Edge Device';
                case 'basic-edge': return 'Basic Edge Device';
                default: return 'Unknown Device';
            }
        },

        /**
         * Get capability summary
         */
        getCapabilitySummary: function(capabilities) {
            const caps = [];
            if (capabilities.docker?.installed) caps.push('Docker');
            if (capabilities.platformEdge?.deployed) caps.push('Platform Edge');
            if (capabilities.services?.length > 0) caps.push(`${capabilities.services.length} Services`);
            return caps.join(', ') || 'Basic';
        },

        /**
         * Format timestamp
         */
        formatTimestamp: function(timestamp) {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            
            if (diff < 60000) return 'Just now';
            if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
            return date.toLocaleDateString();
        },

        /**
         * View device details
         */
        viewDevice: function(deviceId) {
            const device = window.EdgeDeviceRegistry.getDevice(deviceId);
            if (device) {
                // Open device detail page
                window.open(`edge-device-detail.html?id=${deviceId}`, '_blank');
            }
        },

        /**
         * Manage device
         */
        manageDevice: function(deviceId) {
            const device = window.EdgeDeviceRegistry.getDevice(deviceId);
            if (device) {
                // Switch to management section
                this.switchSection('configuration');
                // TODO: Load device-specific management interface
            }
        },

        /**
         * Deploy to device
         */
        deployToDevice: function(deviceId) {
            const device = window.EdgeDeviceRegistry.getDevice(deviceId);
            if (device) {
                // Switch to deployment section
                this.switchSection('deployment');
                // TODO: Load device-specific deployment interface
            }
        },

        /**
         * Load discovery section
         */
        loadDiscoverySection: function() {
            console.log('EdgeDeviceUI: Loading discovery section');
            // Render discovered devices
            this.renderDiscoveredDevices();
        },

        /**
         * Render discovered devices in the Discovery section
         */
        renderDiscoveredDevices: function() {
            const container = document.getElementById('discoveredDevicesGrid');
            if (!container) {
                console.error('EdgeDeviceUI: Discovered devices container not found');
                return;
            }

            const devices = window.EdgeDeviceRegistry.getAllDevices();

            if (devices.length === 0) {
                container.innerHTML = `
                    <div class="loading">
                        <div class="spinner"></div>
                        No devices discovered yet. Use the form above to add a device.
                    </div>
                `;
                return;
            }

            container.innerHTML = devices.map(device => this.generateDeviceCard(device, true)).join('');
        },

        /**
         * Load deployment section
         */
        loadDeploymentSection: function() {
            const section = document.getElementById('deployment');
            if (!section) {
                console.error('EdgeDeviceUI: Deployment section not found');
                return;
            }
            
            // Ensure section is visible before loading content
            section.classList.add('active');
            
            section.innerHTML = `
                <div class="section-header">
                    <h1 class="section-title">Inference Service Deployment</h1>
                    <p class="section-subtitle">Deploy and manage inference services on edge devices</p>
                </div>

                <!-- Deployed Services Section -->
                <div class="deployment-section">
                    <div class="deployment-header">
                        <h2 class="deployment-title">Deployed Services</h2>
                        <span class="deployment-count" id="deployedCount">0 services</span>
                    </div>
                    <div id="deployedServicesContainer" class="services-container">
                        <div class="loading">
                            <div class="spinner"></div>
                            Loading deployed services...
                        </div>
                    </div>
                </div>

                <!-- Available Services Section -->
                <div class="deployment-section">
                    <div class="deployment-header">
                        <h2 class="deployment-title">Available Services</h2>
                        <span class="deployment-count" id="availableCount">0 services</span>
                    </div>
                    <div id="availableServicesContainer" class="services-container">
                        <div class="loading">
                            <div class="spinner"></div>
                            Loading available services...
                        </div>
                    </div>
                </div>
            `;

            // Load and render services
            this.loadDeployedServices();
            this.loadAvailableServices();
        },

        /**
         * Load deployed services
         */
        loadDeployedServices: function() {
            const container = document.getElementById('deployedServicesContainer');
            const countElement = document.getElementById('deployedCount');
            
            // Get all devices and their deployed services
            const devices = window.EdgeDeviceRegistry.getAllDevices();
            const deployedServices = [];

            devices.forEach(device => {
                if (device.capabilities?.services && device.capabilities.services.length > 0) {
                    device.capabilities.services.forEach(service => {
                        deployedServices.push({
                            ...service,
                            deviceId: device.id,
                            deviceName: device.name,
                            deviceIp: device.ip
                        });
                    });
                }
            });

            // Update count
            if (countElement) {
                countElement.textContent = `${deployedServices.length} service${deployedServices.length !== 1 ? 's' : ''}`;
            }

            // Render services
            this.renderDeployedServices(deployedServices);
        },

        /**
         * Render deployed services
         */
        renderDeployedServices: function(services) {
            const container = document.getElementById('deployedServicesContainer');
            
            if (!container) return;

            if (services.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📦</div>
                        <h3>No services deployed</h3>
                        <p>Deploy services from the Available Services section below</p>
                    </div>
                `;
                return;
            }

            let html = '<div class="services-grid">';
            services.forEach(service => {
                const statusClass = this.getServiceStatusClass(service.status || 'running');
                const statusText = (service.status || 'running').charAt(0).toUpperCase() + (service.status || 'running').slice(1);
                const serviceStatus = service.status || 'running';
                const serviceId = this.escapeHtml(service.id || service.name);
                const deviceId = this.escapeHtml(service.deviceId);
                const escapedStatus = this.escapeHtml(serviceStatus);
                
                html += `
                    <div class="service-card">
                        <div class="service-header">
                            <div class="service-info">
                                <h3 class="service-name">${this.escapeHtml(service.name || 'Unknown Service')}</h3>
                                <p class="service-description">${this.escapeHtml(service.description || 'No description available')}</p>
                            </div>
                            <span class="service-status ${statusClass}">${statusText}</span>
                        </div>
                        <div class="service-details">
                            <div class="detail-row">
                                <span class="detail-label">Device:</span>
                                <span class="detail-value">${this.escapeHtml(service.deviceName || service.deviceIp || 'Unknown')}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Version:</span>
                                <span class="detail-value">${this.escapeHtml(service.version || 'N/A')}</span>
                            </div>
                            ${service.endpoint ? `
                            <div class="detail-row">
                                <span class="detail-label">Endpoint:</span>
                                <span class="detail-value"><code>${this.escapeHtml(service.endpoint)}</code></span>
                            </div>
                            ` : ''}
                        </div>
                        <div class="service-actions">
                            <button class="btn btn-primary" onclick="EdgeDeviceUI.testService('${serviceId}', '${deviceId}')">
                                <span class="nav-icon">🧪</span>
                                Test Service
                            </button>
                            <button class="btn btn-secondary" onclick="EdgeDeviceUI.toggleService('${serviceId}', '${deviceId}', '${escapedStatus}')">
                                <span class="nav-icon">${service.status === 'stopped' ? '▶️' : '⏸️'}</span>
                                ${service.status === 'stopped' ? 'Start' : 'Stop'}
                            </button>
                            <button class="btn btn-warning" onclick="EdgeDeviceUI.removeService('${serviceId}', '${deviceId}')">
                                <span class="nav-icon">🗑️</span>
                                Remove
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        },

        /**
         * Load available services
         */
        loadAvailableServices: function() {
            const container = document.getElementById('availableServicesContainer');
            const countElement = document.getElementById('availableCount');
            
            // Available inference services - based on actual platform services
            const availableServices = [
                {
                    id: 'forecasting-api',
                    name: 'Solar Energy Forecasting',
                    description: 'Predict solar energy generation at device, site, and customer levels using ML models. Provides short-term and long-term forecasts for grid planning and optimization.',
                    version: '2.0.0',
                    category: 'Energy Forecasting'
                },
                {
                    id: 'energy-analyst-rag',
                    name: 'Energy Analyst RAG',
                    description: 'Retrieval-Augmented Generation service for querying energy policy documents and regulations. Uses LLM to provide answers with citations from uploaded documents.',
                    version: '1.0.0',
                    category: 'Document Analysis'
                },
                {
                    id: 'fault-detection',
                    name: 'Fault Detection',
                    description: 'ML-backed fault detection service that analyzes time-series data to identify equipment malfunctions and performance anomalies. Part of OODA workflow (Observe phase).',
                    version: '1.0.0',
                    category: 'Predictive Maintenance'
                },
                {
                    id: 'ai-diagnostics',
                    name: 'AI Diagnostics',
                    description: 'AI-powered diagnostic service that analyzes detected faults to determine root causes and recommend actions. Part of OODA workflow (Orient phase).',
                    version: '1.0.0',
                    category: 'Predictive Maintenance'
                },
                {
                    id: 'interpolation-service',
                    name: 'Data Interpolation',
                    description: 'Interpolate missing data points in time-series datasets using ML models. Fills gaps in sensor data for accurate analysis and forecasting.',
                    version: '1.0.0',
                    category: 'Data Processing'
                }
            ];

            // Update count
            if (countElement) {
                countElement.textContent = `${availableServices.length} service${availableServices.length !== 1 ? 's' : ''}`;
            }

            // Render services
            this.renderAvailableServices(availableServices);
        },

        /**
         * Render available services
         */
        renderAvailableServices: function(services) {
            const container = document.getElementById('availableServicesContainer');
            
            if (!container) return;

            if (services.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📚</div>
                        <h3>No services available</h3>
                        <p>Check back later for new inference services</p>
                    </div>
                `;
                return;
            }

            let html = '<div class="services-grid">';
            services.forEach(service => {
                html += `
                    <div class="service-card">
                        <div class="service-header">
                            <div class="service-info">
                                <h3 class="service-name">${this.escapeHtml(service.name)}</h3>
                                <p class="service-description">${this.escapeHtml(service.description)}</p>
                            </div>
                            <span class="service-badge">${this.escapeHtml(service.category || 'General')}</span>
                        </div>
                        <div class="service-details">
                            <div class="detail-row">
                                <span class="detail-label">Version:</span>
                                <span class="detail-value">${this.escapeHtml(service.version)}</span>
                            </div>
                        </div>
                        <div class="service-actions">
                            <button class="btn btn-success" onclick="EdgeDeviceUI.deployService('${service.id}')">
                                <span class="nav-icon">🚀</span>
                                Deploy Service
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        },

        /**
         * Get service status CSS class
         */
        getServiceStatusClass: function(status) {
            switch (status.toLowerCase()) {
                case 'running': return 'status-running';
                case 'stopped': return 'status-stopped';
                case 'deploying': return 'status-deploying';
                case 'error': return 'status-error';
                default: return 'status-unknown';
            }
        },

        /**
         * Deploy a service
         */
        deployService: function(serviceId) {
            const devices = window.EdgeDeviceRegistry.getAllDevices();
            
            if (devices.length === 0) {
                alert('No devices available. Please discover a device first.');
                return;
            }

            // Create device selector
            let deviceOptions = devices.map(device => 
                `<option value="${device.id}">${this.escapeHtml(device.name)} (${device.ip})</option>`
            ).join('');

            const deviceId = prompt(`Select a device to deploy to:\n\n${devices.map((d, i) => `${i + 1}. ${d.name} (${d.ip})`).join('\n')}\n\nEnter device number (1-${devices.length}):`);
            
            if (!deviceId) return;

            const selectedIndex = parseInt(deviceId) - 1;
            if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= devices.length) {
                alert('Invalid device selection.');
                return;
            }

            const selectedDevice = devices[selectedIndex];
            
            if (confirm(`Deploy service to ${selectedDevice.name} (${selectedDevice.ip})?`)) {
                // TODO: Call API to deploy service
                console.log(`Deploying service ${serviceId} to device ${selectedDevice.id}`);
                
                // Simulate deployment
                alert(`Deploying service to ${selectedDevice.name}...\n\nThis feature will connect to the deployment API in production.`);
                
                // Refresh deployed services after a delay
                setTimeout(() => {
                    this.loadDeployedServices();
                }, 1000);
            }
        },

        /**
         * Test a deployed service
         */
        testService: function(serviceId, deviceId) {
            const device = window.EdgeDeviceRegistry.getDevice(deviceId);
            if (!device) {
                alert('Device not found.');
                return;
            }

            // TODO: Call API to test service
            console.log(`Testing service ${serviceId} on device ${deviceId}`);
            
            // Open test interface
            const testWindow = window.open('', '_blank', 'width=800,height=600');
            testWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Test Service - ${serviceId}</title>
                    <style>
                        body { font-family: 'DM Sans', sans-serif; padding: 20px; }
                        .test-container { max-width: 600px; margin: 0 auto; }
                        h1 { color: #333; }
                        .test-form { margin: 20px 0; }
                        textarea { width: 100%; min-height: 200px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
                        button { padding: 10px 20px; background: #455BF1; color: white; border: none; border-radius: 4px; cursor: pointer; }
                        .result { margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 4px; }
                    </style>
                </head>
                <body>
                    <div class="test-container">
                        <h1>Test Service: ${this.escapeHtml(serviceId)}</h1>
                        <p>Device: ${this.escapeHtml(device.name)} (${this.escapeHtml(device.ip)})</p>
                        <div class="test-form">
                            <h3>Input Data</h3>
                            <textarea id="testInput" placeholder='Enter test data (JSON format)'>{"test": "data"}</textarea>
                            <br><br>
                            <button onclick="runTest()">Run Test</button>
                        </div>
                        <div id="testResult" class="result" style="display: none;">
                            <h3>Result</h3>
                            <pre id="resultContent"></pre>
                        </div>
                    </div>
                    <script>
                        function runTest() {
                            const input = document.getElementById('testInput').value;
                            const resultDiv = document.getElementById('testResult');
                            const resultContent = document.getElementById('resultContent');
                            
                            resultDiv.style.display = 'block';
                            resultContent.textContent = 'Testing service...\\n\\nThis feature will connect to the service API in production.\\n\\nInput: ' + input;
                        }
                    </script>
                </body>
                </html>
            `);
        },

        /**
         * Toggle service (start/stop)
         */
        toggleService: function(serviceId, deviceId, currentStatus) {
            const device = window.EdgeDeviceRegistry.getDevice(deviceId);
            if (!device) {
                alert('Device not found.');
                return;
            }

            const action = currentStatus === 'stopped' ? 'start' : 'stop';
            
            if (confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} service on ${device.name}?`)) {
                // TODO: Call API to toggle service
                console.log(`${action}ing service ${serviceId} on device ${deviceId}`);
                
                alert(`${action.charAt(0).toUpperCase() + action.slice(1)}ing service...\n\nThis feature will connect to the service API in production.`);
                
                // Refresh deployed services after a delay
                setTimeout(() => {
                    this.loadDeployedServices();
                }, 1000);
            }
        },

        /**
         * Remove a service
         */
        removeService: function(serviceId, deviceId) {
            const device = window.EdgeDeviceRegistry.getDevice(deviceId);
            if (!device) {
                alert('Device not found.');
                return;
            }

            if (confirm(`Remove service from ${device.name}?\n\nThis action cannot be undone.`)) {
                // TODO: Call API to remove service
                console.log(`Removing service ${serviceId} from device ${deviceId}`);
                
                alert('Removing service...\n\nThis feature will connect to the service API in production.');
                
                // Refresh deployed services after a delay
                setTimeout(() => {
                    this.loadDeployedServices();
                }, 1000);
            }
        },

        /**
         * Escape HTML
         */
        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        /**
         * Load monitoring section
         */
        loadMonitoringSection: function() {
            const section = document.getElementById('monitoring');
            if (!section) {
                console.error('EdgeDeviceUI: Monitoring section not found');
                return;
            }
            
            section.innerHTML = `
                <div class="section-header">
                    <h1 class="section-title">Device Monitoring</h1>
                    <p class="section-subtitle">Real-time monitoring of device health and performance</p>
                </div>

                <!-- System Metrics Charts -->
                <div class="monitoring-grid" id="systemMetricsGrid">
                    <div class="chart-card">
                        <h3 class="chart-title">CPU Usage</h3>
                        <div class="chart-container">
                            <canvas id="cpuUsageChart"></canvas>
                        </div>
                    </div>
                    <div class="chart-card">
                        <h3 class="chart-title">RAM Usage</h3>
                        <div class="chart-container">
                            <canvas id="ramUsageChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Disk Usage Section -->
                <div class="disk-usage-section" id="diskUsageSection">
                    <h3 class="disk-usage-title">Disk Space Usage</h3>
                    <div id="diskUsageContainer">
                        <div class="loading">
                            <div class="spinner"></div>
                            Loading disk usage...
                        </div>
                    </div>
                </div>

                <!-- Service Metrics Section -->
                <div class="deployment-section">
                    <div class="deployment-header">
                        <h2 class="deployment-title">Deployed Service Metrics</h2>
                        <span class="deployment-count" id="serviceMetricsCount">0 services</span>
                    </div>
                    <div id="serviceMetricsContainer" class="service-metrics-grid">
                        <div class="loading">
                            <div class="spinner"></div>
                            Loading service metrics...
                        </div>
                    </div>
                </div>
            `;

            // Load and render monitoring data
            this.renderSystemMetrics();
            this.renderDiskUsage();
            this.renderServiceMetrics();
        },

        /**
         * Render system metrics (CPU and RAM charts)
         */
        renderSystemMetrics: function() {
            // Check if Chart.js is available
            if (typeof Chart === 'undefined') {
                console.error('Chart.js not available');
                return;
            }

            // Generate mock time-series data for CPU and RAM
            const now = new Date();
            const labels = [];
            const cpuData = [];
            const ramData = [];

            // Generate last 24 hours of data (hourly)
            for (let i = 23; i >= 0; i--) {
                const time = new Date(now.getTime() - i * 60 * 60 * 1000);
                labels.push(time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
                
                // Mock CPU usage (30-80%)
                cpuData.push(Math.random() * 50 + 30);
                
                // Mock RAM usage (40-75%)
                ramData.push(Math.random() * 35 + 40);
            }

            // CPU Usage Chart
            const cpuCtx = document.getElementById('cpuUsageChart');
            if (cpuCtx) {
                new Chart(cpuCtx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'CPU Usage (%)',
                            data: cpuData,
                            borderColor: 'rgb(69, 91, 241)',
                            backgroundColor: 'rgba(69, 91, 241, 0.1)',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top'
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                    callback: function(value) {
                                        return value + '%';
                                    }
                                }
                            }
                        }
                    }
                });
            }

            // RAM Usage Chart
            const ramCtx = document.getElementById('ramUsageChart');
            if (ramCtx) {
                new Chart(ramCtx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'RAM Usage (%)',
                            data: ramData,
                            borderColor: 'rgb(34, 197, 94)',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top'
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                    callback: function(value) {
                                        return value + '%';
                                    }
                                }
                            }
                        }
                    }
                });
            }
        },

        /**
         * Render disk usage progress bars
         */
        renderDiskUsage: function() {
            const container = document.getElementById('diskUsageContainer');
            if (!container) return;

            // Mock disk usage data for major folders
            const diskData = [
                { path: '/home', used: 45.2, total: 100, unit: 'GB' },
                { path: '/etc', used: 2.1, total: 5, unit: 'GB' },
                { path: '/opt', used: 12.8, total: 50, unit: 'GB' },
                { path: '/var', used: 8.5, total: 20, unit: 'GB' },
                { path: '/usr', used: 15.3, total: 30, unit: 'GB' },
                { path: '/tmp', used: 1.2, total: 10, unit: 'GB' }
            ];

            let html = '';
            diskData.forEach(disk => {
                const percentage = (disk.used / disk.total) * 100;
                const free = disk.total - disk.used;
                const statusClass = percentage > 90 ? 'danger' : percentage > 75 ? 'warning' : '';
                
                html += `
                    <div class="disk-item">
                        <div class="disk-label">
                            <span class="disk-path">${this.escapeHtml(disk.path)}</span>
                            <span class="disk-stats">${this.escapeHtml(disk.used.toFixed(1))} ${disk.unit} / ${this.escapeHtml(disk.total)} ${disk.unit} (${this.escapeHtml(free.toFixed(1))} ${disk.unit} free)</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar-fill ${statusClass}" style="width: ${percentage}%">
                                ${percentage >= 5 ? Math.round(percentage) + '%' : ''}
                            </div>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        },

        /**
         * Render service metrics cards
         */
        renderServiceMetrics: function() {
            const container = document.getElementById('serviceMetricsContainer');
            const countElement = document.getElementById('serviceMetricsCount');
            
            if (!container) return;

            // Get deployed services and add mock metrics
            const devices = window.EdgeDeviceRegistry.getAllDevices();
            const servicesWithMetrics = [];

            devices.forEach(device => {
                if (device.capabilities?.services && device.capabilities.services.length > 0) {
                    device.capabilities.services.forEach(service => {
                        // Add mock metrics for each service
                        servicesWithMetrics.push({
                            ...service,
                            deviceId: device.id,
                            deviceName: device.name,
                            deviceIp: device.ip,
                            lastRun: {
                                timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                                duration: Math.floor(Math.random() * 300 + 60), // 60-360 seconds
                                r2: (Math.random() * 0.2 + 0.8).toFixed(4), // 0.8-1.0
                                rmse: (Math.random() * 50 + 10).toFixed(2), // 10-60
                                smape: (Math.random() * 5 + 1).toFixed(2), // 1-6%
                                responseSpeed: (Math.random() * 200 + 50).toFixed(0) // 50-250ms
                            },
                            modelArtifacts: `/opt/models/${service.id || service.name}/v${service.version || '1.0.0'}/artifacts`,
                            runHistory: this.generateMockRunHistory(service.id || service.name)
                        });
                    });
                }
            });

            // Update count
            if (countElement) {
                countElement.textContent = `${servicesWithMetrics.length} service${servicesWithMetrics.length !== 1 ? 's' : ''}`;
            }

            if (servicesWithMetrics.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📊</div>
                        <h3>No services deployed</h3>
                        <p>Deploy services to see metrics and performance data</p>
                    </div>
                `;
                return;
            }

            let html = '';
            servicesWithMetrics.forEach(service => {
                const lastRun = service.lastRun;
                const runDate = new Date(lastRun.timestamp);
                
                html += `
                    <div class="service-metric-card">
                        <div class="service-metric-header">
                            <h3 class="service-metric-name">${this.escapeHtml(service.name || 'Unknown Service')}</h3>
                            <span class="service-status status-running">Running</span>
                        </div>
                        <div class="metrics-row">
                            <div class="metric-item">
                                <div class="metric-label">R² Score</div>
                                <div class="metric-value r2">${this.escapeHtml(lastRun.r2)}</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-label">RMSE</div>
                                <div class="metric-value rmse">${this.escapeHtml(lastRun.rmse)}</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-label">SMAPE</div>
                                <div class="metric-value smape">${this.escapeHtml(lastRun.smape)}%</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-label">Response Speed</div>
                                <div class="metric-value response-speed">${this.escapeHtml(lastRun.responseSpeed)}ms</div>
                            </div>
                        </div>
                        <div class="model-artifacts">
                            <div class="model-artifacts-label">Model Artifacts Location</div>
                            <div class="model-artifacts-path">${this.escapeHtml(service.modelArtifacts)}</div>
                        </div>
                        <div class="service-metric-actions">
                            <button class="btn btn-primary" onclick="EdgeDeviceUI.exportServiceReport('${service.id || service.name}', '${service.deviceId}')">
                                <span class="nav-icon">📄</span>
                                Export Report
                            </button>
                            <button class="btn btn-secondary" onclick="EdgeDeviceUI.openServiceHistoryModal('${service.id || service.name}', '${service.deviceId}')">
                                <span class="nav-icon">📋</span>
                                View History
                            </button>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        },

        /**
         * Generate mock run history for a service
         */
        generateMockRunHistory: function(serviceId) {
            const history = [];
            const now = Date.now();
            
            // Generate 10-15 historical runs
            const runCount = Math.floor(Math.random() * 6 + 10);
            
            for (let i = 0; i < runCount; i++) {
                const timestamp = new Date(now - i * 2 * 60 * 60 * 1000 - Math.random() * 60 * 60 * 1000);
                history.push({
                    timestamp: timestamp.toISOString(),
                    duration: Math.floor(Math.random() * 300 + 60),
                    r2: (Math.random() * 0.2 + 0.8).toFixed(4),
                    rmse: (Math.random() * 50 + 10).toFixed(2),
                    smape: (Math.random() * 5 + 1).toFixed(2),
                    responseSpeed: (Math.random() * 200 + 50).toFixed(0),
                    status: Math.random() > 0.1 ? 'success' : 'failed'
                });
            }
            
            return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        },

        /**
         * Export service report
         */
        exportServiceReport: function(serviceId, deviceId) {
            const device = window.EdgeDeviceRegistry.getDevice(deviceId);
            if (!device) {
                alert('Device not found.');
                return;
            }

            // TODO: Call API to generate and download report
            console.log(`Exporting report for service ${serviceId} on device ${deviceId}`);
            
            // Simulate report generation
            alert(`Generating report for ${serviceId} on ${device.name}...\n\nThis feature will connect to the reporting API in production.`);
        },

        /**
         * Open service history modal
         */
        openServiceHistoryModal: function(serviceId, deviceId) {
            const device = window.EdgeDeviceRegistry.getDevice(deviceId);
            if (!device) {
                alert('Device not found.');
                return;
            }

            // Get service and its run history
            const devices = window.EdgeDeviceRegistry.getAllDevices();
            let service = null;
            let runHistory = [];

            devices.forEach(d => {
                if (d.capabilities?.services) {
                    const found = d.capabilities.services.find(s => (s.id || s.name) === serviceId);
                    if (found && d.id === deviceId) {
                        service = found;
                        runHistory = this.generateMockRunHistory(serviceId);
                    }
                }
            });

            if (!service) {
                alert('Service not found.');
                return;
            }

            // Update modal title
            const modalTitle = document.getElementById('serviceHistoryModalTitle');
            if (modalTitle) {
                modalTitle.textContent = `Run History: ${this.escapeHtml(service.name || serviceId)}`;
            }

            // Render history table
            const content = document.getElementById('serviceHistoryContent');
            if (content) {
                if (runHistory.length === 0) {
                    content.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">📋</div>
                            <h3>No run history</h3>
                            <p>This service has not been executed yet.</p>
                        </div>
                    `;
                } else {
                    let tableHtml = `
                        <table class="history-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Duration</th>
                                    <th>R²</th>
                                    <th>RMSE</th>
                                    <th>SMAPE</th>
                                    <th>Response Speed</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    runHistory.forEach(run => {
                        const runDate = new Date(run.timestamp);
                        const formattedDate = runDate.toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        const durationMinutes = Math.floor(run.duration / 60);
                        const durationSeconds = run.duration % 60;
                        const statusClass = run.status === 'success' ? 'status-running' : 'status-error';
                        const statusText = run.status === 'success' ? 'Success' : 'Failed';

                        tableHtml += `
                            <tr>
                                <td>${this.escapeHtml(formattedDate)}</td>
                                <td>
                                    <span class="history-duration">
                                        ${durationMinutes}m ${durationSeconds}s
                                    </span>
                                </td>
                                <td>
                                    <span class="history-metric r2">${this.escapeHtml(run.r2)}</span>
                                </td>
                                <td>
                                    <span class="history-metric rmse">${this.escapeHtml(run.rmse)}</span>
                                </td>
                                <td>
                                    <span class="history-metric smape">${this.escapeHtml(run.smape)}%</span>
                                </td>
                                <td>
                                    <span class="history-metric response-speed">${this.escapeHtml(run.responseSpeed)}ms</span>
                                </td>
                                <td>
                                    <span class="service-status ${statusClass}">${statusText}</span>
                                </td>
                                <td>
                                    <button class="btn btn-secondary" onclick="EdgeDeviceUI.viewServiceLogs('${serviceId}', '${deviceId}', '${run.timestamp}')" style="padding: 6px 12px; font-size: 12px;">
                                        <span class="nav-icon">📝</span>
                                        Logs
                                    </button>
                                </td>
                            </tr>
                        `;
                    });

                    tableHtml += `
                            </tbody>
                        </table>
                    `;

                    content.innerHTML = tableHtml;
                }
            }

            // Show modal
            const modal = document.getElementById('serviceHistoryModal');
            if (modal) {
                modal.classList.add('active');
            }
        },

        /**
         * Close service history modal
         */
        closeServiceHistoryModal: function() {
            const modal = document.getElementById('serviceHistoryModal');
            if (modal) {
                modal.classList.remove('active');
            }
        },

        /**
         * View service logs for a specific run
         */
        viewServiceLogs: function(serviceId, deviceId, runTimestamp) {
            const device = window.EdgeDeviceRegistry.getDevice(deviceId);
            if (!device) {
                alert('Device not found.');
                return;
            }

            // TODO: Call API to fetch logs
            console.log(`Viewing logs for service ${serviceId} on device ${deviceId}, run at ${runTimestamp}`);
            
            // Open logs in new window/tab
            const logsWindow = window.open('', '_blank', 'width=1000,height=700');
            logsWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Service Logs - ${serviceId}</title>
                    <style>
                        body { font-family: 'Courier New', monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
                        .log-container { max-width: 100%; }
                        h1 { color: #fff; margin-bottom: 20px; }
                        .log-entry { padding: 8px; border-bottom: 1px solid #333; font-size: 13px; }
                        .log-entry.error { color: #f48771; }
                        .log-entry.warning { color: #dcdcaa; }
                        .log-entry.info { color: #4ec9b0; }
                        .log-timestamp { color: #808080; margin-right: 10px; }
                    </style>
                </head>
                <body>
                    <div class="log-container">
                        <h1>Service Logs: ${this.escapeHtml(serviceId)}</h1>
                        <p>Device: ${this.escapeHtml(device.name)} (${this.escapeHtml(device.ip)})</p>
                        <p>Run Timestamp: ${this.escapeHtml(new Date(runTimestamp).toLocaleString())}</p>
                        <hr style="border-color: #333; margin: 20px 0;">
                        <div id="logContent">
                            <div class="log-entry info">
                                <span class="log-timestamp">[2024-11-30 16:30:00]</span>
                                Service started successfully
                            </div>
                            <div class="log-entry info">
                                <span class="log-timestamp">[2024-11-30 16:30:05]</span>
                                Loading model artifacts from /opt/models/${this.escapeHtml(serviceId)}/v1.0.0/artifacts
                            </div>
                            <div class="log-entry info">
                                <span class="log-timestamp">[2024-11-30 16:30:10]</span>
                                Model loaded successfully. Starting inference...
                            </div>
                            <div class="log-entry info">
                                <span class="log-timestamp">[2024-11-30 16:32:45]</span>
                                Inference completed. Processing results...
                            </div>
                            <div class="log-entry info">
                                <span class="log-timestamp">[2024-11-30 16:33:00]</span>
                                Metrics calculated: R²=0.9234, RMSE=23.45, SMAPE=2.34%
                            </div>
                            <div class="log-entry info">
                                <span class="log-timestamp">[2024-11-30 16:33:00]</span>
                                Service completed successfully
                            </div>
                        </div>
                    </div>
                    <script>
                        // Auto-scroll to bottom
                        window.onload = function() {
                            document.getElementById('logContent').scrollTop = document.getElementById('logContent').scrollHeight;
                        };
                    </script>
                </body>
                </html>
            `);
        },

        /**
         * Get available data sources
         */
        getAvailableDataSources: function() {
            return [
                {
                    id: 'cpu_metrics',
                    name: 'CPU Metrics',
                    description: 'CPU usage, load average, and processor statistics'
                },
                {
                    id: 'ram_metrics',
                    name: 'RAM Metrics',
                    description: 'Memory usage, available memory, and swap statistics'
                },
                {
                    id: 'disk_io',
                    name: 'Disk I/O',
                    description: 'Disk read/write operations, I/O wait times, and throughput'
                },
                {
                    id: 'network_stats',
                    name: 'Network Statistics',
                    description: 'Network interface statistics, bandwidth usage, and packet counts'
                },
                {
                    id: 'temperature_sensors',
                    name: 'Temperature Sensors',
                    description: 'CPU temperature, system temperature, and sensor readings'
                },
                {
                    id: 'energy_consumption',
                    name: 'Energy Consumption',
                    description: 'Power usage, energy metrics, and consumption patterns'
                },
                {
                    id: 'system_logs',
                    name: 'System Logs',
                    description: 'System event logs, error logs, and application logs'
                },
                {
                    id: 'process_metrics',
                    name: 'Process Metrics',
                    description: 'Running processes, resource usage per process, and process statistics'
                },
                {
                    id: 'docker_stats',
                    name: 'Docker Statistics',
                    description: 'Container statistics, resource usage, and container health'
                },
                {
                    id: 'service_health',
                    name: 'Service Health',
                    description: 'Service status, uptime, and health check results'
                }
            ];
        },

        /**
         * Get configured data sources for a device
         */
        getDeviceDataSources: function(deviceId) {
            const device = window.EdgeDeviceRegistry.getDevice(deviceId);
            if (!device) return null;
            
            // Check if device has dataSources property
            if (device.dataSources && Array.isArray(device.dataSources)) {
                return device.dataSources;
            }
            
            // Return empty array if not configured
            return [];
        },

        /**
         * Open data source configuration modal
         */
        openDataSourceConfigModal: function(deviceId) {
            const device = window.EdgeDeviceRegistry.getDevice(deviceId);
            if (!device) {
                alert('Device not found.');
                return;
            }

            // Update modal title
            const modalTitle = document.getElementById('dataSourceConfigModalTitle');
            if (modalTitle) {
                modalTitle.textContent = `Configure Data Sources: ${this.escapeHtml(device.name)}`;
            }

            // Get available data sources
            const availableSources = this.getAvailableDataSources();
            const configuredSources = this.getDeviceDataSources(deviceId) || [];

            // Render data source selection
            const content = document.getElementById('dataSourceConfigContent');
            if (content) {
                let html = `
                    <p style="margin-bottom: 20px; color: var(--text-light);">
                        Select the data sources you want to extract from this device. The system will collect and process data from the selected sources.
                    </p>
                    <div class="data-source-list">
                `;

                availableSources.forEach(source => {
                    const isChecked = configuredSources.includes(source.id);
                    html += `
                        <div class="data-source-item">
                            <input 
                                type="checkbox" 
                                id="ds_${source.id}" 
                                value="${source.id}"
                                ${isChecked ? 'checked' : ''}
                            >
                            <div class="data-source-info">
                                <div class="data-source-name">${this.escapeHtml(source.name)}</div>
                                <div class="data-source-description">${this.escapeHtml(source.description)}</div>
                            </div>
                        </div>
                    `;
                });

                html += `
                    </div>
                    <div class="data-source-actions">
                        <button class="btn btn-secondary" onclick="EdgeDeviceUI.closeDataSourceConfigModal()">
                            Cancel
                        </button>
                        <button class="btn btn-primary" onclick="EdgeDeviceUI.saveDataSourceConfig('${deviceId}')">
                            Save Configuration
                        </button>
                    </div>
                `;

                content.innerHTML = html;
            }

            // Show modal
            const modal = document.getElementById('dataSourceConfigModal');
            if (modal) {
                modal.classList.add('active');
            }
        },

        /**
         * Close data source configuration modal
         */
        closeDataSourceConfigModal: function() {
            const modal = document.getElementById('dataSourceConfigModal');
            if (modal) {
                modal.classList.remove('active');
            }
        },

        /**
         * Save data source configuration
         */
        saveDataSourceConfig: function(deviceId) {
            const device = window.EdgeDeviceRegistry.getDevice(deviceId);
            if (!device) {
                alert('Device not found.');
                return;
            }

            // Get selected data sources
            const checkboxes = document.querySelectorAll('#dataSourceConfigContent input[type="checkbox"]:checked');
            const selectedSources = Array.from(checkboxes).map(cb => cb.value);

            // Update device data sources
            if (!device.dataSources) {
                device.dataSources = [];
            }
            device.dataSources = selectedSources;

            // Save to registry
            window.EdgeDeviceRegistry.updateDevice(deviceId, device);

            // Close modal
            this.closeDataSourceConfigModal();

            // Add activity
            this.addActivity(
                'configuration',
                'Data Sources Configured',
                `${selectedSources.length} data source(s) configured for ${device.name}`,
                deviceId,
                device.name
            );

            // Refresh discovered devices display
            this.renderDiscoveredDevices();

            // Refresh dashboard if it's active
            if (this.currentSection === 'dashboard') {
                this.renderActivityFeed();
            }

            // Show success message
            alert(`Data source configuration saved for ${device.name}. ${selectedSources.length} data source(s) selected.`);
        },

        /**
         * Load configuration section
         */
        loadConfigurationSection: function() {
            const section = document.getElementById('configuration');
            if (!section) {
                console.error('EdgeDeviceUI: Configuration section not found');
                return;
            }

            // Load saved configuration
            const config = this.loadConfiguration();

            section.innerHTML = `
                <div class="section-header">
                    <h1 class="section-title">Configuration</h1>
                    <p class="section-subtitle">Configure connection settings to the mothership platform</p>
                </div>

                <div class="configuration-section">
                    <div class="configuration-form">
                        <div class="form-group">
                            <label class="form-label">Mothership API Endpoint</label>
                            <input 
                                type="text" 
                                class="form-input" 
                                id="configApiEndpoint" 
                                placeholder="https://api.platform.example.com"
                                value="${this.escapeHtml(config.apiEndpoint || '')}"
                            >
                            <small class="form-help">Base URL for the mothership platform API</small>
                        </div>

                        <div class="form-group">
                            <label class="form-label">API Key</label>
                            <input 
                                type="password" 
                                class="form-input" 
                                id="configApiKey" 
                                placeholder="Enter your API key"
                                value="${this.escapeHtml(config.apiKey || '')}"
                            >
                            <small class="form-help">API key for authenticating with the platform (sent as X-API-Key header)</small>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Connection Timeout (seconds)</label>
                            <input 
                                type="number" 
                                class="form-input" 
                                id="configTimeout" 
                                placeholder="30"
                                min="5"
                                max="300"
                                value="${config.timeout || 30}"
                            >
                            <small class="form-help">Timeout for API requests in seconds (5-300)</small>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Retry Attempts</label>
                            <input 
                                type="number" 
                                class="form-input" 
                                id="configRetryAttempts" 
                                placeholder="3"
                                min="0"
                                max="10"
                                value="${config.retryAttempts || 3}"
                            >
                            <small class="form-help">Number of retry attempts for failed requests (0-10)</small>
                        </div>

                        <div class="form-group">
                            <label class="form-label">
                                <input 
                                    type="checkbox" 
                                    id="configEnableSSL" 
                                    ${config.enableSSL !== false ? 'checked' : ''}
                                >
                                Enable SSL/TLS Verification
                            </label>
                            <small class="form-help">Verify SSL certificates when connecting to the platform</small>
                        </div>

                        <div class="form-group">
                            <label class="form-label">
                                <input 
                                    type="checkbox" 
                                    id="configAutoReconnect" 
                                    ${config.autoReconnect !== false ? 'checked' : ''}
                                >
                                Auto-Reconnect on Connection Loss
                            </label>
                            <small class="form-help">Automatically attempt to reconnect if connection is lost</small>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Sync Interval (minutes)</label>
                            <input 
                                type="number" 
                                class="form-input" 
                                id="configSyncInterval" 
                                placeholder="5"
                                min="1"
                                max="60"
                                value="${config.syncInterval || 5}"
                            >
                            <small class="form-help">How often to sync with the platform (1-60 minutes)</small>
                        </div>

                        <div class="configuration-actions">
                            <button class="btn btn-primary" onclick="EdgeDeviceUI.saveConfiguration()">
                                <span class="nav-icon">💾</span>
                                Save Configuration
                            </button>
                            <button class="btn btn-secondary" onclick="EdgeDeviceUI.testConnection()">
                                <span class="nav-icon">🔌</span>
                                Test Connection
                            </button>
                            <button class="btn btn-secondary" onclick="EdgeDeviceUI.resetConfiguration()">
                                <span class="nav-icon">🔄</span>
                                Reset to Defaults
                            </button>
                        </div>

                        <div id="configStatus" class="config-status" style="display: none;"></div>
                    </div>
                </div>
            `;
        },

        /**
         * Load saved configuration from localStorage
         */
        loadConfiguration: function() {
            try {
                const saved = localStorage.getItem('edgeDeviceConfig');
                if (saved) {
                    return JSON.parse(saved);
                }
            } catch (error) {
                console.error('EdgeDeviceUI: Error loading configuration:', error);
            }
            return this.getDefaultConfiguration();
        },

        /**
         * Get default configuration
         */
        getDefaultConfiguration: function() {
            return {
                apiEndpoint: '',
                apiKey: '',
                timeout: 30,
                retryAttempts: 3,
                enableSSL: true,
                autoReconnect: true,
                syncInterval: 5
            };
        },

        /**
         * Save configuration to localStorage
         */
        saveConfiguration: function() {
            const config = {
                apiEndpoint: document.getElementById('configApiEndpoint').value.trim(),
                apiKey: document.getElementById('configApiKey').value.trim(),
                timeout: parseInt(document.getElementById('configTimeout').value) || 30,
                retryAttempts: parseInt(document.getElementById('configRetryAttempts').value) || 3,
                enableSSL: document.getElementById('configEnableSSL').checked,
                autoReconnect: document.getElementById('configAutoReconnect').checked,
                syncInterval: parseInt(document.getElementById('configSyncInterval').value) || 5
            };

            // Validate required fields
            if (!config.apiEndpoint) {
                this.showConfigStatus('error', 'API Endpoint is required');
                return;
            }

            try {
                localStorage.setItem('edgeDeviceConfig', JSON.stringify(config));
                this.showConfigStatus('success', 'Configuration saved successfully');

                // Update EdgeDeviceRegistry API base URL if endpoint changed
                if (window.EdgeDeviceRegistry && config.apiEndpoint) {
                    window.EdgeDeviceRegistry.apiBaseUrl = config.apiEndpoint.replace(/\/$/, '') + '/api';
                }

                // Clear status after 3 seconds
                setTimeout(() => {
                    this.hideConfigStatus();
                }, 3000);
            } catch (error) {
                console.error('EdgeDeviceUI: Error saving configuration:', error);
                this.showConfigStatus('error', 'Failed to save configuration');
            }
        },

        /**
         * Test connection to mothership platform
         */
        testConnection: function() {
            const config = {
                apiEndpoint: document.getElementById('configApiEndpoint').value.trim(),
                apiKey: document.getElementById('configApiKey').value.trim()
            };

            if (!config.apiEndpoint) {
                this.showConfigStatus('error', 'Please enter API Endpoint before testing');
                return;
            }

            this.showConfigStatus('info', 'Testing connection...');

            // Simulate connection test (in production, this would make an actual API call)
            setTimeout(() => {
                // Mock test - in production, make actual API call
                const testEndpoint = config.apiEndpoint.replace(/\/$/, '') + '/health';
                
                fetch(testEndpoint, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${config.apiKey || ''}`,
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => {
                    if (response.ok) {
                        this.showConfigStatus('success', 'Connection successful! Platform is reachable.');
                    } else {
                        this.showConfigStatus('error', `Connection failed: ${response.status} ${response.statusText}`);
                    }
                })
                .catch(error => {
                    console.error('EdgeDeviceUI: Connection test failed:', error);
                    this.showConfigStatus('error', `Connection failed: ${error.message}. Please check your settings.`);
                });
            }, 500);
        },

        /**
         * Reset configuration to defaults
         */
        resetConfiguration: function() {
            if (confirm('Are you sure you want to reset all configuration to defaults? This will clear your saved settings.')) {
                localStorage.removeItem('edgeDeviceConfig');
                this.loadConfigurationSection();
                this.showConfigStatus('info', 'Configuration reset to defaults');
                setTimeout(() => {
                    this.hideConfigStatus();
                }, 3000);
            }
        },

        /**
         * Show configuration status message
         */
        showConfigStatus: function(type, message) {
            const statusEl = document.getElementById('configStatus');
            if (!statusEl) return;

            statusEl.className = `config-status config-status-${type}`;
            statusEl.textContent = message;
            statusEl.style.display = 'block';
        },

        /**
         * Hide configuration status message
         */
        hideConfigStatus: function() {
            const statusEl = document.getElementById('configStatus');
            if (statusEl) {
                statusEl.style.display = 'none';
            }
        },

        /**
         * Load performance section
         */
        /**
         * Load performance analytics section
         */
        loadPerformanceSection: function() {
            this.renderPerformanceAnalytics();
        },

        /**
         * Calculate aggregate metrics from run history
         */
        calculateAggregateMetrics: function(runHistory) {
            if (!runHistory || runHistory.length === 0) {
                return {
                    avgR2: '0.0000',
                    minR2: '0.0000',
                    maxR2: '0.0000',
                    avgRMSE: '0.00',
                    minRMSE: '0.00',
                    maxRMSE: '0.00',
                    avgSMAPE: '0.00',
                    minSMAPE: '0.00',
                    maxSMAPE: '0.00',
                    avgResponseSpeed: '0',
                    minResponseSpeed: '0',
                    maxResponseSpeed: '0',
                    totalRuns: 0
                };
            }

            const r2Values = runHistory.map(r => parseFloat(r.r2));
            const rmseValues = runHistory.map(r => parseFloat(r.rmse));
            const smapeValues = runHistory.map(r => parseFloat(r.smape));
            const responseSpeedValues = runHistory.map(r => parseFloat(r.responseSpeed));

            return {
                avgR2: (r2Values.reduce((a, b) => a + b, 0) / r2Values.length).toFixed(4),
                minR2: Math.min(...r2Values).toFixed(4),
                maxR2: Math.max(...r2Values).toFixed(4),
                avgRMSE: (rmseValues.reduce((a, b) => a + b, 0) / rmseValues.length).toFixed(2),
                minRMSE: Math.min(...rmseValues).toFixed(2),
                maxRMSE: Math.max(...rmseValues).toFixed(2),
                avgSMAPE: (smapeValues.reduce((a, b) => a + b, 0) / smapeValues.length).toFixed(2),
                minSMAPE: Math.min(...smapeValues).toFixed(2),
                maxSMAPE: Math.max(...smapeValues).toFixed(2),
                avgResponseSpeed: (responseSpeedValues.reduce((a, b) => a + b, 0) / responseSpeedValues.length).toFixed(0),
                minResponseSpeed: Math.min(...responseSpeedValues).toFixed(0),
                maxResponseSpeed: Math.max(...responseSpeedValues).toFixed(0),
                totalRuns: runHistory.length
            };
        },

        /**
         * Render performance analytics for all deployed services grouped by device
         */
        renderPerformanceAnalytics: function() {
            const container = document.getElementById('performanceAnalyticsContainer');
            if (!container) return;

            // Get all devices with their services
            const devices = window.EdgeDeviceRegistry.getAllDevices();
            const devicesWithServices = [];

            devices.forEach(device => {
                if (device.capabilities?.services && device.capabilities.services.length > 0) {
                    const servicesWithHistory = [];
                    
                    device.capabilities.services.forEach(service => {
                        const runHistory = this.generateMockRunHistory(service.id || service.name);
                        const lastFiveRuns = runHistory.slice(0, 5);
                        const aggregates = this.calculateAggregateMetrics(runHistory);

                        servicesWithHistory.push({
                            ...service,
                            deviceId: device.id,
                            deviceName: device.name,
                            deviceIp: device.ip,
                            lastFiveRuns: lastFiveRuns,
                            aggregates: aggregates
                        });
                    });

                    if (servicesWithHistory.length > 0) {
                        devicesWithServices.push({
                            device: device,
                            services: servicesWithHistory
                        });
                    }
                }
            });

            if (devicesWithServices.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📊</div>
                        <h3>No services deployed</h3>
                        <p>Deploy services to see performance analytics</p>
                    </div>
                `;
                return;
            }

            let html = '';
            devicesWithServices.forEach(({ device, services }) => {
                html += this.generateDevicePerformanceCard(device, services);
            });

            container.innerHTML = html;
        },

        /**
         * Generate device card with service table
         */
        generateDevicePerformanceCard: function(device, services) {
            let servicesTableRows = '';
            
            services.forEach((service, index) => {
                const aggregates = service.aggregates;
                const lastRun = service.lastFiveRuns && service.lastFiveRuns.length > 0 
                    ? service.lastFiveRuns[0] 
                    : null;
                
                servicesTableRows += `
                    <tr class="service-table-row">
                        <td class="service-name-cell">
                            <div class="service-name">${this.escapeHtml(service.name || 'Unknown Service')}</div>
                            <div class="service-version">v${this.escapeHtml(service.version || '1.0.0')}</div>
                        </td>
                        <td class="service-metrics-cell">
                            <div class="table-metrics">
                                <span class="table-metric">
                                    <span class="table-metric-label">R²:</span>
                                    <span class="table-metric-value r2">${lastRun ? this.escapeHtml(lastRun.r2) : 'N/A'}</span>
                                </span>
                                <span class="table-metric">
                                    <span class="table-metric-label">RMSE:</span>
                                    <span class="table-metric-value rmse">${lastRun ? this.escapeHtml(lastRun.rmse) : 'N/A'}</span>
                                </span>
                                <span class="table-metric">
                                    <span class="table-metric-label">SMAPE:</span>
                                    <span class="table-metric-value smape">${lastRun ? this.escapeHtml(lastRun.smape) + '%' : 'N/A'}</span>
                                </span>
                                <span class="table-metric">
                                    <span class="table-metric-label">Response:</span>
                                    <span class="table-metric-value response-speed">${lastRun ? this.escapeHtml(lastRun.responseSpeed) + 'ms' : 'N/A'}</span>
                                </span>
                            </div>
                        </td>
                        <td class="service-aggregate-cell">
                            <div class="table-aggregates">
                                <span class="table-aggregate-label">Avg R²:</span>
                                <span class="table-aggregate-value r2">${this.escapeHtml(aggregates.avgR2)}</span>
                            </div>
                        </td>
                        <td class="service-runs-cell">
                            <span class="total-runs-badge">${aggregates.totalRuns} runs</span>
                        </td>
                        <td class="service-actions-cell">
                            <button class="btn btn-primary btn-view" onclick="EdgeDeviceUI.openServicePerformanceModal('${this.escapeHtml(service.id || service.name)}', '${this.escapeHtml(device.id)}')">
                                <span class="nav-icon">👁️</span>
                                View
                            </button>
                        </td>
                    </tr>
                `;
            });

            return `
                <div class="device-performance-card">
                    <div class="device-performance-header">
                        <div class="device-performance-info">
                            <h3 class="device-performance-name">${this.escapeHtml(device.name)}</h3>
                            <div class="device-performance-meta">
                                <span class="device-ip">🌐 ${this.escapeHtml(device.ip)}</span>
                                <span class="device-type">📱 ${this.escapeHtml(device.type || 'IoT Device')}</span>
                                <span class="device-status-badge status-${device.status || 'online'}">${this.escapeHtml((device.status || 'online').charAt(0).toUpperCase() + (device.status || 'online').slice(1))}</span>
                            </div>
                        </div>
                        <div class="device-services-count">
                            <span class="services-count-number">${services.length}</span>
                            <span class="services-count-label">Service${services.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    <div class="device-services-table-container">
                        <table class="device-services-table">
                            <thead>
                                <tr>
                                    <th>Service</th>
                                    <th>Last Run Metrics</th>
                                    <th>Avg R²</th>
                                    <th>Total Runs</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${servicesTableRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        },

        /**
         * Open service performance modal
         */
        openServicePerformanceModal: function(serviceId, deviceId) {
            const device = window.EdgeDeviceRegistry.getDevice(deviceId);
            if (!device) {
                alert('Device not found.');
                return;
            }

            // Find the service
            let service = null;
            if (device.capabilities?.services) {
                service = device.capabilities.services.find(s => (s.id || s.name) === serviceId);
            }

            if (!service) {
                alert('Service not found.');
                return;
            }

            // Generate run history and aggregates
            const runHistory = this.generateMockRunHistory(service.id || service.name);
            const aggregates = this.calculateAggregateMetrics(runHistory);

            const serviceWithHistory = {
                ...service,
                deviceId: device.id,
                deviceName: device.name,
                deviceIp: device.ip,
                allRuns: runHistory,
                aggregates: aggregates
            };

            // Update modal title
            const modalTitle = document.getElementById('servicePerformanceModalTitle');
            if (modalTitle) {
                modalTitle.textContent = `Performance Analytics: ${this.escapeHtml(service.name || serviceId)}`;
            }

            // Render performance card in modal
            const modalContent = document.getElementById('servicePerformanceModalContent');
            if (modalContent) {
                modalContent.innerHTML = this.generatePerformanceCard(serviceWithHistory);
            }

            // Show modal
            const modal = document.getElementById('servicePerformanceModal');
            if (modal) {
                modal.style.display = 'flex';
            }
        },

        /**
         * Close service performance modal
         */
        closeServicePerformanceModal: function() {
            const modal = document.getElementById('servicePerformanceModal');
            if (modal) {
                modal.style.display = 'none';
            }
        },

        /**
         * Generate performance card HTML for a service (used in modal)
         */
        generatePerformanceCard: function(service) {
            const aggregates = service.aggregates;
            const allRuns = service.allRuns || service.lastFiveRuns || [];

            let runsHtml = '';
            if (allRuns.length === 0) {
                runsHtml = '<div class="empty-runs">No runs available</div>';
            } else {
                allRuns.forEach((run, index) => {
                    const runDate = new Date(run.timestamp);
                    const formattedDate = runDate.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    const statusClass = run.status === 'success' ? 'status-running' : 'status-error';
                    const statusText = run.status === 'success' ? 'Success' : 'Failed';

                    runsHtml += `
                        <div class="performance-run-item">
                            <div class="run-header">
                                <div class="run-number">Run #${index + 1}</div>
                                <div class="run-date">${this.escapeHtml(formattedDate)}</div>
                                <span class="service-status ${statusClass}">${statusText}</span>
                            </div>
                            <div class="run-metrics">
                                <div class="run-metric">
                                    <span class="run-metric-label">R²:</span>
                                    <span class="run-metric-value r2">${this.escapeHtml(run.r2)}</span>
                                </div>
                                <div class="run-metric">
                                    <span class="run-metric-label">RMSE:</span>
                                    <span class="run-metric-value rmse">${this.escapeHtml(run.rmse)}</span>
                                </div>
                                <div class="run-metric">
                                    <span class="run-metric-label">SMAPE:</span>
                                    <span class="run-metric-value smape">${this.escapeHtml(run.smape)}%</span>
                                </div>
                                <div class="run-metric">
                                    <span class="run-metric-label">Response:</span>
                                    <span class="run-metric-value response-speed">${this.escapeHtml(run.responseSpeed)}ms</span>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }

            return `
                <div class="performance-card">
                    <div class="performance-card-header">
                        <div class="performance-service-info">
                            <h3 class="performance-service-name">${this.escapeHtml(service.name || 'Unknown Service')}</h3>
                            <div class="performance-service-meta">
                                <span class="service-device">📱 ${this.escapeHtml(service.deviceName)}</span>
                                <span class="service-ip">🌐 ${this.escapeHtml(service.deviceIp)}</span>
                                <span class="service-version">v${this.escapeHtml(service.version || '1.0.0')}</span>
                            </div>
                        </div>
                        <span class="service-status status-running">Running</span>
                    </div>

                    <div class="performance-card-content">
                        <div class="aggregate-metrics-section">
                            <h4 class="aggregate-section-title">Historical Aggregate Metrics</h4>
                            <div class="aggregate-metrics-grid">
                                <div class="aggregate-metric-card">
                                    <div class="aggregate-metric-label">R² Score</div>
                                    <div class="aggregate-metric-values">
                                        <div class="aggregate-value">
                                            <span class="value-label">Avg:</span>
                                            <span class="value-number r2">${this.escapeHtml(aggregates.avgR2)}</span>
                                        </div>
                                        <div class="aggregate-value">
                                            <span class="value-label">Min:</span>
                                            <span class="value-number">${this.escapeHtml(aggregates.minR2)}</span>
                                        </div>
                                        <div class="aggregate-value">
                                            <span class="value-label">Max:</span>
                                            <span class="value-number">${this.escapeHtml(aggregates.maxR2)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="aggregate-metric-card">
                                    <div class="aggregate-metric-label">RMSE</div>
                                    <div class="aggregate-metric-values">
                                        <div class="aggregate-value">
                                            <span class="value-label">Avg:</span>
                                            <span class="value-number rmse">${this.escapeHtml(aggregates.avgRMSE)}</span>
                                        </div>
                                        <div class="aggregate-value">
                                            <span class="value-label">Min:</span>
                                            <span class="value-number">${this.escapeHtml(aggregates.minRMSE)}</span>
                                        </div>
                                        <div class="aggregate-value">
                                            <span class="value-label">Max:</span>
                                            <span class="value-number">${this.escapeHtml(aggregates.maxRMSE)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="aggregate-metric-card">
                                    <div class="aggregate-metric-label">SMAPE</div>
                                    <div class="aggregate-metric-values">
                                        <div class="aggregate-value">
                                            <span class="value-label">Avg:</span>
                                            <span class="value-number smape">${this.escapeHtml(aggregates.avgSMAPE)}%</span>
                                        </div>
                                        <div class="aggregate-value">
                                            <span class="value-label">Min:</span>
                                            <span class="value-number">${this.escapeHtml(aggregates.minSMAPE)}%</span>
                                        </div>
                                        <div class="aggregate-value">
                                            <span class="value-label">Max:</span>
                                            <span class="value-number">${this.escapeHtml(aggregates.maxSMAPE)}%</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="aggregate-metric-card">
                                    <div class="aggregate-metric-label">Response Speed</div>
                                    <div class="aggregate-metric-values">
                                        <div class="aggregate-value">
                                            <span class="value-label">Avg:</span>
                                            <span class="value-number response-speed">${this.escapeHtml(aggregates.avgResponseSpeed)}ms</span>
                                        </div>
                                        <div class="aggregate-value">
                                            <span class="value-label">Min:</span>
                                            <span class="value-number">${this.escapeHtml(aggregates.minResponseSpeed)}ms</span>
                                        </div>
                                        <div class="aggregate-value">
                                            <span class="value-label">Max:</span>
                                            <span class="value-number">${this.escapeHtml(aggregates.maxResponseSpeed)}ms</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="total-runs-info">
                                <span class="total-runs-label">Total Runs:</span>
                                <span class="total-runs-count">${aggregates.totalRuns}</span>
                            </div>
                        </div>

                        <div class="recent-runs-section">
                            <h4 class="recent-runs-title">All Runs (${allRuns.length})</h4>
                            <div class="recent-runs-list">
                                ${runsHtml}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },


        /**
         * Load logs section
         */
        loadLogsSection: function() {
            const section = document.getElementById('logs');
            if (!section) {
                console.error('EdgeDeviceUI: Logs section not found');
                return;
            }

            section.innerHTML = `
                <div class="section-header">
                    <h1 class="section-title">Logs & Events</h1>
                    <p class="section-subtitle">System log viewer - last 100 events</p>
                </div>

                <div class="log-viewer">
                    <div class="log-viewer-header">
                        <div class="log-viewer-title">System Log</div>
                        <div class="log-viewer-count" id="logEntryCount">100 entries</div>
                    </div>
                    <div class="log-viewer-controls">
                        <button class="btn btn-secondary" onclick="EdgeDeviceUI.refreshLogs()">
                            <span class="nav-icon">🔄</span>
                            Refresh
                        </button>
                        <button class="btn btn-secondary" onclick="EdgeDeviceUI.clearLogs()">
                            <span class="nav-icon">🗑️</span>
                            Clear
                        </button>
                    </div>
                    <div id="logEntriesContainer">
                        <div class="loading">
                            <div class="spinner"></div>
                            Loading logs...
                        </div>
                    </div>
                </div>
            `;

            // Render log entries
            this.renderLogEntries();
        },

        /**
         * Generate system log entries (last 100)
         */
        generateSystemLogs: function() {
            const logs = [];
            const devices = window.EdgeDeviceRegistry.getAllDevices();
            const now = Date.now();
            
            // Generate logs based on devices and activities
            devices.forEach((device, dIndex) => {
                const baseTime = now - (dIndex * 2 * 60 * 60 * 1000); // Stagger device times
                
                // Device discovery log
                logs.push({
                    timestamp: new Date(baseTime),
                    level: 'INFO',
                    message: `Device discovered: ${device.name} (${device.ip}) - Type: ${this.getDeviceTypeDisplay(device.type)}`
                });

                // Data source configuration log
                if (device.dataSources && device.dataSources.length > 0) {
                    logs.push({
                        timestamp: new Date(baseTime + 5 * 60 * 1000),
                        level: 'SUCCESS',
                        message: `Data sources configured for ${device.name}: ${device.dataSources.length} source(s) enabled`
                    });
                }

                // Service deployment logs
                if (device.capabilities?.services && device.capabilities.services.length > 0) {
                    device.capabilities.services.forEach((service, sIndex) => {
                        logs.push({
                            timestamp: new Date(baseTime + (10 + sIndex * 2) * 60 * 1000),
                            level: 'SUCCESS',
                            message: `Service deployed: ${service.name || service.id} v${service.version || '1.0.0'} to ${device.name}`
                        });
                    });
                }

                // Health check logs
                if (device.status === 'online') {
                    logs.push({
                        timestamp: new Date(now - (dIndex * 30 + 15) * 60 * 1000),
                        level: 'INFO',
                        message: `Health check passed for ${device.name} - All systems operational`
                    });
                } else {
                    logs.push({
                        timestamp: new Date(now - (dIndex * 30 + 15) * 60 * 1000),
                        level: 'WARN',
                        message: `Health check failed for ${device.name} - Device offline or unresponsive`
                    });
                }

                // System metrics logs
                logs.push({
                    timestamp: new Date(now - (dIndex * 30 + 20) * 60 * 1000),
                    level: 'DEBUG',
                    message: `System metrics collected from ${device.name}: CPU ${Math.floor(Math.random() * 30 + 40)}%, RAM ${Math.floor(Math.random() * 20 + 50)}%`
                });

                // Network activity logs
                logs.push({
                    timestamp: new Date(now - (dIndex * 30 + 25) * 60 * 1000),
                    level: 'INFO',
                    message: `Network connection established with ${device.name} at ${device.ip}:22`
                });
            });

            // Add some general system logs
            const generalLogs = [
                { level: 'INFO', message: 'Edge Device Management service started', offset: 0 },
                { level: 'INFO', message: 'Device registry initialized', offset: 1 },
                { level: 'INFO', message: 'Health check scheduler started', offset: 2 },
                { level: 'INFO', message: 'API endpoint ready: /api/devices', offset: 3 },
                { level: 'DEBUG', message: 'Monitoring service active - collecting metrics every 30s', offset: 5 },
                { level: 'INFO', message: 'Data collection pipeline initialized', offset: 6 },
                { level: 'SUCCESS', message: 'All systems operational', offset: 10 },
                { level: 'WARN', message: 'High CPU usage detected on device Solar Inverter Gamma', offset: 45 },
                { level: 'ERROR', message: 'Connection timeout to device 192.168.1.103', offset: 50 },
                { level: 'INFO', message: 'Automatic retry scheduled for failed device connections', offset: 51 },
                { level: 'DEBUG', message: 'Cache refreshed: 3 devices, 5 services, 12 data sources', offset: 60 },
                { level: 'INFO', message: 'Log rotation completed - archived 1000 entries', offset: 70 },
                { level: 'INFO', message: 'System backup completed successfully', offset: 80 },
                { level: 'DEBUG', message: 'Memory usage: 245MB / 512MB (47%)', offset: 90 },
                { level: 'INFO', message: 'Scheduled maintenance check completed', offset: 95 }
            ];

            generalLogs.forEach(log => {
                logs.push({
                    timestamp: new Date(now - log.offset * 60 * 1000),
                    level: log.level,
                    message: log.message
                });
            });

            // Sort by timestamp (newest first) and limit to 100
            return logs
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 100);
        },

        /**
         * Render log entries
         */
        renderLogEntries: function() {
            const container = document.getElementById('logEntriesContainer');
            const countElement = document.getElementById('logEntryCount');
            
            if (!container) return;

            const logs = this.generateSystemLogs();

            if (countElement) {
                countElement.textContent = `${logs.length} entries`;
            }

            if (logs.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <h3>No log entries</h3>
                        <p>System logs will appear here as events occur.</p>
                    </div>
                `;
                return;
            }

            let html = '';
            logs.forEach(log => {
                const timestamp = log.timestamp.toISOString().replace('T', ' ').substring(0, 19);
                const level = log.level;
                const message = this.escapeHtml(log.message)
                    .replace(/(\d+\.\d+\.\d+\.\d+)/g, '<span class="log-ip">$1</span>')
                    .replace(/(Device|device|Service|service):\s*([A-Za-z0-9\s-]+)/g, (match, prefix, name) => {
                        if (prefix.toLowerCase() === 'device') {
                            return `${prefix}: <span class="log-device">${name}</span>`;
                        } else {
                            return `${prefix}: <span class="log-service">${name}</span>`;
                        }
                    });

                html += `
                    <div class="log-entry">
                        <span class="log-timestamp">${timestamp}</span>
                        <span class="log-level ${level}">${level}</span>
                        <span class="log-message">${message}</span>
                    </div>
                `;
            });

            container.innerHTML = html;

            // Auto-scroll to top (newest entries)
            container.scrollTop = 0;
        },

        /**
         * Refresh logs
         */
        refreshLogs: function() {
            this.renderLogEntries();
        },

        /**
         * Clear logs (just refreshes for now, in production would clear actual log storage)
         */
        clearLogs: function() {
            if (confirm('Are you sure you want to clear the log viewer? This will refresh the display.')) {
                this.renderLogEntries();
            }
        }
    };

    // Global functions for device discovery
    window.discoverDevice = async function() {
        const ip = document.getElementById('deviceIp').value;
        const username = document.getElementById('sshUsername').value;
        const password = document.getElementById('sshPassword').value;

        if (!ip || !username) {
            alert('Please enter both IP address and username');
            return;
        }

        if (!password) {
            alert('Please enter SSH password');
            return;
        }

        try {
            const device = await window.EdgeDeviceRegistry.discoverDevice(ip, username, password);
            if (device) {
                alert(`Device discovered successfully: ${device.name}`);
                // Add activity
                window.EdgeDeviceUI.addActivity(
                    'discovery',
                    'Device Discovered',
                    `Device "${device.name}" (${device.ip}) was discovered and added to the system`,
                    device.id,
                    device.name
                );
                // Refresh discovered devices in Discovery section
                window.EdgeDeviceUI.renderDiscoveredDevices();
                // Refresh dashboard if it's active
                if (window.EdgeDeviceUI.currentSection === 'dashboard') {
                    window.EdgeDeviceUI.renderActivityFeed();
                }
            }
        } catch (error) {
            alert(`Device discovery failed: ${error.message}`);
        }
    };

    // Make EdgeDeviceUI available globally
    window.EdgeDeviceUI = EdgeDeviceUI;

})();