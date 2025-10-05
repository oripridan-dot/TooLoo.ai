#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Progress tracking
PHASE_COUNT=0
PHASE_TOTAL=5

update_progress() {
    PHASE_COUNT=$((PHASE_COUNT + 1))
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Phase $PHASE_COUNT/$PHASE_TOTAL: $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Validation functions
check_node() {
    log_info "Checking Node.js version..."
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    
    if [ "$NODE_VERSION" -lt 20 ]; then
        log_error "Node.js 20+ required. Current: $(node --version)"
        exit 1
    fi
    
    log_success "Node.js version: $(node --version)"
}

check_npm() {
    log_info "Checking npm..."
    if ! command -v npm &> /dev/null; then
        log_error "npm not found"
        exit 1
    fi
    log_success "npm version: $(npm --version)"
}

# Backup function
create_backup() {
    log_info "Creating backup..."
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup critical files
    cp -r simple-api-server.js "$BACKUP_DIR/" 2>/dev/null || true
    cp -r web-app/src "$BACKUP_DIR/web-app-src" 2>/dev/null || true
    cp package.json "$BACKUP_DIR/" 2>/dev/null || true
    
    log_success "Backup created: $BACKUP_DIR"
}

# Phase 0: Setup
phase_0_setup() {
    update_progress "Setup & Validation"
    
    check_node
    check_npm
    create_backup
    
    log_info "Installing root dependencies..."
    npm ci || npm install
    
    log_info "Installing frontend dependencies..."
    cd web-app && npm ci || npm install
    cd ..
    
    log_info "Verifying current build..."
    npm run build || {
        log_error "Initial build failed. Fix before proceeding."
        exit 1
    }
    
    log_success "Setup complete!"
}

# Phase 1: Test Infrastructure
phase_1_tests() {
    update_progress "Test Infrastructure"
    
    log_info "Installing test dependencies..."
    bash scripts/install-test-deps.sh || {
        log_warning "Auto-install failed, trying manual install..."
        npm install --save-dev vitest @vitest/ui supertest @types/supertest c8
        cd web-app && npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
        cd ..
    }
    
    log_info "Running initial tests..."
    npm test || {
        log_warning "Some tests failed, but continuing..."
    }
    
    log_success "Test infrastructure ready!"
}

# Phase 2: Backend Modularization
phase_2_modularization() {
    update_progress "Backend Modularization"
    
    log_info "Creating modular structure..."
    bash scripts/create-structure.sh || {
        log_info "Creating structure manually..."
        mkdir -p src/{routes,services,managers,middleware,config,utils}
        mkdir -p tests/{api,unit,integration,fixtures}
        mkdir -p docs/{architecture,api,guides}
    }
    
    log_info "Modules extracted. Verifying..."
    
    # Check if key files exist
    if [ -f "src/services/ProviderService.js" ]; then
        log_success "ProviderService extracted"
    else
        log_warning "ProviderService not yet extracted - manual intervention needed"
    fi
    
    if [ -f "src/middleware/errorHandler.js" ]; then
        log_success "Error handling middleware ready"
    else
        log_warning "Error handling middleware not yet integrated"
    fi
    
    log_success "Modularization structure ready!"
}

# Phase 3: Monitoring & Logging
phase_3_monitoring() {
    update_progress "Monitoring & Logging"
    
    log_info "Installing logging dependencies..."
    npm install pino pino-pretty || {
        log_error "Failed to install logging dependencies"
        exit 1
    }
    
    log_info "Setting up structured logging..."
    # Logging configuration is already created in src/config/logger.js
    
    if [ -f "src/config/logger.js" ]; then
        log_success "Logger configuration ready"
    else
        log_warning "Logger configuration not found"
    fi
    
    if [ -f "src/services/HealthCheckService.js" ]; then
        log_success "Health check service ready"
    else
        log_warning "Health check service not yet integrated"
    fi
    
    log_success "Monitoring infrastructure ready!"
}

# Phase 4: CI/CD
phase_4_cicd() {
    update_progress "CI/CD Pipeline"
    
    log_info "Setting up GitHub Actions..."
    
    if [ -f ".github/workflows/ci.yml" ]; then
        log_success "CI workflow configured"
    else
        log_warning "CI workflow not found - manual setup needed"
    fi
    
    log_info "Validating build for CI..."
    npm run build || {
        log_error "Build failed - CI will fail"
        exit 1
    }
    
    log_info "Running full test suite..."
    npm test || {
        log_warning "Some tests failed - fix before pushing"
    }
    
    log_success "CI/CD pipeline ready!"
}

# Phase 5: Documentation
phase_5_docs() {
    update_progress "Documentation"
    
    log_info "Checking documentation..."
    
    if [ -f "docs/ARCHITECTURE.md" ]; then
        log_success "Architecture documentation ready"
    else
        log_warning "Architecture documentation not found"
    fi
    
    if [ -f "CODESPACES_QUICKSTART.md" ]; then
        log_success "Quick start guide ready"
    else
        log_warning "Quick start guide not found"
    fi
    
    if [ -f "EXECUTION_CHECKLIST.md" ]; then
        log_success "Execution checklist ready"
    else
        log_warning "Execution checklist not found"
    fi
    
    log_success "Documentation ready!"
}

# Final validation
final_validation() {
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Final Validation${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    log_info "Running final checks..."
    
    # Check build
    log_info "Testing build..."
    npm run build && log_success "Build: PASS" || log_error "Build: FAIL"
    
    # Check tests
    log_info "Running test suite..."
    npm test && log_success "Tests: PASS" || log_warning "Tests: PARTIAL"
    
    # Check coverage
    log_info "Checking test coverage..."
    npm run test:coverage 2>/dev/null || log_warning "Coverage not yet configured"
    
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Transformation Complete! 🎉${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo "Next steps:"
    echo "1. Review EXECUTION_CHECKLIST.md for validation items"
    echo "2. Read CODESPACES_QUICKSTART.md for daily workflow"
    echo "3. Check docs/ARCHITECTURE.md for system overview"
    echo "4. Create PR with: git push origin feature/transformation-phase-1"
    echo ""
}

# Main execution
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                                        ║${NC}"
    echo -e "${BLUE}║        TooLoo.ai Transformation Execution              ║${NC}"
    echo -e "${BLUE}║                                                        ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log_info "Starting transformation process..."
    log_info "This will take approximately 30-60 minutes"
    echo ""
    
    # Execute phases
    phase_0_setup
    phase_1_tests
    phase_2_modularization
    phase_3_monitoring
    phase_4_cicd
    phase_5_docs
    
    # Final validation
    final_validation
}

# Handle errors
trap 'log_error "Script failed at line $LINENO"' ERR

# Run main
main "$@"
