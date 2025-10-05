#!/bin/bash
set -e

echo "🏗️  Creating modular backend structure..."

# Create main directories
mkdir -p src/{routes,services,managers,middleware,config,utils}
mkdir -p tests/{api,unit,integration,fixtures}
mkdir -p docs/{architecture,api,guides}

# Create subdirectories
mkdir -p src/routes/{chat,learning,filesystem,health,admin}
mkdir -p src/services/{providers,learning,self-awareness}
mkdir -p src/middleware/{auth,validation,error-handling}

echo "✅ Directory structure created!"

# Create index files for each module
touch src/routes/index.js
touch src/services/index.js
touch src/managers/index.js
touch src/middleware/index.js
touch src/config/index.js
touch src/utils/index.js

echo "✅ Index files created!"

# Display structure
echo ""
echo "📂 New structure:"
tree -L 3 src/ -I node_modules || ls -R src/

echo ""
echo "Next steps:"
echo "1. Extract services from simple-api-server.js"
echo "2. Move managers to src/managers/"
echo "3. Extract routes to src/routes/"
echo "4. Create middleware in src/middleware/"
echo "5. Update simple-api-server.js to use modules"
