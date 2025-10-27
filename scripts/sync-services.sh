#!/bin/bash

# Platform-Edge Service Sync Script
# This script synchronizes specific service files from the main platform repository

set -e

# Configuration
MAIN_REPO_URL="https://github.com/AsobaCloud/platform.git"
MAIN_REPO_BRANCH="main"
TEMP_DIR="/tmp/platform-sync-$$"
SERVICES_TO_SYNC=("forecastingApi")

# Files to sync from main repo (service code only)
SYNC_FILES=(
    "app.py"
    "utils/"
    "README.md"
    "NOTEBOOKREADME.md"
)

# Files to preserve (edge-specific)
PRESERVE_FILES=(
    "Dockerfile"
    "Dockerfile.dev"
    "docker-compose.yml"
    "requirements.txt"
)

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
    if [ ! -f "docker-compose.yml" ] || [ ! -d "services" ]; then
        log_error "This script must be run from the platform-edge root directory"
        exit 1
    fi
}

# Clone main repo to temp directory
clone_main_repo() {
    log_info "Cloning main platform repository..."
    rm -rf "$TEMP_DIR"
    git clone --depth 1 --branch "$MAIN_REPO_BRANCH" "$MAIN_REPO_URL" "$TEMP_DIR"
    log_info "Repository cloned successfully"
}

# Clean up temp directory
cleanup() {
    log_debug "Cleaning up temporary directory..."
    rm -rf "$TEMP_DIR"
}

# Set up cleanup trap
trap cleanup EXIT

# Sync service files
sync_service() {
    local service="$1"
    local source_dir="$TEMP_DIR/services/$service"
    local target_dir="services/$service"
    
    log_info "Syncing $service..."
    
    # Check if service exists in main repo
    if [ ! -d "$source_dir" ]; then
        log_error "Service $service not found in main repository"
        return 1
    fi
    
    # Create target directory if it doesn't exist
    mkdir -p "$target_dir"
    
    # Backup edge-specific files
    local backup_dir="/tmp/edge-backup-$$/$service"
    mkdir -p "$backup_dir"
    
    for file in "${PRESERVE_FILES[@]}"; do
        if [ -f "$target_dir/$file" ] || [ -d "$target_dir/$file" ]; then
            log_debug "Backing up $file"
            cp -r "$target_dir/$file" "$backup_dir/"
        fi
    done
    
    # Sync files from main repo
    for file in "${SYNC_FILES[@]}"; do
        if [ -e "$source_dir/$file" ]; then
            log_debug "Syncing $file"
            cp -r "$source_dir/$file" "$target_dir/"
        else
            log_warn "File $file not found in main repo for $service"
        fi
    done
    
    # Restore edge-specific files
    for file in "${PRESERVE_FILES[@]}"; do
        if [ -e "$backup_dir/$file" ]; then
            log_debug "Restoring $file"
            cp -r "$backup_dir/$file" "$target_dir/"
        fi
    done
    
    # Clean up backup
    rm -rf "$backup_dir"
    
    log_info "Synced $service successfully"
}

# Validate sync
validate_sync() {
    log_info "Validating sync..."
    
    for service in "${SERVICES_TO_SYNC[@]}"; do
        local service_dir="services/$service"
        
        # Check if service directory exists
        if [ ! -d "$service_dir" ]; then
            log_error "Service directory $service_dir not found"
            return 1
        fi
        
        # Check for required files
        if [ ! -f "$service_dir/app.py" ]; then
            log_error "app.py not found in $service_dir"
            return 1
        fi
        
        # Check for edge-specific files
        if [ ! -f "$service_dir/Dockerfile" ]; then
            log_warn "Dockerfile not found in $service_dir - this may be expected for new services"
        fi
        
        log_debug "Validation passed for $service"
    done
    
    log_info "Validation completed successfully"
    return 0
}

# Build and test
build_and_test() {
    log_info "Building and testing edge services..."
    
    # Build forecasting API
    if [ -f "services/forecastingApi/Dockerfile" ]; then
        log_info "Building forecasting API..."
        docker build -t forecasting-api:latest services/forecastingApi/
        
        # Run basic health check
        log_info "Running health check..."
        docker run --rm -d --name test-forecasting-api \
            -p 8080:8080 \
            forecasting-api:latest
        
        # Wait for service to start
        sleep 10
        
        # Test health endpoint
        if curl -f http://localhost:8080/health > /dev/null 2>&1; then
            log_info "Health check passed"
        else
            log_error "Health check failed"
            docker logs test-forecasting-api
            docker stop test-forecasting-api
            return 1
        fi
        
        # Cleanup
        docker stop test-forecasting-api
    fi
    
    log_info "Build and test completed successfully"
    return 0
}

# Check for changes
check_changes() {
    log_info "Checking for changes..."
    
    if git diff --quiet; then
        log_info "No changes detected"
        return 0
    else
        log_info "Changes detected:"
        git diff --name-only
        return 1
    fi
}

# Commit changes
commit_changes() {
    log_info "Committing changes..."
    
    # Add all changes
    git add .
    
    # Get commit message
    local commit_msg="Sync services from main platform repo: $(date)"
    
    # Commit
    git commit -m "$commit_msg"
    
    log_info "Changes committed successfully"
}

# Push changes
push_changes() {
    log_info "Pushing changes..."
    git push
    log_info "Changes pushed successfully"
}

# Show sync status
show_status() {
    log_info "Sync Status:"
    echo "  Main repo: $MAIN_REPO_URL"
    echo "  Branch: $MAIN_REPO_BRANCH"
    echo "  Services: ${SERVICES_TO_SYNC[*]}"
    echo "  Sync files: ${SYNC_FILES[*]}"
    echo "  Preserve files: ${PRESERVE_FILES[*]}"
    echo ""
    
    # Show current git status
    if git status --porcelain | grep -q .; then
        log_warn "Uncommitted changes detected:"
        git status --short
    else
        log_info "Working directory is clean"
    fi
}

# Main sync function
sync_services() {
    log_info "Starting platform services sync..."
    
    check_directory
    clone_main_repo
    
    # Sync each service
    for service in "${SERVICES_TO_SYNC[@]}"; do
        sync_service "$service"
    done
    
    validate_sync
    
    if check_changes; then
        log_info "No changes to commit"
        return 0
    fi
    
    build_and_test
    commit_changes
    push_changes
    
    log_info "Sync completed successfully!"
}

# Handle command line arguments
case "${1:-sync}" in
    "sync")
        sync_services
        ;;
    "validate")
        check_directory
        validate_sync
        ;;
    "build")
        check_directory
        build_and_test
        ;;
    "status")
        show_status
        ;;
    "help")
        echo "Usage: $0 [sync|validate|build|status|help]"
        echo "  sync     - Full sync process (default)"
        echo "  validate - Validate current state"
        echo "  build    - Build and test services"
        echo "  status   - Show sync status"
        echo "  help     - Show this help"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac