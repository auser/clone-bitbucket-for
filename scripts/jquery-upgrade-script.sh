#!/bin/bash

# jQuery Upgrade Script - Upgrade all repositories to jQuery 3.7.1
# This script handles various jQuery usage patterns across different project types

set -e

# Configuration
JQUERY_VERSION="3.7.1"
JQUERY_UI_VERSION="1.13.2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPOS_DIR="$SCRIPT_DIR/repos"
TEMP_DIR="$SCRIPT_DIR/temp"
LOG_FILE="$SCRIPT_DIR/upgrade.log"

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

# Create temp directory
mkdir -p "$TEMP_DIR"

# Download jQuery files
download_jquery() {
    log "Downloading jQuery $JQUERY_VERSION files..."
    
    cd "$TEMP_DIR"
    
    # Download jQuery core
    curl -L -o "jquery-$JQUERY_VERSION.min.js" \
        "https://code.jquery.com/jquery-$JQUERY_VERSION.min.js"
    
    # Download jQuery UI
    curl -L -o "jquery-ui-$JQUERY_UI_VERSION.custom.min.js" \
        "https://code.jquery.com/ui/$JQUERY_UI_VERSION/jquery-ui.min.js"
    
    # Download jQuery UI CSS
    curl -L -o "jquery-ui-$JQUERY_UI_VERSION.custom.min.css" \
        "https://code.jquery.com/ui/$JQUERY_UI_VERSION/themes/base/jquery-ui.min.css"
    
    # Download jQuery plugins that are commonly used
    curl -L -o "jquery.validate.min.js" \
        "https://cdnjs.cloudflare.com/ajax/libs/jquery-validate/1.20.0/jquery.validate.min.js"
    
    curl -L -o "jquery.form.min.js" \
        "https://cdnjs.cloudflare.com/ajax/libs/jquery.form/4.3.0/jquery.form.min.js"
    
    curl -L -o "jquery.maskedinput.min.js" \
        "https://cdnjs.cloudflare.com/ajax/libs/jquery.maskedinput/1.4.1/jquery.maskedinput.min.js"
    
    log "Download completed"
}

# Check if a repository has jQuery files
has_jquery_files() {
    local repo_path="$1"
    
    # Look for common jQuery file patterns
    if find "$repo_path" -name "jquery*.js" -o -name "jquery*.min.js" 2>/dev/null | grep -q .; then
        return 0
    fi
    
    # Look for jQuery in dependency files
    if find "$repo_path" -name "package.json" -o -name "pom.xml" -o -name "build.gradle" -o -name "ivy.xml" -o -name "*.gemspec" 2>/dev/null | xargs grep -l "jquery" 2>/dev/null | grep -q .; then
        return 0
    fi
    
    return 1
}

# Get jQuery version from a file
get_jquery_version() {
    local file="$1"
    
    # Try to extract version from filename first
    if [[ "$file" =~ jquery-([0-9]+\.[0-9]+\.[0-9]+) ]]; then
        echo "${BASH_REMATCH[1]}"
        return 0
    fi
    
    # Try to extract from file content
    local version=$(grep -o "jQuery v[0-9]\+\.[0-9]\+\.[0-9]\+" "$file" 2>/dev/null | head -1 | sed 's/jQuery v//')
    if [[ -n "$version" ]]; then
        echo "$version"
        return 0
    fi
    
    echo "unknown"
}

# Backup original files
backup_files() {
    local repo_path="$1"
    local backup_dir="$repo_path/.jquery-backup-$(date +%Y%m%d-%H%M%S)"
    
    mkdir -p "$backup_dir"
    
    # Find and backup all jQuery files
    find "$repo_path" -name "jquery*.js" -o -name "jquery*.min.js" 2>/dev/null | while read file; do
        if [[ -f "$file" ]]; then
            local rel_path="${file#$repo_path/}"
            local backup_path="$backup_dir/$(dirname "$rel_path")"
            mkdir -p "$backup_path"
            cp "$file" "$backup_path/"
            log "Backed up: $rel_path"
        fi
    done
    
    echo "$backup_dir"
}

