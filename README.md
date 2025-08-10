# Claude Code Project Template

A comprehensive template for starting new projects with Claude Code (claude.ai/code) pre-configured with best practices, automation, and AI-powered development tools.

## Features

### 🤖 AI-Powered Development
- **7 Specialized AI Agents**: Code review, test generation, debugging, security scanning, performance optimization, refactoring, and documentation
- **Intelligent Context Management**: Optimized for 200k token windows with automatic memory management
- **GitHub Actions Integration**: Automated PR reviews, issue-to-PR conversion, and test fixing

### 🔧 Automation & Hooks
- **Pre/Post Tool Hooks**: Automatic code formatting, validation, and security checks
- **Protected Files**: Automatic protection of sensitive files (.env, .git, etc.)
- **Activity Logging**: Complete audit trail of all operations

### 📁 Project Structure
```
.claude/
├── agents/         # AI agent configurations
├── hooks/          # Automation hook definitions
├── logs/           # Activity logs
└── memory/         # Context management
```

## Quick Start

### Using as a Template

1. **Clone this repository**:
   ```bash
   git clone <repository-url> my-new-project
   cd my-new-project
   ```

2. **Remove the existing git history** (optional):
   ```bash
   rm -rf .git
   git init
   ```

3. **Initialize your project framework**:
   ```bash
   # For Node.js
   npm init -y
   
   # For Python
   python -m venv venv
   
   # For Go
   go mod init myproject
   ```

4. **Update CLAUDE.md** with your project-specific commands:
   - Add build commands
   - Add test commands
   - Add lint commands
   - Document project architecture

### GitHub Template Repository

To use this as a GitHub template:

1. Push this repository to GitHub
2. Go to Settings > General
3. Check "Template repository"
4. Others can then use the "Use this template" button

## Claude Code Commands

- `/clear` - Start fresh for new tasks
- `/compact` - Reduce context at milestones
- `/agents` - View and use available AI agents
- `/hooks` - Configure automation
- `/init` - Initialize Claude Code for your project

## Configuration Files

### CLAUDE.md
The main configuration file that guides Claude Code's behavior in your project. It includes:
- Development commands
- Architecture documentation
- Tool usage patterns
- Security constraints

### Agent Configurations
Located in `.claude/agents/`, these define specialized AI behaviors for:
- Code reviews
- Test generation
- Bug finding
- Security scanning
- Performance optimization
- Refactoring
- Documentation

### Hook Definitions
Located in `.claude/hooks/`, these automate:
- Code formatting (Prettier, Black, gofmt)
- Security validation
- File protection
- Command logging

## Best Practices

1. **Keep CLAUDE.md Updated**: Document project-specific commands and architecture
2. **Use Agents Proactively**: Let AI agents handle repetitive tasks
3. **Configure Hooks Early**: Set up automation before writing code
4. **Regular Context Management**: Use `/clear` and `/compact` to maintain performance

## Security Features

- **No Hardcoded Secrets**: Automatic detection and prevention
- **Protected File Access**: Critical files are automatically protected
- **Audit Logging**: All operations are logged for security review
- **Security Scanner Agent**: Proactive vulnerability detection

## Contributing

Feel free to submit issues and enhancement requests!

## License

[Your License Here]

---

*Built for Claude Code (claude.ai/code) - AI-powered software development at its best*