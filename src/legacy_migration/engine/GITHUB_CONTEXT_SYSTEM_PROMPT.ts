// GITHUB_CONTEXT_SYSTEM_PROMPT.js
// This file shows how to inject GitHub context into provider system prompts
// When integrated into llm-provider.js, providers will see this context

export function buildGitHubContextPrompt(githubData) {
  if (!githubData) {
    return '';
  }

  const issuesList = githubData.issues?.slice(0, 5).map(issue => 
    `- #${issue.number} ${issue.title} (${issue.state})`
  ).join('\n') || 'No recent issues';

  const structureList = githubData.structure?.map(item => {
    if (item.type === 'dir') return `- ${item.path}/ - (directory)`;
    if (item.path.endsWith('server.js')) return `- ${item.path} - (service)`;
    if (item.path.endsWith('.md')) return `- ${item.path} - (documentation)`;
    return '';
  }).filter(Boolean).join('\n') || 'Structure not available';

  return `
## Repository Context (from GitHub)

You have access to the TooLoo.ai GitHub repository. Use this context to provide informed recommendations.

**Repository:** ${githubData.repo}
**Description:** ${githubData.description || 'Multi-service Node.js AI network'}
**Language:** ${githubData.language || 'JavaScript'}
**Latest Update:** ${githubData.lastUpdate || 'N/A'}

### Recent Issues & PRs (Current Work)
${issuesList}

### Project Structure
${structureList}

### Key Files You Can Reference
- package.json - Dependencies and configuration
- README.md - Project overview and architecture
- servers/ - Microservices (web, training, meta, budget, coach, etc.)
- engine/ - Core processing engines
- web-app/ - Frontend UI components

### When Providing Recommendations:
1. Reference actual issues - "As mentioned in issue #XX..."
2. Match the architecture - Suggestions should fit the microservices pattern
3. Use the tech stack - Node.js, Express, vanilla JavaScript
4. Consider constraints - 12+ services running concurrently, port management
5. Suggest based on code - Reference actual files and patterns you've seen

### Example Suggestions:
✓ "Looking at training-server.js, I suggest..."
✓ "To address issue #42, modify providers-arena.html..."
✓ "Your microservices architecture means..."
✗ Don't suggest "Add a Django backend" or "Use React"
✗ Don't reference issues you haven't seen

---
This context is provided automatically when you're analyzing TooLoo.ai.
Ask about specific files, issues, or architecture patterns.
`;
}
