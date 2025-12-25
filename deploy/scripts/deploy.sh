#!/bin/bash
# ===========================================
# PIM System - Production Deployment Script
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"

# Load environment
if [ -f "$PROJECT_ROOT/.env.production" ]; then
    source "$PROJECT_ROOT/.env.production"
else
    echo -e "${RED}Error: .env.production not found${NC}"
    echo "Copy .env.example to .env.production and configure it"
    exit 1
fi

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi

    log_info "Prerequisites OK"
}

# Pull latest images
pull_images() {
    log_info "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
}

# Deploy with zero-downtime
deploy() {
    log_info "Starting zero-downtime deployment..."

    # Scale up new instances
    log_info "Scaling up backend..."
    docker-compose -f "$COMPOSE_FILE" up -d --no-deps --scale backend=3 backend

    # Wait for health checks
    log_info "Waiting for backend health checks (60s)..."
    sleep 60

    # Check health
    if ! docker-compose -f "$COMPOSE_FILE" exec -T backend wget -q --spider http://localhost:8080/actuator/health; then
        log_error "Backend health check failed!"
        log_warn "Rolling back..."
        docker-compose -f "$COMPOSE_FILE" up -d --no-deps --scale backend=2 backend
        exit 1
    fi

    # Scale down old instances
    log_info "Scaling down to 2 instances..."
    docker-compose -f "$COMPOSE_FILE" up -d --no-deps --scale backend=2 backend

    # Repeat for frontend
    log_info "Scaling up frontend..."
    docker-compose -f "$COMPOSE_FILE" up -d --no-deps --scale frontend=3 frontend

    sleep 30

    log_info "Scaling down frontend to 2 instances..."
    docker-compose -f "$COMPOSE_FILE" up -d --no-deps --scale frontend=2 frontend

    log_info "Deployment complete!"
}

# Health check
health_check() {
    log_info "Running health checks..."

    # Backend
    if curl -sf https://${DOMAIN_BACKEND}/actuator/health > /dev/null; then
        log_info "Backend: HEALTHY"
    else
        log_error "Backend: UNHEALTHY"
        return 1
    fi

    # Frontend
    if curl -sf https://${DOMAIN_FRONTEND} > /dev/null; then
        log_info "Frontend: HEALTHY"
    else
        log_error "Frontend: UNHEALTHY"
        return 1
    fi

    log_info "All services healthy!"
}

# Show status
status() {
    log_info "Service Status:"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    log_info "Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
}

# View logs
logs() {
    local service=${1:-}
    if [ -n "$service" ]; then
        docker-compose -f "$COMPOSE_FILE" logs -f "$service"
    else
        docker-compose -f "$COMPOSE_FILE" logs -f
    fi
}

# Rollback
rollback() {
    log_warn "Rolling back to previous version..."

    # Get previous image tag
    PREVIOUS_VERSION=${1:-previous}

    export VERSION=$PREVIOUS_VERSION
    docker-compose -f "$COMPOSE_FILE" up -d

    log_info "Rollback complete"
}

# Cleanup
cleanup() {
    log_info "Cleaning up old images and containers..."
    docker system prune -f
    docker image prune -a -f --filter "until=168h"
    log_info "Cleanup complete"
}

# Main
case "${1:-deploy}" in
    deploy)
        check_prerequisites
        pull_images
        deploy
        health_check
        ;;
    pull)
        pull_images
        ;;
    status)
        status
        ;;
    logs)
        logs "$2"
        ;;
    health)
        health_check
        ;;
    rollback)
        rollback "$2"
        ;;
    cleanup)
        cleanup
        ;;
    stop)
        docker-compose -f "$COMPOSE_FILE" down
        ;;
    restart)
        docker-compose -f "$COMPOSE_FILE" restart
        ;;
    *)
        echo "Usage: $0 {deploy|pull|status|logs|health|rollback|cleanup|stop|restart}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy with zero-downtime"
        echo "  pull     - Pull latest images"
        echo "  status   - Show service status"
        echo "  logs     - View logs (optionally specify service)"
        echo "  health   - Run health checks"
        echo "  rollback - Rollback to previous version"
        echo "  cleanup  - Clean up old images"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        exit 1
        ;;
esac
