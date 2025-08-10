#!/bin/bash
# Subagent Coordinator - Intelligently triggers subagents based on context

set -e

# Parse input
INPUT=$(cat)
EVENT_TYPE="${1:-PreToolUse}"
TOOL=$(echo "$INPUT" | jq -r '.tool_name // ""')

# Function to analyze context and determine which subagent to trigger
analyze_context() {
    local context="$1"
    local recommended_agents=""
    
    # Check for error patterns
    if echo "$context" | grep -qiE "(error|exception|fail|crash|bug)"; then
        recommended_agents="$recommended_agents bug-finder"
    fi
    
    # Check for performance issues
    if echo "$context" | grep -qiE "(slow|performance|optimize|latency|memory)"; then
        recommended_agents="$recommended_agents performance-optimizer"
    fi
    
    # Check for security concerns
    if echo "$context" | grep -qiE "(security|vulnerability|auth|password|token|encrypt)"; then
        recommended_agents="$recommended_agents security-scanner"
    fi
    
    # Check for test-related tasks
    if echo "$context" | grep -qiE "(test|spec|coverage|unit|integration)"; then
        recommended_agents="$recommended_agents test-writer"
    fi
    
    # Check for documentation needs
    if echo "$context" | grep -qiE "(document|readme|api|comment|explain)"; then
        recommended_agents="$recommended_agents documentation-expert"
    fi
    
    # Check for refactoring needs
    if echo "$context" | grep -qiE "(refactor|clean|improve|simplify|restructure)"; then
        recommended_agents="$recommended_agents refactoring-expert"
    fi
    
    echo "$recommended_agents"
}

# Function to check if subagent should be triggered
should_trigger_subagent() {
    local tool="$1"
    local file_path="$2"
    local command="$3"
    
    # After file modifications, trigger code-reviewer
    if [[ "$tool" =~ (Edit|MultiEdit|Write) ]] && [ -n "$file_path" ]; then
        echo "code-reviewer"
        return 0
    fi
    
    # After test failures, trigger bug-finder
    if [[ "$command" =~ test ]] && echo "$INPUT" | jq -r '.output // ""' | grep -qiE "fail"; then
        echo "bug-finder"
        return 0
    fi
    
    # After security-related files are modified
    if [[ "$file_path" =~ (auth|login|security|crypto) ]]; then
        echo "security-scanner"
        return 0
    fi
    
    return 1
}

# Function to log subagent recommendation
log_subagent_recommendation() {
    local agent="$1"
    local reason="$2"
    
    echo "[Coordinator] Recommended subagent: $agent" >&2
    echo "[Coordinator] Reason: $reason" >&2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Recommended: $agent - $reason" >> .claude/logs/subagent-recommendations.log
}

# Main coordination logic
case "$EVENT_TYPE" in
    PreToolUse)
        # Analyze the tool being used
        case "$TOOL" in
            Edit|MultiEdit|Write)
                FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
                
                # Check file type and recommend appropriate subagent
                if [[ "$FILE_PATH" =~ \.test\.|\.spec\. ]]; then
                    log_subagent_recommendation "test-writer" "Test file modification"
                elif [[ "$FILE_PATH" =~ \.(md|rst|txt)$ ]]; then
                    log_subagent_recommendation "documentation-expert" "Documentation file"
                else
                    log_subagent_recommendation "code-reviewer" "Code file modification"
                fi
                ;;
            
            Bash)
                COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
                
                # Analyze command intent
                if [[ "$COMMAND" =~ (npm|yarn|pnpm).*(test|spec) ]]; then
                    log_subagent_recommendation "test-writer" "Test execution command"
                elif [[ "$COMMAND" =~ (build|compile|bundle) ]]; then
                    log_subagent_recommendation "code-reviewer" "Build command"
                elif [[ "$COMMAND" =~ (deploy|docker|kubectl) ]]; then
                    log_subagent_recommendation "security-scanner" "Deployment command"
                fi
                ;;
        esac
        ;;
    
    PostToolUse)
        # Analyze results and recommend follow-up subagents
        OUTPUT=$(echo "$INPUT" | jq -r '.output // ""')
        
        if echo "$OUTPUT" | grep -qiE "(error|exception)"; then
            log_subagent_recommendation "bug-finder" "Error detected in output"
        fi
        
        if echo "$OUTPUT" | grep -qiE "test.*fail"; then
            log_subagent_recommendation "bug-finder" "Test failure detected"
        fi
        
        if echo "$OUTPUT" | grep -qiE "vulnerability|cve-"; then
            log_subagent_recommendation "security-scanner" "Security issue detected"
        fi
        ;;
    
    SubagentStop)
        # Log subagent completion and recommend next steps
        SUBAGENT=$(echo "$INPUT" | jq -r '.subagent_name // ""')
        
        case "$SUBAGENT" in
            code-reviewer)
                log_subagent_recommendation "test-writer" "Post-review: Ensure test coverage"
                ;;
            bug-finder)
                log_subagent_recommendation "test-writer" "Post-fix: Add regression tests"
                ;;
            refactoring-expert)
                log_subagent_recommendation "test-writer" "Post-refactor: Verify tests pass"
                log_subagent_recommendation "code-reviewer" "Post-refactor: Review changes"
                ;;
            test-writer)
                log_subagent_recommendation "code-reviewer" "Post-test: Review test quality"
                ;;
        esac
        ;;
esac

# Analyze general context for subagent recommendations
CONTEXT=$(echo "$INPUT" | jq -r '.context // ""')
if [ -n "$CONTEXT" ]; then
    RECOMMENDED_AGENTS=$(analyze_context "$CONTEXT")
    if [ -n "$RECOMMENDED_AGENTS" ]; then
        for agent in $RECOMMENDED_AGENTS; do
            log_subagent_recommendation "$agent" "Context analysis"
        done
    fi
fi

exit 0