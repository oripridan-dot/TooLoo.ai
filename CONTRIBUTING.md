# Contributing to TooLoo.ai

Thank you for your interest in contributing to TooLoo.ai! This document provides guidelines and information for contributors.

## 🚀 Quick Start

1. **Fork** the repository on GitHub
2. **Clone** your fork locally: `git clone https://github.com/your-username/TooLoo.ai.git`
3. **Set up** the development environment:
   ```bash
   cd TooLoo.ai
   npm install
   cp .env.example .env  # Configure your API keys
   ```
4. **Start developing**:
   ```bash
   npm run dev  # Launches all services
   # Visit http://127.0.0.1:3000/control-room
   ```

## 🛠️ Development Workflow

### Branching Strategy
- Use `feature/` prefix for new features
- Use `fix/` prefix for bug fixes
- Use `docs/` prefix for documentation updates
- Base branches on `main` unless working on a specific release

### Code Quality Standards

#### Linting & Formatting
```bash
npm run lint        # Check for linting issues
npm run lint:fix    # Auto-fix linting issues
npm run format      # Format code with Prettier
npm run format:check # Check formatting without changes
```

#### Testing
```bash
npm test              # Run all tests
npm run test:unit     # Run unit tests only
npm run test:integration # Run integration tests
```

#### Before Committing
```bash
npm run lint:fix
npm run format
npm test
```

### Service Architecture

TooLoo.ai uses a microservices architecture. Each service runs on its own port:

- **Web Server** (3000): UI proxy and static assets
- **Training Server** (3001): AI training and learning
- **Meta Server** (3002): Meta-learning and boosts
- **Budget Server** (3003): Provider management
- **Coach Server** (3004): Auto-coaching features
- **Cup Server** (3005): Provider tournaments
- **Orchestrator** (3123): Service coordination

### API Guidelines

- Use RESTful conventions
- Include comprehensive error handling
- Provide health check endpoints (`/health`)
- Document endpoints with OpenAPI/Swagger when possible

### UI Development

- Maintain responsive design principles
- Follow the existing design system
- Test across different browsers
- Ensure accessibility compliance

## 🧪 Testing

### Unit Tests
- Place test files in `tests/` directory
- Use `vitest` as the test runner
- Follow the naming convention: `*.test.js`

### Integration Tests
- Test API endpoints and service interactions
- Use the `tests/api/` directory
- Ensure services are running before integration tests

### Manual Testing
- Test the full application flow
- Verify cross-service communication
- Check error handling and edge cases

## 📝 Pull Request Process

1. **Create** a feature branch from `main`
2. **Implement** your changes with tests
3. **Ensure** all checks pass:
   - Linting: `npm run lint`
   - Formatting: `npm run format:check`
   - Tests: `npm test`
4. **Update** documentation if needed
5. **Submit** a pull request with:
   - Clear description of changes
   - Reference to any related issues
   - Screenshots for UI changes

## 🐛 Reporting Issues

When reporting bugs, please include:
- Steps to reproduce
- Expected vs. actual behavior
- Browser/OS information
- Console errors or logs
- Screenshots if applicable

## 📚 Documentation

- Update README.md for significant changes
- Document new API endpoints
- Include code comments for complex logic
- Update configuration examples

## 🎉 Recognition

Contributors will be recognized in the project documentation and release notes. Thank you for helping make TooLoo.ai better!