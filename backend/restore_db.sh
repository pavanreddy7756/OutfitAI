#!/bin/bash
# Restore database and uploads from backup

if [ -z "$1" ]; then
    echo "Usage: ./restore_db.sh <backup_directory>"
    echo "Available backups:"
    ls -1 backups/ 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_DIR="backups/$1"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Backup directory not found: $BACKUP_DIR"
    exit 1
fi

echo "Restoring from $BACKUP_DIR..."

# Restore database
if [ -f "$BACKUP_DIR/test.db" ]; then
    cp "$BACKUP_DIR/test.db" ./
    echo "✅ Database restored"
fi

# Restore uploads
if [ -d "$BACKUP_DIR/uploads" ]; then
    rm -rf uploads
    cp -r "$BACKUP_DIR/uploads" ./
    echo "✅ Uploads restored"
fi

echo "Restore complete!"
