# Platform Edge

Edge deployment platform for ONA Platform services, optimized for ARM64 devices like Raspberry Pi CM4.

## Overview

This repository contains edge-optimized versions of ONA Platform services, designed to run on resource-constrained devices with ARM64 architecture. It deploys forecasting and edge-device-registry services for local inference and edge operations.

## Architecture

- **Target Devices**: Raspberry Pi CM4, Orange Pi 5, Rock 5B, and similar ARM64 SBCs
- **OS Support**: Raspberry Pi OS, Ubuntu ARM64, Debian ARM64
- **Container Runtime**: Docker with ARM64 support
- **Services**: forecastingApi, edge-device-registry, model-updater

## Key Features

- **ARM64 Optimized**: All containers built for ARM64 architecture
- **Resource Efficient**: Optimized for low-power, low-memory devices
- **Edge Native**: Designed for local inference without cloud dependencies
- **Model Management**: Automated model updates and caching
- **Monitoring**: Built-in health checks and performance monitoring

## Quick Start

### Prerequisites

- ARM64 device (Raspberry Pi CM4 recommended)
- Docker installed
- 4GB+ RAM (8GB recommended)
- 16GB+ storage
- Internet connection for model updates

### Installation

```bash
# Clone the repository
git clone <repository-url> platform-edge
cd platform-edge

# Setup sync with main platform repository
./scripts/setup-sync.sh

# Build and start services
docker-compose up -d

# Check status
docker-compose ps
```

### Configuration

1. Copy `config/environment.example.sh` to `config/environment.sh`
2. Update configuration variables
3. Restart services: `docker-compose restart`

Edge-device-registry auth rollout variables:
- `EDGE_DEVICE_REGISTRY_AUTH_MODE=monitor` (default)
- `EDGE_DEVICE_REGISTRY_API_KEY=<value from SSM parameter /ona-platform/prod/edge-device-registry/api-key>`
- Optional: `EDGE_DEVICE_REGISTRY_ALLOWED_API_KEYS` (comma-separated)

## Services

### forecastingApi

Edge-optimized forecasting service for solar energy prediction.

**Features:**
- Pre-trained model inference
- Redis caching
- Automated model updates
- RESTful API endpoints

**Endpoints:**
- `GET /health` - Health check
- `POST /forecast` - Generate forecast
- `GET /status` - Service status

### edge-device-registry

Edge device discovery and lifecycle management service.

**Endpoints:**
- `GET /health` - Health check
- `GET /api/devices` - List devices
- `POST /api/devices` - Register/discover device
- `GET /api/devices/{device_id}` - Device details

## Development

### Local Development

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Run tests
make test

# Build for production
make build
```

### Syncing with Main Repository

```bash
# Sync service code from main platform repository
./scripts/sync-services.sh

# Check sync status
./scripts/sync-services.sh status

# Validate current state
./scripts/sync-services.sh validate
```

### Adding New Services

1. Add service to `SERVICES_TO_SYNC` in `scripts/sync-services.sh`
2. Define sync files in `SYNC_FILES` array
3. Define preserve files in `PRESERVE_FILES` array
4. Create edge-specific Dockerfile and configuration
5. Update `docker-compose.yml`

## Deployment

### Production Deployment

```bash
# Deploy to edge device
./scripts/deploy.sh

# Run auth monitor canary for edge-device-registry
./scripts/canary-edge-registry-auth.sh

# Update models
./scripts/update-models.sh

# Monitor services
./scripts/monitor.sh
```

### Model Management

- Models are automatically downloaded from cloud storage
- Weekly model updates are scheduled
- Local model caching reduces download times
- Model validation ensures integrity

## Monitoring

### Health Checks

- Service health endpoints
- Resource usage monitoring
- Model freshness tracking
- Error rate monitoring

### Logs

```bash
# View service logs
docker-compose logs -f forecasting-api
docker-compose logs -f edge-device-registry

# View all logs
docker-compose logs -f
```

## Performance

### Expected Performance (CM4 8GB)

- **Forecast Generation**: 2-5 seconds
- **Memory Usage**: 1-2GB
- **CPU Usage**: <20% peak
- **Storage**: <1GB for models
- **Power**: 3-5W active, 1W idle

## Troubleshooting

### Common Issues

1. **Out of Memory**: Increase swap or use 8GB CM4
2. **Model Download Fails**: Check network connectivity
3. **Slow Performance**: Ensure ARM64 optimized containers
4. **Docker Issues**: Update Docker to latest version

### Support

- Check logs: `docker-compose logs`
- Verify configuration: `./scripts/check-config.sh`
- Test connectivity: `./scripts/test-connectivity.sh`

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test on ARM64 device
5. Submit pull request

## License

[Add your license here]

## Changelog

### v1.0.0
- Initial release
- forecastingApi edge deployment
- ARM64 optimization
- Docker Compose setup
- Model management system
