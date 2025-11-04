#!/bin/bash

# TooLoo.ai PostgreSQL Setup Script
# This script sets up PostgreSQL for TooLoo.ai

set -e

echo "═════════════════════════════════════════════════════════════════"
echo "TooLoo.ai PostgreSQL Setup"
echo "═════════════════════════════════════════════════════════════════"
echo ""

# Check PostgreSQL installation
echo "✅ Checking PostgreSQL installation..."
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not installed. Please run:"
    echo "   sudo apt-get update && sudo apt-get install -y postgresql postgresql-contrib"
    exit 1
fi
psql --version

echo ""
echo "📝 Configuration will be added to .env file:"
echo "   DB_HOST=localhost"
echo "   DB_PORT=5432"
echo "   DB_NAME=tooloo_learners"
echo "   DB_USER=postgres"
echo "   DB_PASSWORD=postgres"

echo ""
echo "⚠️  NOTE: In a dev container, you may need to:"
echo "   1. Run PostgreSQL in the background or different terminal"
echo "   2. Use 'pg_isready' to check connection status"
echo "   3. Start with: pg_ctl -D /var/lib/postgresql/16/main -l logfile start"

echo ""
echo "═════════════════════════════════════════════════════════════════"
echo "✅ PostgreSQL is ready to configure"
echo "═════════════════════════════════════════════════════════════════"
