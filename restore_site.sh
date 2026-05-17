#!/bin/bash
# restore_site.sh — restore /home/srking/birdid-site from a backup .zip
# Usage:
#   sudo bash restore_site.sh                   # restore from the most recent backup
#   sudo bash restore_site.sh /path/to/backup.zip  # restore from a specific backup

set -euo pipefail

SERVICE="birdid-site.service"
SITE_DIR="/home/srking/birdid-site"
BACKUP_DIR="/home/srking/backups"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
TMPDIR="/tmp/restore_birdid_${DATE}"

# --- Require sudo/root ---
if [[ $EUID -ne 0 ]]; then
  echo "Please run with sudo:   sudo bash restore_site.sh [backup.zip]"
  exit 1
fi

# --- Pick backup file (arg or latest) ---
BACKUP_ZIP="${1:-}"
if [[ -z "$BACKUP_ZIP" ]]; then
  BACKUP_ZIP=$(ls -1t "$BACKUP_DIR"/birdid-site-backup-*.zip 2>/dev/null | head -n 1 || true)
fi
if [[ -z "$BACKUP_ZIP" || ! -f "$BACKUP_ZIP" ]]; then
  echo "No backup zip found. Looked for: $BACKUP_DIR/birdid-site-backup-*.zip"
  echo "Or provide a file: sudo bash restore_site.sh /path/to/backup.zip"
  exit 1
fi

echo ">>> Using backup: $BACKUP_ZIP"
echo ">>> Restoring to: $SITE_DIR"
echo ">>> Temp folder:  $TMPDIR"
mkdir -p "$TMPDIR"

# --- Was the service running? ---
WAS_ACTIVE="no"
if systemctl is-active --quiet "$SERVICE"; then
  WAS_ACTIVE="yes"
  echo ">>> Stopping $SERVICE ..."
  systemctl stop "$SERVICE"
fi

# --- Safety backup of current site ---
PRE_BACKUP="/home/srking/backups/pre-restore-$DATE.zip"
echo ">>> Creating safety snapshot of current site at: $PRE_BACKUP"
( cd / && zip -r "$PRE_BACKUP" "$SITE_DIR" > /dev/null )

# --- Extract backup into temp ---
echo ">>> Extracting backup into temp ..."
unzip -q "$BACKUP_ZIP" -d "$TMPDIR"

# The original backup used an absolute path (/home/srking/birdid-site),
# so after unzip we expect: $TMPDIR/home/srking/birdid-site/
EXTRACTED="$TMPDIR/home/srking/birdid-site"
if [[ ! -d "$EXTRACTED" ]]; then
  # Fallback: if the zip was created from inside the folder (relative paths)
  # then the extracted content might be at TMPDIR/* instead.
  echo ">>> Expected $EXTRACTED not found; using TMPDIR as source."
  EXTRACTED="$TMPDIR"
fi

# --- Sync into live folder (delete files removed in backup) ---
echo ">>> Syncing files into $SITE_DIR ..."
rsync -a --delete "$EXTRACTED"/ "$SITE_DIR"/

# --- Ownership & perms ---
echo ">>> Fixing ownership ..."
chown -R srking:srking "$SITE_DIR"

# --- Restart service if it was running ---
if [[ "$WAS_ACTIVE" == "yes" ]]; then
  echo ">>> Starting $SERVICE ..."
  systemctl start "$SERVICE"
fi

# --- Clean up ---
echo ">>> Cleaning up temp ..."
rm -rf "$TMPDIR"

echo ">>> Restore complete."
systemctl status "$SERVICE" --no-pager || true
echo "You can test at: http://$(hostname -I | awk '{print $1}'):8080"
