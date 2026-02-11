#!/usr/bin/env python3
"""
Edge Device Registry Service
Manages device discovery, registration, and capability detection
"""

from flask import Flask, request, jsonify
import json
import os
import time
from datetime import datetime
import logging
import boto3

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
cloudwatch = boto3.client("cloudwatch", region_name=os.environ.get("AWS_REGION"))


def _put_security_metric(name, value=1):
    """Best-effort custom metric publishing for Phase 0 observability."""
    try:
        cloudwatch.put_metric_data(
            Namespace="OnaPlatform",
            MetricData=[{
                "MetricName": name,
                "Value": float(value),
                "Unit": "Count",
                "Dimensions": [{"Name": "service", "Value": "edge-device-registry"}]
            }]
        )
    except Exception as exc:
        logger.warning("Failed to publish metric %s: %s", name, exc)


def _get_auth_mode():
    """Fetch auth mode at request time to support safe runtime config changes."""
    return os.environ.get("EDGE_DEVICE_REGISTRY_AUTH_MODE", "monitor").strip().lower()


def _get_allowed_api_keys():
    """Resolve accepted API keys from env vars."""
    keys = set()

    single_key = os.environ.get("EDGE_DEVICE_REGISTRY_API_KEY", "").strip()
    if single_key:
        keys.add(single_key)

    multi_keys = os.environ.get("EDGE_DEVICE_REGISTRY_ALLOWED_API_KEYS", "").strip()
    if multi_keys:
        for item in multi_keys.split(","):
            key = item.strip()
            if key:
                keys.add(key)

    return keys


@app.before_request
def _observe_auth_bypass():
    """
    Phase 0: metrics-only auth observability.
    This hook intentionally does not block requests.
    """
    if not request.path.startswith("/api/"):
        return
    if request.method == "OPTIONS":
        return

    auth_mode = _get_auth_mode()
    if auth_mode not in {"monitor", "enforce"}:
        _put_security_metric("AuthModeInvalidConfig")
        return

    presented_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
    allowed_keys = _get_allowed_api_keys()

    # Enforce mode requires configured keys; monitor mode should remain non-breaking.
    if auth_mode == "enforce" and not allowed_keys:
        _put_security_metric("AuthModeInvalidConfig")
        logger.error("EDGE_DEVICE_REGISTRY_AUTH_MODE=enforce but no API keys configured")
        return jsonify({"error": "Authentication configuration unavailable"}), 503

    if not presented_key:
        _put_security_metric("AuthBypass")
        if auth_mode == "enforce":
            return jsonify({"error": "Missing API key"}), 401
        return

    # If keys are configured, validate key; monitor mode emits telemetry only.
    if allowed_keys and presented_key not in allowed_keys:
        _put_security_metric("AuthDenied")
        if auth_mode == "enforce":
            return jsonify({"error": "Invalid API key"}), 401

# In-memory device registry (in production, use a database)
devices = {}

