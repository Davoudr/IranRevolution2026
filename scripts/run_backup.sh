#!/bin/bash

# Configuration
PROJECT_DIR="/Users/atakhadivi/Documents/GitHub/IranRevolution2026"
NODE_PATH="/Users/atakhadivi/.nvm/versions/node/v22.21.0/bin"
LOG_FILE="$PROJECT_DIR/backups/cron.log"

# Add Node to PATH
export PATH="$NODE_PATH:$PATH"

# Navigate to project directory
cd "$PROJECT_DIR" || exit 1

# Ensure backups directory exists
mkdir -p backups

# Run the backup script
echo "[$(date)] Starting scheduled backup..." >> "$LOG_FILE"
npm run backup >> "$LOG_FILE" 2>&1
echo "[$(date)] Backup process finished." >> "$LOG_FILE"
echo "-----------------------------------" >> "$LOG_FILE"
