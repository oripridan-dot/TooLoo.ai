# Providers Arena

## Overview
The Providers Arena is a multi-service application designed to facilitate interactions with various AI providers. It allows users to create and manage tournaments, leveraging different AI capabilities.

## Project Structure
```
providers-arena
├── src
│   ├── server.js               # Entry point of the application
│   ├── routes
│   │   └── arena.routes.js     # Defines the routes for the Providers Arena
│   ├── controllers
│   │   └── arena.controller.js  # Handles requests related to the arena
│   ├── services
│   │   ├── arena.service.js     # Contains business logic for the arena
│   │   └── providers
│   │       ├── index.js        # Exports provider modules
│   │       ├── anthropic.js    # Interacts with the Anthropic provider
│   │       ├── openai.js       # Interacts with the OpenAI provider
│   │       └── ollama.js       # Interacts with the Ollama provider
│   ├── config
│   │   └── env.js              # Loads environment variables
│   └── utils
│       └── logger.js           # Logger utility for the application
├── tests
│   └── integration
│       └── arena.integration.test.js  # Integration tests for the Providers Arena
├── .env.example                 # Example environment variables
├── .eslintrc.json              # ESLint configuration
├── .gitignore                   # Git ignore file
├── package.json                 # npm configuration file
└── README.md                    # Project documentation
```

## Setup Instructions
1. Clone the repository:
   ```
   git clone <repository-url>
   cd providers-arena
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example` file and configure your environment variables.

4. Start the application:
   ```
   npm run start
   ```

## Usage
- Access the API endpoints defined in `src/routes/arena.routes.js` to interact with the Providers Arena.
- Use the ArenaController methods to manage tournaments and provider interactions.

## Testing
Run the integration tests using:
```
npm test
```

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.