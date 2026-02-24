#!/bin/bash
# Backup database and uploads

BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Creating backup in $BACKUP_DIR..."

# Backup database
if [ -f "test.db" ]; then
    cp test.db "$BACKUP_DIR/"
    echo "✅ Database backed up"
else
    echo "⚠️  No database file found"
fi

# Backup uploads
if [ -d "uploads" ]; then
    cp -r uploads "$BACKUP_DIR/"
    echo "✅ Uploads backed up"
else
    echo "⚠️  No uploads directory found"
fi

echo "Backup complete: $BACKUP_DIR"