# Replace jQuery files in a repository
replace_jquery_files() {
    local repo_path="$1"
    local backup_dir="$2"
    
    log "Processing repository: $(basename "$repo_path")"
    
    # Find all jQuery files
    find "$repo_path" -name "jquery*.js" -o -name "jquery*.min.js" 2>/dev/null | while read file; do
        if [[ -f "$file" ]]; then
            local filename=$(basename "$file")
            local dirname=$(dirname "$file")
            local rel_path="${file#$repo_path/}"
            
            case "$filename" in
                jquery-*.min.js)
                    # Main jQuery file
                    local old_version=$(get_jquery_version "$file")
                    log "Replacing jQuery $old_version with $JQUERY_VERSION in $rel_path"
                    cp "$TEMP_DIR/jquery-$JQUERY_VERSION.min.js" "$file"
                    ;;
                jquery-ui-*.min.js)
                    # jQuery UI file
                    log "Replacing jQuery UI with $JQUERY_UI_VERSION in $rel_path"
                    cp "$TEMP_DIR/jquery-ui-$JQUERY_UI_VERSION.custom.min.js" "$file"
                    ;;
                jquery.validate.min.js)
                    # jQuery Validate plugin
                    log "Updating jQuery Validate plugin in $rel_path"
                    cp "$TEMP_DIR/jquery.validate.min.js" "$file"
                    ;;
                jquery.form.min.js)
                    # jQuery Form plugin
                    log "Updating jQuery Form plugin in $rel_path"
                    cp "$TEMP_DIR/jquery.form.min.js" "$file"
                    ;;
                jquery.maskedinput*.min.js)
                    # jQuery Masked Input plugin
                    log "Updating jQuery Masked Input plugin in $rel_path"
                    cp "$TEMP_DIR/jquery.maskedinput.min.js" "$file"
                    ;;
                *)
                    warn "Unknown jQuery file: $rel_path - skipping"
                    ;;
            esac
        fi
    done
}

# Update dependency files
update_dependencies() {
    local repo_path="$1"
    
    # Update package.json files
    find "$repo_path" -name "package.json" 2>/dev/null | while read file; do
        if grep -q "jquery" "$file" 2>/dev/null; then
            log "Updating jQuery dependency in $file"
            # Use sed to update jQuery version
            sed -i.bak "s/\"jquery\": \"[^\"]*\"/\"jquery\": \"^$JQUERY_VERSION\"/g" "$file"
            sed -i.bak "s/\"jquery\": \"[0-9]\+\.[0-9]\+\.[0-9]\+\"/\"jquery\": \"$JQUERY_VERSION\"/g" "$file"
        fi
    done
    
    # Update pom.xml files
    find "$repo_path" -name "pom.xml" 2>/dev/null | while read file; do
        if grep -q "jquery" "$file" 2>/dev/null; then
            log "Updating jQuery dependency in $file"
            # This would need more sophisticated XML parsing for production use
            warn "Manual review needed for pom.xml: $file"
        fi
    done
    
    # Update build.gradle files
    find "$repo_path" -name "build.gradle" 2>/dev/null | while read file; do
        if grep -q "jquery" "$file" 2>/dev/null; then
            log "Updating jQuery dependency in $file"
            warn "Manual review needed for build.gradle: $file"
        fi
    done
    
    # Update ivy.xml files
    find "$repo_path" -name "ivy.xml" 2>/dev/null | while read file; do
        if grep -q "jquery" "$file" 2>/dev/null; then
            log "Updating jQuery dependency in $file"
            warn "Manual review needed for ivy.xml: $file"
        fi
    done
}

# Check for compatibility issues
check_compatibility() {
    local repo_path="$1"
    
    log "Checking for potential compatibility issues in $(basename "$repo_path")"
    
    # Look for deprecated jQuery methods
    local deprecated_methods=(
        "\.live\("
        "\.die\("
        "\.bind\("
        "\.unbind\("
        "\.delegate\("
        "\.undelegate\("
        "\.size\("
        "\.andSelf\("
        "jQuery\.browser"
        "jQuery\.support"
    )
    
    for method in "${deprecated_methods[@]}"; do
        local found_files=$(find "$repo_path" -name "*.js" -o -name "*.html" -o -name "*.jsp" 2>/dev/null | xargs grep -l "$method" 2>/dev/null | head -5)
        if [[ -n "$found_files" ]]; then
            warn "Found deprecated jQuery method '$method' in $(basename "$repo_path")"
        fi
    done
}

# Main processing function
process_repository() {
    local repo_path="$1"
    
    if [[ ! -d "$repo_path" ]]; then
        warn "Repository does not exist: $repo_path"
        return 1
    fi
    
    if ! has_jquery_files "$repo_path"; then
        log "No jQuery files found in $(basename "$repo_path") - skipping"
        return 0
    fi
    
    log "Processing repository: $(basename "$repo_path")"
    
    # Create backup
    local backup_dir=$(backup_files "$repo_path")
    log "Backup created at: $backup_dir"
    
    # Replace jQuery files
    replace_jquery_files "$repo_path" "$backup_dir"
    
    # Update dependencies
    update_dependencies "$repo_path"
    
    # Check compatibility
    check_compatibility "$repo_path"
    
    log "Completed processing: $(basename "$repo_path")"
}

# Main execution
main() {
    log "Starting jQuery upgrade to version $JQUERY_VERSION"
    
    # Download jQuery files
    download_jquery
    
    # Process each repository
    for repo in "$REPOS_DIR"/*; do
        if [[ -d "$repo" ]] && [[ "$(basename "$repo")" != "docs" ]]; then
            process_repository "$repo"
        fi
    done
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    
    log "jQuery upgrade completed!"
    log "Check the log file at: $LOG_FILE"
    log "Backups are stored in .jquery-backup-* directories in each repository"
}

# Run main function
main "$@" 