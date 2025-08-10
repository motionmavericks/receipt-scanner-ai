#!/bin/bash
# Quality Checker Hook - Runs quality checks and triggers appropriate subagents

set -e

# Get the tool and input from stdin
TOOL_DATA=$(cat)
TOOL=$(echo "$TOOL_DATA" | jq -r '.tool_name // ""')
FILE_PATH=$(echo "$TOOL_DATA" | jq -r '.tool_input.file_path // ""')

# Function to trigger subagent based on file type and changes
trigger_subagent() {
    local file_path="$1"
    local file_ext="${file_path##*.}"
    
    # Determine which subagent to trigger
    case "$file_ext" in
        js|ts|jsx|tsx|py|go|rs|java)
            echo "[Quality] File modified: $file_path" >&2
            echo "[Quality] Triggering code-reviewer subagent..." >&2
            
            # Check if tests exist for this file
            test_file="${file_path%.*}.test.${file_ext}"
            spec_file="${file_path%.*}.spec.${file_ext}"
            
            if [ ! -f "$test_file" ] && [ ! -f "$spec_file" ]; then
                echo "[Quality] No tests found. Triggering test-writer subagent..." >&2
            fi
            ;;
        md)
            echo "[Quality] Documentation modified: $file_path" >&2
            echo "[Quality] Checking documentation quality..." >&2
            ;;
        *)
            echo "[Quality] File modified: $file_path" >&2
            ;;
    esac
}

# Function to check code complexity
check_complexity() {
    local file_path="$1"
    local file_ext="${file_path##*.}"
    
    case "$file_ext" in
        js|ts)
            if command -v npx >/dev/null 2>&1; then
                complexity=$(npx complexity-report "$file_path" 2>/dev/null | grep -E "Cyclomatic:" | head -1 | awk '{print $2}' || echo "0")
                if [ "$complexity" -gt "10" ]; then
                    echo "[Quality] High complexity detected (${complexity}). Consider refactoring." >&2
                    echo "[Quality] Triggering refactoring-expert subagent..." >&2
                fi
            fi
            ;;
        py)
            if command -v radon >/dev/null 2>&1; then
                radon cc "$file_path" -s 2>/dev/null | grep -E "^    [CD-F]" && {
                    echo "[Quality] High complexity detected. Consider refactoring." >&2
                    echo "[Quality] Triggering refactoring-expert subagent..." >&2
                }
            fi
            ;;
    esac
}

# Function to check for security issues
check_security() {
    local file_path="$1"
    local content=$(cat "$file_path" 2>/dev/null || echo "")
    
    # Check for common security patterns
    if echo "$content" | grep -qiE "(api[_-]?key|password|secret|token|private[_-]?key).*=.*['\"]"; then
        echo "[Security] Potential hardcoded secret detected in $file_path" >&2
        echo "[Security] Triggering security-scanner subagent..." >&2
        return 2
    fi
    
    # Check for SQL injection vulnerabilities
    if echo "$content" | grep -qE "(query|execute).*(\+|\.|%).*['\"]"; then
        echo "[Security] Potential SQL injection risk in $file_path" >&2
        echo "[Security] Triggering security-scanner subagent..." >&2
    fi
    
    # Check for XSS vulnerabilities
    if echo "$content" | grep -qE "innerHTML.*=|dangerouslySetInnerHTML"; then
        echo "[Security] Potential XSS vulnerability in $file_path" >&2
        echo "[Security] Triggering security-scanner subagent..." >&2
    fi
}

# Main logic based on tool type
case "$TOOL" in
    Edit|MultiEdit|Write)
        if [ -n "$FILE_PATH" ]; then
            trigger_subagent "$FILE_PATH"
            check_complexity "$FILE_PATH"
            check_security "$FILE_PATH"
        fi
        ;;
    Bash)
        COMMAND=$(echo "$TOOL_DATA" | jq -r '.tool_input.command // ""')
        
        # Check if running tests
        if echo "$COMMAND" | grep -qE "(test|spec)"; then
            echo "[Quality] Test execution detected" >&2
            
            # Check for test failures in output
            if echo "$TOOL_DATA" | jq -r '.output // ""' | grep -qiE "(fail|error)"; then
                echo "[Quality] Test failures detected. Triggering bug-finder subagent..." >&2
            fi
        fi
        
        # Check if running build
        if echo "$COMMAND" | grep -qE "(build|compile)"; then
            echo "[Quality] Build process detected" >&2
            
            # Check for build errors
            if echo "$TOOL_DATA" | jq -r '.output // ""' | grep -qiE "(error|failed)"; then
                echo "[Quality] Build errors detected. Triggering bug-finder subagent..." >&2
            fi
        fi
        ;;
esac

# Log quality check
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Quality check completed for $TOOL: $FILE_PATH" >> .claude/logs/quality-checks.log

exit 0