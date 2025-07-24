#!/bin/bash

# jQuery Rollback Script - Restore jQuery files from backups
# This script restores jQuery files from the backup directories created during upgrade

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPOS_DIR="$SCRIPT_DIR/repos"
LOG_FILE="$SCRIPT_DIR/rollback.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

# Find backup directories
find_backups() {
    local repo_path="$1"
    find "$repo_path" -name ".jquery-backup-*" -type d 2>/dev/null | sort
}

# Restore from backup
restore_from_backup() {
    local repo_path="$1"
    local backup_dir="$2"
    local repo_name=$(basename "$repo_path")
    
    log "Restoring jQuery files in $repo_name from $backup_dir"
    
    # Find all files in backup directory
    find "$backup_dir" -type f -name "jquery*.js" -o -name "jquery*.min.js" 2>/dev/null | while read backup_file; do
        # Calculate the original path
        local backup_rel_path="${backup_file#$backup_dir/}"
        local original_file="$repo_path/$backup_rel_path"
        local original_dir=$(dirname "$original_file")
        
        # Create directory if it doesn't exist
        mkdir -p "$original_dir"
        
        # Restore the file
        cp "$backup_file" "$original_file"
        log "Restored: $backup_rel_path"
    done
    
    log "Completed restoration for $repo_name"
}

# Main execution
main() {
    log "Starting jQuery rollback process"
    
    local total_restored=0
    
    # Process each repository
    for repo in "$REPOS_DIR"/*; do
        if [[ -d "$repo" ]] && [[ "$(basename "$repo")" != "docs" ]]; then
            local repo_name=$(basename "$repo")
            local backups=$(find_backups "$repo")
            
            if [[ -n "$backups" ]]; then
                log "Found backup directories in $repo_name:"
                echo "$backups" | while read backup; do
                    echo "  - $backup"
                done
                
                # Use the most recent backup
                local latest_backup=$(echo "$backups" | tail -1)
                if [[ -n "$latest_backup" ]]; then
                    restore_from_backup "$repo" "$latest_backup"
                    total_restored=$((total_restored + 1))
                fi
            else
                log "No backup directories found in $repo_name"
            fi
        fi
    done
    
    log "Rollback completed! Restored jQuery files in $total_restored repositories"
    log "Check the log file at: $LOG_FILE"
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -l, --list     List all backup directories without restoring"
    echo "  -r, --repo     Restore specific repository (provide repo name)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Restore all repositories"
    echo "  $0 --list            # List all backup directories"
    echo "  $0 --repo card-issuance-web  # Restore specific repository"
}

# List backup directories
list_backups() {
    log "Listing all backup directories:"
    
    for repo in "$REPOS_DIR"/*; do
        if [[ -d "$repo" ]] && [[ "$(basename "$repo")" != "docs" ]]; then
            local repo_name=$(basename "$repo")
            local backups=$(find_backups "$repo")
            
            if [[ -n "$backups" ]]; then
                echo "Repository: $repo_name"
                echo "$backups" | while read backup; do
                    echo "  - $backup"
                done
                echo ""
            fi
        fi
    done
}

# Restore specific repository
restore_specific_repo() {
    local target_repo="$1"
    local repo_path="$REPOS_DIR/$target_repo"
    
    if [[ ! -d "$repo_path" ]]; then
        error "Repository not found: $target_repo"
        exit 1
    fi
    
    local backups=$(find_backups "$repo_path")
    
    if [[ -z "$backups" ]]; then
        error "No backup directories found for $target_repo"
        exit 1
    fi
    
    local latest_backup=$(echo "$backups" | tail -1)
    restore_from_backup "$repo_path" "$latest_backup"
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        usage
        exit 0
        ;;
    -l|--list)
        list_backups
        exit 0
        ;;
    -r|--repo)
        if [[ -z "$2" ]]; then
            error "Repository name required for --repo option"
            usage
            exit 1
        fi
        restore_specific_repo "$2"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        error "Unknown option: $1"
        usage
        exit 1
        ;;
esac 