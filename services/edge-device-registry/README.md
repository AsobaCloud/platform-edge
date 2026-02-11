# Edge Device Registry Service

A Flask-based service for managing edge device discovery, registration, and capability detection in the Ona Platform.

## Purpose

The Edge Device Registry provides centralized management of distributed edge devices across solar installations. It handles:

- **Device Discovery**: Automatic detection of devices via IP address
- **Capability Detection**: Identifies device type and available services (Docker, Redis, Nginx, etc.)
- **Device Lifecycle Management**: CRUD operations for device registry

## API Endpoints

### Health Check

```
GET /health
```

Returns service health status.

**Response**:
```json
{
  "service": "Edge Device Registry",
  "status": "healthy",
  "timestamp": "2025-01-09T12:00:00",
  "version": "1.0.0"
}
```

### Device Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/devices` | List all registered devices |
| `GET` | `/api/devices/{device_id}` | Get specific device details |
| `POST` | `/api/devices` | Discover and register a new device |
| `PUT` | `/api/devices/{device_id}` | Update device information |
| `DELETE` | `/api/devices/{device_id}` | Remove device from registry |
| `GET` | `/api/devices/{device_id}/capabilities` | Get device capabilities |
| `GET` | `/api/devices/{device_id}/services` | Get device services |

### Register New Device

```
POST /api/devices
Content-Type: application/json

{
  "ip": "192.168.1.100",
  "username": "admin"
}
```

**Response**:
```json
{
  "id": "device_1704801234",
  "ip": "192.168.1.100",
  "username": "admin",
  "name": "Edge Device 192.168.1.100",
  "type": "docker-ready",
  "status": "online",
  "capabilities": {
    "system": {"available": true},
    "docker": {"installed": true, "version": "24.0.0"},
    "services": [{"name": "nginx", "status": "running", "port": 80}]
  },
  "lastSeen": "2025-01-09T12:00:00",
  "createdAt": "2025-01-09T12:00:00"
}
```

## Device Types

The service classifies devices based on detected capabilities:

| Type | Description |
|------|-------------|
| `full-platform` | Docker installed + Platform Edge deployed |
| `docker-ready` | Docker installed, ready for platform deployment |
| `legacy-edge` | Has services but no Docker |
| `basic-edge` | Minimal capabilities detected |

## Running Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python app.py

# Service runs on port 8082
# http://localhost:8082/health
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_DEBUG` | `False` | Enable debug mode (development only) |
| `EDGE_DEVICE_REGISTRY_AUTH_MODE` | `monitor` | `monitor` emits auth telemetry, `enforce` reserved for blocking rollout |
| `EDGE_DEVICE_REGISTRY_API_KEY` | _(unset)_ | Primary API key accepted for `/api/*` requests |
| `EDGE_DEVICE_REGISTRY_ALLOWED_API_KEYS` | _(unset)_ | Optional comma-separated additional API keys |

In `monitor` mode, missing/invalid API keys emit telemetry without blocking requests.  
In `enforce` mode, missing/invalid API keys return `401` for `/api/*` routes.

## Docker Deployment

```bash
# Build image
docker build -t edge-device-registry .

# Run container
docker run -p 8082:8082 edge-device-registry
```

## Dependencies

- Flask 2.3.3 - Web framework
- requests >= 2.32.4 - HTTP client for device discovery
- Werkzeug 2.3.7 - WSGI utilities

## Data Storage

Currently uses file-based storage (`devices.json`) for device registry. In production, this should be replaced with DynamoDB or another persistent store.

## Related Documentation

- [UI Edge Device Management](../../ui/README.md) - Frontend interface for device management
- [System Admin Guide](../../docs/SYSTEM%20ADMIN.md) - Platform administration

## Architecture Notes

This service is designed to run as a standalone Flask application, separate from the Lambda-based services. It integrates with:

- **UI**: `edge-device-management.html` and `edge-device-detail.html` for device management interface
- **Monitoring**: Devices report status via `/health` endpoint polling