class EdgeDeviceRegistry:
    """Edge Device Registry for managing distributed devices"""
    
    def __init__(self):
        self.devices = {}
        self.load_devices()
    
    def load_devices(self):
        """Load devices from storage"""
        try:
            if os.path.exists('devices.json'):
                with open('devices.json', 'r') as f:
                    self.devices = json.load(f)
                logger.info(f"Loaded {len(self.devices)} devices from storage")
        except Exception as e:
            logger.error(f"Error loading devices: {e}")
    
    def save_devices(self):
        """Save devices to storage"""
        try:
            with open('devices.json', 'w') as f:
                json.dump(self.devices, f, indent=2)
            logger.info("Devices saved to storage")
        except Exception as e:
            logger.error(f"Error saving devices: {e}")
    
    def discover_device(self, ip, username):
        """Discover and register a new device"""
        device_id = f"device_{int(time.time())}"
        
        # Create device object
        device = {
            "id": device_id,
            "ip": ip,
            "username": username,
            "name": f"Edge Device {ip}",
            "type": "unknown",
            "status": "discovering",
            "capabilities": {},
            "lastSeen": datetime.now().isoformat(),
            "createdAt": datetime.now().isoformat()
        }
        
        # Add to registry
        self.devices[device_id] = device
        self.save_devices()
        
        # Detect capabilities
        try:
            capabilities = self.detect_capabilities(ip)
            device["capabilities"] = capabilities
            device["type"] = self.determine_device_type(capabilities)
            device["status"] = "online"
        except Exception as e:
            logger.error(f"Capability detection failed: {e}")
            device["status"] = "offline"
        
        device["lastSeen"] = datetime.now().isoformat()
        self.devices[device_id] = device
        self.save_devices()
        
        return device
    
    def detect_capabilities(self, ip):
        """Detect device capabilities"""
        capabilities = {
            "system": {},
            "docker": {"installed": False, "version": None, "containers": []},
            "platformEdge": {"deployed": False, "version": None, "services": []},
            "services": []
        }
        
        try:
            # Check health endpoint
            import requests
            response = requests.get(f"http://{ip}/health", timeout=5)
            if response.status_code == 200:
                health_data = response.json()
                capabilities["system"] = {
                    "available": True,
                    "service": health_data.get("service", "Unknown"),
                    "version": health_data.get("version", "Unknown"),
                    "timestamp": health_data.get("timestamp", "")
                }
        except Exception as e:
            logger.info(f"Health endpoint not available for {ip}: {e}")
            capabilities["system"] = {"available": False}
        
        # Check for Redis
        try:
            response = requests.get(f"http://{ip}/health", timeout=5)
            if response.status_code == 200:
                capabilities["services"].append({
                    "name": "redis",
                    "status": "running",
                    "port": 6379
                })
        except Exception as e:
            logger.info(f"Redis not accessible for {ip}: {e}")
        
        # Check for Nginx
        try:
            response = requests.get(f"http://{ip}/", timeout=5)
            if response.status_code == 200:
                capabilities["services"].append({
                    "name": "nginx",
                    "status": "running",
                    "port": 80
                })
        except Exception as e:
            logger.info(f"Nginx not accessible for {ip}: {e}")
        
        return capabilities
    
    def determine_device_type(self, capabilities):
        """Determine device type based on capabilities"""
        if capabilities.get("docker", {}).get("installed") and capabilities.get("platformEdge", {}).get("deployed"):
            return "full-platform"
        elif capabilities.get("docker", {}).get("installed"):
            return "docker-ready"
        elif capabilities.get("services", []):
            return "legacy-edge"
        else:
            return "basic-edge"
    
    def get_all_devices(self):
        """Get all registered devices"""
        return list(self.devices.values())
    
    def get_device(self, device_id):
        """Get specific device"""
        return self.devices.get(device_id)
    
    def update_device(self, device_id, updates):
        """Update device information"""
        if device_id in self.devices:
            self.devices[device_id].update(updates)
            self.devices[device_id]["lastSeen"] = datetime.now().isoformat()
            self.save_devices()
            return self.devices[device_id]
        return None
    
    def delete_device(self, device_id):
        """Delete device from registry"""
        if device_id in self.devices:
            del self.devices[device_id]
            self.save_devices()
            return True
        return False

# Initialize registry
registry = EdgeDeviceRegistry()

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "service": "Edge Device Registry",
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    })

@app.route('/api/devices', methods=['GET'])
def get_devices():
    """Get all devices"""
    return jsonify(registry.get_all_devices())

@app.route('/api/devices/<device_id>', methods=['GET'])
def get_device(device_id):
    """Get specific device"""
    device = registry.get_device(device_id)
    if device:
        return jsonify(device)
    return jsonify({"error": "Device not found"}), 404

@app.route('/api/devices', methods=['POST'])
def discover_device():
    """Discover and register a new device"""
    data = request.get_json()
    
    if not data or 'ip' not in data or 'username' not in data:
        return jsonify({"error": "IP address and username required"}), 400
    
    try:
        device = registry.discover_device(data['ip'], data['username'])
        return jsonify(device), 201
    except Exception as e:
        logger.error(f"Device discovery failed: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/devices/<device_id>', methods=['PUT'])
def update_device(device_id):
    """Update device information"""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Update data required"}), 400
    
    try:
        device = registry.update_device(device_id, data)
        if device:
            return jsonify(device)
        return jsonify({"error": "Device not found"}), 404
    except Exception as e:
        logger.error(f"Device update failed: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/devices/<device_id>', methods=['DELETE'])
def delete_device(device_id):
    """Delete device from registry"""
    try:
        if registry.delete_device(device_id):
            return jsonify({"message": "Device deleted successfully"})
        return jsonify({"error": "Device not found"}), 404
    except Exception as e:
        logger.error(f"Device deletion failed: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/devices/<device_id>/capabilities', methods=['GET'])
def get_device_capabilities(device_id):
    """Get device capabilities"""
    device = registry.get_device(device_id)
    if not device:
        return jsonify({"error": "Device not found"}), 404
    
    return jsonify(device.get("capabilities", {}))

@app.route('/api/devices/<device_id>/services', methods=['GET'])
def get_device_services(device_id):
    """Get device services"""
    device = registry.get_device(device_id)
    if not device:
        return jsonify({"error": "Device not found"}), 404
    
    return jsonify(device.get("capabilities", {}).get("services", []))

if __name__ == '__main__':
    # Only enable debug mode in development (via environment variable)
    import os
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=8082, debug=debug_mode)
