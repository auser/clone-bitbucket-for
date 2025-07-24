#!/bin/bash

# jQuery Upgrade Analyzer - Analyze all repositories for jQuery usage patterns
# This script runs before the main upgrade to identify what needs to be updated

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPOS_DIR="$SCRIPT_DIR/repos"
REPORT_FILE="$SCRIPT_DIR/jquery-analysis-report.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Initialize report
init_report() {
    cat > "$REPORT_FILE" << EOF
jQuery Upgrade Analysis Report
Generated: $(date)
Target Version: 3.7.1

This report identifies jQuery usage patterns across all repositories and provides
recommendations for upgrading to jQuery 3.7.1.

================================================================================

EOF
}

# Add section to report
add_section() {
    echo -e "\n$1\n" >> "$REPORT_FILE"
    echo "$1"
}

# Add content to report
add_content() {
    echo "$1" >> "$REPORT_FILE"
}

# Analyze a single repository
analyze_repository() {
    local repo_path="$1"
    local repo_name=$(basename "$repo_path")
    
    if [[ ! -d "$repo_path" ]]; then
        return 1
    fi
    
    log "Analyzing repository: $repo_name"
    
    # Check for jQuery files
    local jquery_files=$(find "$repo_path" -name "jquery*.js" -o -name "jquery*.min.js" 2>/dev/null | sort)
    local dependency_files=$(find "$repo_path" -name "package.json" -o -name "pom.xml" -o -name "build.gradle" -o -name "ivy.xml" -o -name "*.gemspec" 2>/dev/null | sort)
    
    if [[ -z "$jquery_files" ]] && ! echo "$dependency_files" | xargs grep -l "jquery" 2>/dev/null | grep -q .; then
        log "No jQuery usage found in $repo_name"
        return 0
    fi
    
    add_section "Repository: $repo_name"
    
    # Analyze embedded jQuery files
    if [[ -n "$jquery_files" ]]; then
        add_content "Embedded jQuery Files:"
        echo "$jquery_files" | while read file; do
            local rel_path="${file#$repo_path/}"
            local filename=$(basename "$file")
            
            # Extract version
            local version="unknown"
            if [[ "$filename" =~ jquery-([0-9]+\.[0-9]+\.[0-9]+) ]]; then
                version="${BASH_REMATCH[1]}"
            elif [[ "$filename" =~ jquery-ui-([0-9]+\.[0-9]+\.[0-9]+) ]]; then
                version="UI-${BASH_REMATCH[1]}"
            fi
            
            add_content "  - $rel_path (version: $version)"
            
            # Check for deprecated methods in this file (simplified)
            if grep -q "\.live(\|\.die(\|\.bind(\|\.unbind(\|\.delegate(\|\.undelegate(\|\.size(\|\.andSelf(\|jQuery\.browser\|jQuery\.support" "$file" 2>/dev/null; then
                add_content "    WARNING: Contains deprecated jQuery methods"
            fi
        done
    fi
    
    # Analyze dependency files
    if [[ -n "$dependency_files" ]]; then
        add_content "Dependency Files:"
        echo "$dependency_files" | while read file; do
            if grep -q "jquery" "$file" 2>/dev/null; then
                local rel_path="${file#$repo_path/}"
                add_content "  - $rel_path"
                
                # Extract jQuery version from dependency file
                local dep_version=$(grep -o "jquery.*[0-9]\+\.[0-9]\+\.[0-9]\+" "$file" 2>/dev/null | head -1 | grep -o "[0-9]\+\.[0-9]\+\.[0-9]\+" || echo "unknown")
                if [[ "$dep_version" != "unknown" ]]; then
                    add_content "    Current version: $dep_version"
                fi
            fi
        done
    fi
    
    # Check for compatibility issues
    add_content "Compatibility Analysis:"
    
    # Look for deprecated methods in all JS/HTML files
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
        local files_with_method=$(find "$repo_path" -name "*.js" -o -name "*.html" -o -name "*.jsp" -o -name "*.jspf" 2>/dev/null | xargs grep -l "$method" 2>/dev/null | wc -l)
        if [[ "$files_with_method" -gt 0 ]]; then
            add_content "  - $method: Found in $files_with_method files"
        fi
    done
    
    # Check for jQuery plugins
    local plugins=$(find "$repo_path" -name "jquery*.js" -o -name "jquery*.min.js" 2>/dev/null | grep -v "jquery-[0-9]" | grep -v "jquery-ui" | sort)
    if [[ -n "$plugins" ]]; then
        add_content "jQuery Plugins:"
        echo "$plugins" | while read plugin; do
            local rel_path="${plugin#$repo_path/}"
            add_content "  - $rel_path"
        done
    fi
    
    add_content "Upgrade Recommendations:"
    add_content "  1. Backup all jQuery files before upgrading"
    add_content "  2. Replace embedded jQuery files with version 3.7.1"
    add_content "  3. Update jQuery UI to version 1.13.2"
    add_content "  4. Test jQuery plugins for compatibility"
    add_content "  5. Update dependency files if present"
    
    add_content ""
    add_content "================================================================================"
}

# Main execution
main() {
    log "Starting jQuery usage analysis across all repositories"
    
    # Initialize report
    init_report
    
    # Add summary section
    add_section "EXECUTIVE SUMMARY"
    add_content "This analysis covers all repositories in the repos/ directory."
    add_content "Each repository is analyzed for:"
    add_content "- Embedded jQuery files and their versions"
    add_content "- Dependency file references to jQuery"
    add_content "- jQuery plugins in use"
    add_content "- Deprecated jQuery methods that need attention"
    add_content "- Upgrade recommendations"
    
    # Analyze each repository
    local total_repos=0
    local repos_with_jquery=0
    
    for repo in "$REPOS_DIR"/*; do
        if [[ -d "$repo" ]] && [[ "$(basename "$repo")" != "docs" ]]; then
            total_repos=$((total_repos + 1))
            if analyze_repository "$repo"; then
                repos_with_jquery=$((repos_with_jquery + 1))
            fi
        fi
    done
    
    # Add final summary
    add_section "FINAL SUMMARY"
    add_content "Total repositories analyzed: $total_repos"
    add_content "Repositories with jQuery usage: $repos_with_jquery"
    add_content "Repositories without jQuery: $((total_repos - repos_with_jquery))"
    add_content ""
    add_content "Next steps:"
    add_content "1. Review this report for any critical compatibility issues"
    add_content "2. Run the jquery-upgrade-script.sh to perform the actual upgrade"
    add_content "3. Test each upgraded application thoroughly"
    add_content "4. Address any deprecated method warnings before deployment"
    
    log "Analysis completed! Report saved to: $REPORT_FILE"
    log "Repositories with jQuery: $repos_with_jquery out of $total_repos"
}

# Run main function
main "$@" 