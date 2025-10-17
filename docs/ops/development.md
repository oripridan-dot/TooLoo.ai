# TooLoo.ai Development Runbook

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Initial Setup
```bash
git clone <repository>
cd TooLoo.ai
npm install
```

### Start Development Server
```bash
# Start API server
cd api/server
node main.js

# Dashboard available at: http://localhost:3001/dashboard
```

### Run Tests
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Benchmark suite
npm run benchmark
```

## Development Workflow

### Adding New Skills
1. Create skill module in `api/skills/`
2. Implement skill interface with confidence scoring
3. Add unit tests and integration tests
4. Add benchmark dataset if applicable
5. Update API routes to expose skill
6. Document inputs, outputs, and error conditions

Example skill structure:
```javascript
// api/skills/my-skill.js
export async function processSkill(input, options = {}) {
  // Validate input
  if (!input) throw new Error('Input required');
  
  // Process with confidence scoring
  const result = await process(input);
  const confidence = calculateConfidence(result);
  
  return {
    output: result,
    confidence,
    metadata: { processingTime, tokens, provider }
  };
}
```

### Adding API Endpoints
1. Create route handler in `api/server/routes/`
2. Import and register in `main.js`
3. Add input validation and error handling
4. Include response with confidence metadata
5. Add endpoint documentation

### Database Migrations
```bash
# Create new migration
npm run migrate:create <migration_name>

# Run migrations
npm run migrate:up

# Rollback migration
npm run migrate:down
```

## Module Guidelines

### Skills Layer
- **Single Responsibility**: Each skill does one thing well
- **Confidence Scoring**: Always return confidence [0-1]
- **Error Handling**: Graceful degradation over failures
- **Testability**: Unit tests with mocked dependencies
- **Documentation**: Clear input/output specifications

### API Design
- **RESTful**: Standard HTTP methods and status codes  
- **Consistent**: Uniform response format across endpoints
- **Versioned**: Use /api/v1/ prefix for backward compatibility
- **Documented**: OpenAPI spec for all endpoints
- **Validated**: Input validation with helpful error messages

### Data Storage
- **Separation**: Read/write operations in separate modules
- **Transactions**: Use transactions for multi-step operations
- **Indexing**: Index frequently queried fields
- **Cleanup**: Automatic cleanup of old/temporary data
- **Backup**: Regular backups of critical data

## Quality Assurance

### Code Standards
```bash
# Linting
npm run lint

# Formatting
npm run format

# Type checking (if using TypeScript)
npm run type-check
```

### Testing Strategy
- **Unit Tests**: 80%+ coverage for core business logic
- **Integration Tests**: End-to-end API functionality  
- **Benchmark Tests**: Performance and accuracy regression
- **Load Tests**: Concurrent request handling
- **Security Tests**: Input validation and auth

### Performance Monitoring
```bash
# Profile API performance
npm run profile

# Memory usage analysis
npm run analyze:memory

# Bundle size analysis
npm run analyze:bundle
```

## Deployment

### Environment Configuration
```bash
# Development
cp .env.example .env.development

# Production  
cp .env.example .env.production
```

Required environment variables:
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# AI Provider Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...

# Optional Features
ENABLE_BENCHMARKS=true
ENABLE_AUTO_TEACH=true
```

### Production Deployment
```bash
# Build application
npm run build

# Start production server
npm start

# Health check
curl http://localhost:3001/api/v1/health
```

### Docker Deployment
```bash
# Build image
docker build -t tooloo-ai .

# Run container
docker run -p 3001:3001 -e NODE_ENV=production tooloo-ai
```

## Monitoring & Debugging

### Logging
- **Structured Logging**: JSON format with consistent fields
- **Log Levels**: Error, warn, info, debug
- **Correlation IDs**: Track requests across services
- **Performance Metrics**: Response times, throughput
- **Business Metrics**: Accuracy, user satisfaction

### Debugging
```bash
# Start with debugging
NODE_ENV=development DEBUG=* node main.js

# Profile memory usage
node --inspect main.js

# Analyze heap snapshots
npm run debug:heap
```

### Health Checks
```bash
# API health
curl http://localhost:3001/api/v1/health

# System status
curl http://localhost:3001/api/v1/system/status

# Metrics endpoint
curl http://localhost:3001/api/v1/metrics
```

## Troubleshooting

### Common Issues

**Server won't start**
```bash
# Check port availability
lsof -i :3001

# Check dependencies
npm install

# Check environment variables
cat .env
```

**Database connection errors**
```bash
# Test database connectivity
npm run db:test

# Check migrations
npm run migrate:status

# Reset database (development only)
npm run db:reset
```

**High memory usage**
```bash
# Generate heap snapshot
npm run debug:heap

# Check for memory leaks
npm run test:memory

# Monitor memory in production
npm run monitor:memory
```

### Performance Issues
1. Check API response times in dashboard
2. Profile slow endpoints with debugging tools
3. Analyze database query performance
4. Review caching effectiveness
5. Monitor external API latency

### Accuracy Issues
1. Review benchmark results in dashboard
2. Check confidence calibration scores  
3. Analyze error patterns by domain
4. Verify source quality and freshness
5. Test auto-teach improvement cycles

## Security

### Input Validation
- Sanitize all user inputs
- Use parameterized queries
- Validate file uploads
- Rate limit API endpoints
- CORS configuration

### Authentication & Authorization
```javascript
// Example middleware
function requireAuth(req, res, next) {
  const token = req.headers.authorization;
  if (!validateToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
```

### Data Protection
- Encrypt sensitive data at rest
- Use HTTPS in production
- Implement PII detection
- Audit access logs
- Regular security updates

---

*Last Updated: October 2025*
*For issues: Create GitHub issue or contact team*