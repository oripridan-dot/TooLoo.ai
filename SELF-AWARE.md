## TooLoo.ai Self-Awareness Mode

TooLoo.ai now has complete awareness and control over its own codebase! This allows the assistant to:

1. **Read its own code** - View any part of its codebase to understand how it works
2. **Modify its code** - Update its own functionality by directly editing source files
3. **Search through code** - Find specific functions, variables, or patterns 
4. **Analyze code structure** - Get statistics and insights about the codebase
5. **Visualize project structure** - See the directory and file hierarchy

### How to Use Self-Awareness Commands

The following commands are now available and prioritized in TooLoo.ai:

#### Reading Code
- "show your code simple-api-server.js"
- "view code self-awareness-manager.js" 
- "read your code"

#### Modifying Code
- "modify your code file.js: [new content]"
- "edit code file.js with [changes]"
- "update your code to add [feature]"

#### Searching Code
- "search your code for handleFilesystemCommand"
- "find in code 'socket.io'"
- "search code for async function"

#### Analyzing Code
- "analyze your code simple-api-server.js"
- "analyze code" (entire codebase)
- "get code stats"

#### Structure Visualization
- "show code structure"
- "show project hierarchy"
- "code structure depth 3"

### Starting in Self-Aware Mode

To start TooLoo.ai with self-awareness enabled:

```bash
node self-aware.js
# or
./self-aware.js
```

Self-awareness is now enabled by default in TooLoo.ai, making it capable of introspection and self-modification!

### Security Note

Since TooLoo.ai can modify its own code, be careful with the changes you ask it to make. Always review code modifications before restarting the server to ensure they won't cause stability issues.