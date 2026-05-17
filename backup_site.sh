#!/bin/bash
# backup_site.sh — create a timestamped .zip backup of BirdID-Site

# === Settings ===
SOURCE_DIR="/home/srking/birdid-site"
BACKUP_DIR="/home/srking/backups"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
ZIP_FILE="$BACKUP_DIR/birdid-site-backup-$DATE.zip"

# === Create backup directory if needed ===
mkdir -p "$BACKUP_DIR"

# === Create the zip archive ===
echo "Creating backup at $ZIP_FILE ..."
zip -r "$ZIP_FILE" "$SOURCE_DIR" > /dev/null

# === Verify success ===
if [ $? -eq 0 ]; then
  echo "✅ Backup completed successfully!"
  echo "File saved as: $ZIP_FILE"
else
  echo "❌ Backup failed."
fi
ls -1t "$BACKUP_DIR"/birdid-site-backup-*.zip | tail -n +6 | xargs -r rm --
