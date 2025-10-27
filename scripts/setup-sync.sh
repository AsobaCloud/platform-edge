#!/bin/bash

# Setup script for platform-edge sync
# This script initializes the sync process and copies the initial service code

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
check_directory() {
    if [ ! -f "docker-compose.yml" ] || [ ! -d "services" ]; then
        log_error "This script must be run from the platform-edge root directory"
        exit 1
    fi
}

# Check if main platform repo is accessible
check_main_repo() {
    local main_repo_url="https://github.com/AsobaCloud/platform.git"
    log_info "Checking access to main platform repository..."
    
    if git ls-remote "$main_repo_url" > /dev/null 2>&1; then
        log_info "Main repository is accessible"
    else
        log_error "Cannot access main repository: $main_repo_url"
        log_error "Please check your internet connection and repository access"
        exit 1
    fi
}

# Initialize git repository if needed
init_git() {
    if [ ! -d ".git" ]; then
        log_info "Initializing git repository..."
        git init
        git add .
        git commit -m "Initial commit: platform-edge setup"
        log_info "Git repository initialized"
    else
        log_info "Git repository already exists"
    fi
}

# Run initial sync
initial_sync() {
    log_info "Running initial sync..."
    ./scripts/sync-services.sh sync
}

# Create .gitignore
create_gitignore() {
    if [ ! -f ".gitignore" ]; then
        log_info "Creating .gitignore..."
        cat > .gitignore << EOF
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
env.bak/
venv.bak/

# Docker
.dockerignore

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Data
data/models/
data/cache/

# Temporary files
tmp/
temp/
EOF
        log_info ".gitignore created"
    else
        log_info ".gitignore already exists"
    fi
}

# Main setup function
setup_sync() {
    log_info "Setting up platform-edge sync..."
    
    check_directory
    check_main_repo
    init_git
    create_gitignore
    initial_sync
    
    log_info "Setup completed successfully!"
    log_info "You can now use './scripts/sync-services.sh' to sync with the main repository"
}

# Handle command line arguments
case "${1:-setup}" in
    "setup")
        setup_sync
        ;;
    "help")
        echo "Usage: $0 [setup|help]"
        echo "  setup - Run initial setup (default)"
        echo "  help  - Show this help"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac