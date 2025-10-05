# 🧠 TooLoo CLI - Command Line Interface

Execute TooLoo.ai suggestions directly from your terminal!

## 🚀 Quick Start

```bash
# Ask TooLoo to do something
npm run tooloo "create a hello world function"

# Check if API is running
npm run tooloo -- --health

# Interactive mode
npm run tooloo -- --interactive

# Get help
npm run tooloo -- --help
```

## 📋 Installation

The CLI is already installed! Just make sure your API is running:

```bash
npm run dev
```

## 🎯 Usage Examples

### Basic Commands

```bash
# Code generation
npm run tooloo "create a REST API endpoint for users"

# Code analysis
npm run tooloo "analyze my code for security issues"

# Testing
npm run tooloo "generate unit tests for the auth module"

# Explanation
npm run tooloo "explain how the authentication system works"

# Refactoring
npm run tooloo "refactor this function to be more efficient"

# Documentation
npm run tooloo "write JSDoc comments for all functions in user.js"
```

### Interactive Mode

```bash
npm run tooloo -- --interactive
```

Then type your requests one at a time:
```
🧠 TooLoo> create a new component
🧠 TooLoo> optimize database queries
🧠 TooLoo> exit
```

### Health Check

```bash
npm run tooloo -- --health
```

Output:
```
✅ API is healthy
📡 Endpoint: http://localhost:3005
🤖 Providers: 6 configured
⚙️  Default: deepseek

Available providers:
  ✅ Hugging Face (Free)
  ✅ DeepSeek (Code Focus)
  ✅ Claude (Reasoning)
  ✅ GPT-4 (Reliable)
  ✅ Gemini (Creative)
  ✅ Grok (Experimental)
```

## ⚙️ Configuration

### Environment Variables

```bash
# Change API endpoint (default: http://localhost:3005)
export TOOLOO_API_URL=http://localhost:3005

# Choose AI provider (default: deepseek)
export TOOLOO_PROVIDER=claude

# Then use CLI
npm run tooloo "your request"
```

### Available Providers

- **deepseek** - Best for code generation (default)
- **claude** - Best for reasoning and complex logic
- **openai** - Reliable and consistent
- **gemini** - Creative solutions
- **huggingface** - Free tier available
- **grok** - Experimental features

## 🎨 Features

### Code Generation
```bash
npm run tooloo "create a React component for user profile"
npm run tooloo "generate a SQL migration for users table"
npm run tooloo "write a function to validate email addresses"
```

### Code Analysis
```bash
npm run tooloo "find bugs in my authentication code"
npm run tooloo "suggest performance improvements"
npm run tooloo "check for security vulnerabilities"
```

### Testing
```bash
npm run tooloo "generate tests for user.js"
npm run tooloo "create integration tests for the API"
npm run tooloo "write test cases for edge conditions"
```

### Documentation
```bash
npm run tooloo "document the API endpoints"
npm run tooloo "write README for this project"
npm run tooloo "generate JSDoc comments"
```

### Refactoring
```bash
npm run tooloo "refactor this code to use async/await"
npm run tooloo "convert this class to functional component"
npm run tooloo "optimize this algorithm"
```

## 🔧 Troubleshooting

### CLI doesn't work
```bash
# Make sure API is running
npm run dev

# Check API health
npm run tooloo -- --health
```

### Connection errors
```bash
# Verify API endpoint
curl http://localhost:3005/api/v1/health

# Check if port is correct
export TOOLOO_API_URL=http://localhost:3005
```

### No response
```bash
# Try different provider
export TOOLOO_PROVIDER=claude
npm run tooloo "your request"
```

## 📚 Advanced Usage

### Multi-line Prompts

```bash
npm run tooloo "
Create a user authentication system with:
- JWT tokens
- Password hashing
- Email verification
- Rate limiting
"
```

### Piping Output

```bash
# Save response to file
npm run tooloo "generate API documentation" > docs/api.md

# Combine with other commands
npm run tooloo "list all TODO items" | grep "urgent"
```

### Scripting

```bash
#!/bin/bash
# automated-review.sh

echo "Running code review..."
npm run tooloo "analyze code quality in src/"

echo "Checking security..."
npm run tooloo "find security issues"

echo "Generating report..."
npm run tooloo "create summary report"
```

## 🎯 Tips & Best Practices

1. **Be Specific**: "Create a React component with form validation" is better than "make a component"

2. **Provide Context**: Include file names, function names, or relevant details

3. **Use Interactive Mode**: For back-and-forth conversations, use `--interactive`

4. **Choose Right Provider**:
   - Code generation → `deepseek`
   - Complex logic → `claude`
   - Reliable output → `openai`
   - Creative ideas → `gemini`

5. **Check Health First**: Always verify API is running with `--health`

## 📖 Examples Collection

### Frontend Development
```bash
npm run tooloo "create a responsive navbar with React"
npm run tooloo "add form validation with Yup"
npm run tooloo "optimize React rendering performance"
```

### Backend Development
```bash
npm run tooloo "create Express middleware for auth"
npm run tooloo "design database schema for e-commerce"
npm run tooloo "implement caching with Redis"
```

### DevOps
```bash
npm run tooloo "create Dockerfile for Node.js app"
npm run tooloo "write CI/CD pipeline for GitHub Actions"
npm run tooloo "setup nginx reverse proxy config"
```

### Testing
```bash
npm run tooloo "write unit tests with Vitest"
npm run tooloo "create E2E tests with Playwright"
npm run tooloo "generate test data fixtures"
```

## 🤝 Integration

### VS Code Tasks

Add to `.vscode/tasks.json`:
```json
{
  "label": "Ask TooLoo",
  "type": "shell",
  "command": "npm run tooloo",
  "args": ["${input:prompt}"]
}
```

### Shell Alias

Add to `.bashrc` or `.zshrc`:
```bash
alias ask="npm run tooloo --"
```

Then use:
```bash
ask "create a function"
ask --health
ask --interactive
```

---

**Happy coding with TooLoo CLI! 🚀**

For more information, visit: http://localhost:5173
