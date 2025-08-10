# Claude Code Agents

This directory contains specialized AI agents for different development tasks.

## Available Agents

- **code-reviewer**: Performs comprehensive code reviews focusing on quality, security, and best practices
- **test-writer**: Generates comprehensive test suites for new and existing code
- **bug-finder**: Analyzes code for bugs and provides debugging assistance
- **security-scanner**: Scans for security vulnerabilities and compliance issues
- **performance-optimizer**: Identifies and fixes performance bottlenecks
- **refactoring-expert**: Improves code structure and applies design patterns
- **documentation-expert**: Creates and maintains technical documentation

## Usage

Agents can be invoked:
1. Automatically by hooks when certain events occur
2. Manually via the `/agents` command
3. By mentioning them in your request (e.g., "Use the code-reviewer agent to check this")

## Adding Custom Agents

To add a new agent, create a `.json` file in this directory with the agent configuration.