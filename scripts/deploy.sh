#!/bin/bash

# Platform Edge Deployment Script
# Deploys the platform-edge services to an ARM64 edge device

set -e

# Configuration
COMPOSE_FILE="docker-compose.yml"
DEV_COMPOSE_FILE="docker-compose.dev.yml"
ENV_FILE="config/environment.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Check if we're in the right directory
check_directory() {
    if [ ! -f "$COMPOSE_FILE" ] || [ ! -d "services" ]; then
        log_error "This script must be run from the platform-edge root directory"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Check architecture
    ARCH=$(uname -m)
    if [[ "$ARCH" != "aarch64" && "$ARCH" != "arm64" ]]; then
        log_warn "Architecture $ARCH may not be optimal for ARM64 containers"
    fi
    
    log_info "Prerequisites check passed"
}

# Load environment configuration
load_environment() {
    if [ -f "$ENV_FILE" ]; then
        log_info "Loading environment configuration from $ENV_FILE"
        source "$ENV_FILE"
    else
        log_warn "Environment file $ENV_FILE not found, using defaults"
        log_info "Copy config/environment.example.sh to config/environment.sh and configure"
    fi
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    
    mkdir -p data/models
    mkdir -p data/cache
    mkdir -p logs
    mkdir -p config/ssl
    
    log_info "Directories created"
}

# Build services
build_services() {
    log_info "Building services..."

    # Build edge device registry
    log_info "Building edge device registry..."
    docker build -t edge-device-registry:latest services/edge-device-registry/
    
    # Build forecasting API
    log_info "Building forecasting API..."
    docker build -t forecasting-api:latest services/forecastingApi/
    
    # Build model updater
    log_info "Building model updater..."
    docker build -t model-updater:latest services/model-updater/
    
    log_info "Services built successfully"
}

# Start services
start_services() {
    local mode="${1:-production}"
    
    log_info "Starting services in $mode mode..."
    
    if [ "$mode" = "development" ]; then
        docker-compose -f "$DEV_COMPOSE_FILE" up -d
    else
        docker-compose up -d
    fi
    
    log_info "Services started"
}

# Wait for services to be ready
wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:8080/health > /dev/null 2>&1; then
            log_info "Forecasting API is ready"
            break
        fi
        
        log_debug "Waiting for services... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "Services failed to start within expected time"
        return 1
    fi
    
    log_info "All services are ready"
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."

    # Check edge device registry
    if curl -f http://localhost:8082/health > /dev/null 2>&1; then
        log_info "✓ Edge Device Registry: Healthy"
    else
        log_error "✗ Edge Device Registry: Unhealthy"
        return 1
    fi
    
    # Check forecasting API
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        log_info "✓ Forecasting API: Healthy"
    else
        log_error "✗ Forecasting API: Unhealthy"
        return 1
    fi
    
    # Check model updater
    if curl -f http://localhost:8081/health > /dev/null 2>&1; then
        log_info "✓ Model Updater: Healthy"
    else
        log_error "✗ Model Updater: Unhealthy"
        return 1
    fi
    
    # Check Redis
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        log_info "✓ Redis: Healthy"
    else
        log_error "✗ Redis: Unhealthy"
        return 1
    fi
    
    log_info "All health checks passed"
}

# Show service status
show_status() {
    log_info "Service Status:"
    echo ""
    
    # Docker Compose status
    docker-compose ps
    echo ""
    
    # Service endpoints
    log_info "Available endpoints:"
    echo "  - Health Check: http://localhost/health"
    echo "  - Service Status: http://localhost/status"
    echo "  - Edge Device Registry API: http://localhost:8082/api/devices"
    echo "  - Edge Device Registry via Nginx: http://localhost/api/devices"
    echo "  - Forecast API: http://localhost/api/forecast"
    echo "  - Model Updater: http://localhost/api/model/health"
    echo ""
    
    # Logs
    log_info "Recent logs:"
    docker-compose logs --tail=10
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    docker-compose down
}

# Main deployment function
deploy() {
    local mode="${1:-production}"
    
    log_info "Starting platform-edge deployment in $mode mode..."
    
    check_directory
    check_prerequisites
    load_environment
    create_directories
    build_services
    start_services "$mode"
    wait_for_services
    run_health_checks
    show_status
    
    log_info "Deployment completed successfully!"
    log_info "Platform Edge is running and ready to serve forecasts"
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        deploy "${2:-production}"
        ;;
    "dev")
        deploy "development"
        ;;
    "build")
        check_directory
        build_services
        ;;
    "start")
        check_directory
        load_environment
        start_services "${2:-production}"
        ;;
    "stop")
        check_directory
        cleanup
        ;;
    "restart")
        check_directory
        cleanup
        start_services "${2:-production}"
        ;;
    "status")
        check_directory
        show_status
        ;;
    "logs")
        check_directory
        docker-compose logs -f
        ;;
    "health")
        check_directory
        run_health_checks
        ;;
    "help")
        echo "Usage: $0 [deploy|dev|build|start|stop|restart|status|logs|health|help]"
        echo "  deploy  - Deploy in production mode (default)"
        echo "  dev     - Deploy in development mode"
        echo "  build   - Build services only"
        echo "  start   - Start services"
        echo "  stop    - Stop services"
        echo "  restart - Restart services"
        echo "  status  - Show service status"
        echo "  logs    - Show service logs"
        echo "  health  - Run health checks"
        echo "  help    - Show this help"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
