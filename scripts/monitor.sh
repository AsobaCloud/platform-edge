#!/bin/bash

# Platform Edge Monitoring Script
# Monitors the health and performance of platform-edge services

set -e

# Configuration
HEALTH_ENDPOINT="http://localhost/health"
STATUS_ENDPOINT="http://localhost/status"
FORECAST_ENDPOINT="http://localhost/api/forecast"

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

# Check service health
check_health() {
    log_info "Checking service health..."
    
    if curl -f "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
        log_info "✓ Services are healthy"
        return 0
    else
        log_error "✗ Services are unhealthy"
        return 1
    fi
}

# Get detailed status
get_status() {
    log_info "Getting detailed status..."
    
    if curl -f "$STATUS_ENDPOINT" > /dev/null 2>&1; then
        local status=$(curl -s "$STATUS_ENDPOINT")
        echo "$status" | jq '.' 2>/dev/null || echo "$status"
    else
        log_error "Failed to get status"
        return 1
    fi
}

# Test forecast generation
test_forecast() {
    local customer_id="${1:-default}"
    local forecast_hours="${2:-24}"
    
    log_info "Testing forecast generation for customer: $customer_id"
    
    local test_data=$(cat <<EOF
{
    "customer_id": "$customer_id",
    "forecast_hours": $forecast_hours
}
EOF
)
    
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$test_data" \
        "$FORECAST_ENDPOINT")
    
    if echo "$response" | jq '.error' > /dev/null 2>&1; then
        log_error "Forecast test failed:"
        echo "$response" | jq '.error'
        return 1
    else
        log_info "✓ Forecast test successful"
        local forecast_count=$(echo "$response" | jq '.forecast_hours')
        log_info "Generated $forecast_count forecast points"
        return 0
    fi
}

# Monitor resource usage
monitor_resources() {
    log_info "Monitoring resource usage..."
    
    echo "=== Docker Container Stats ==="
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    echo ""
    
    echo "=== System Resources ==="
    echo "CPU Usage:"
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1
    echo ""
    
    echo "Memory Usage:"
    free -h
    echo ""
    
    echo "Disk Usage:"
    df -h
    echo ""
}

# Monitor logs
monitor_logs() {
    local service="${1:-all}"
    local lines="${2:-50}"
    
    log_info "Monitoring logs for $service (last $lines lines)..."
    
    if [ "$service" = "all" ]; then
        docker-compose logs --tail="$lines" -f
    else
        docker-compose logs --tail="$lines" -f "$service"
    fi
}

# Performance test
performance_test() {
    local iterations="${1:-10}"
    local customer_id="${2:-default}"
    
    log_info "Running performance test ($iterations iterations)..."
    
    local success_count=0
    local total_time=0
    
    for i in $(seq 1 $iterations); do
        local start_time=$(date +%s.%N)
        
        if test_forecast "$customer_id" 24 > /dev/null 2>&1; then
            ((success_count++))
        fi
        
        local end_time=$(date +%s.%N)
        local duration=$(echo "$end_time - $start_time" | bc)
        total_time=$(echo "$total_time + $duration" | bc)
        
        log_debug "Iteration $i: ${duration}s"
    done
    
    local success_rate=$(echo "scale=2; $success_count * 100 / $iterations" | bc)
    local avg_time=$(echo "scale=2; $total_time / $iterations" | bc)
    
    log_info "Performance Test Results:"
    log_info "  Success Rate: ${success_rate}%"
    log_info "  Average Time: ${avg_time}s"
    log_info "  Total Time: ${total_time}s"
}

# Continuous monitoring
continuous_monitor() {
    local interval="${1:-30}"
    
    log_info "Starting continuous monitoring (interval: ${interval}s)"
    log_info "Press Ctrl+C to stop"
    
    while true; do
        echo "=== $(date) ==="
        
        if check_health; then
            log_info "✓ All systems operational"
        else
            log_error "✗ System issues detected"
        fi
        
        echo ""
        sleep "$interval"
    done
}

# Generate report
generate_report() {
    local output_file="${1:-monitoring-report-$(date +%Y%m%d-%H%M%S).txt}"
    
    log_info "Generating monitoring report: $output_file"
    
    {
        echo "Platform Edge Monitoring Report"
        echo "Generated: $(date)"
        echo "=================================="
        echo ""
        
        echo "=== Health Check ==="
        if check_health; then
            echo "Status: HEALTHY"
        else
            echo "Status: UNHEALTHY"
        fi
        echo ""
        
        echo "=== Service Status ==="
        get_status
        echo ""
        
        echo "=== Resource Usage ==="
        monitor_resources
        echo ""
        
        echo "=== Performance Test ==="
        performance_test 5
        echo ""
        
    } > "$output_file"
    
    log_info "Report generated: $output_file"
}

# Main monitoring function
monitor() {
    local action="${1:-status}"
    
    case "$action" in
        "health")
            check_health
            ;;
        "status")
            get_status
            ;;
        "test")
            test_forecast "${2:-default}" "${3:-24}"
            ;;
        "resources")
            monitor_resources
            ;;
        "logs")
            monitor_logs "${2:-all}" "${3:-50}"
            ;;
        "performance")
            performance_test "${2:-10}" "${3:-default}"
            ;;
        "continuous")
            continuous_monitor "${2:-30}"
            ;;
        "report")
            generate_report "${2:-monitoring-report.txt}"
            ;;
        "help")
            echo "Usage: $0 [health|status|test|resources|logs|performance|continuous|report|help]"
            echo "  health      - Check service health"
            echo "  status      - Get detailed status"
            echo "  test        - Test forecast generation"
            echo "  resources   - Monitor resource usage"
            echo "  logs        - Monitor service logs"
            echo "  performance - Run performance test"
            echo "  continuous  - Continuous monitoring"
            echo "  report      - Generate monitoring report"
            echo "  help        - Show this help"
            ;;
        *)
            log_error "Unknown action: $action"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run monitoring
monitor "$@"