import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { config } from 'dotenv';

import { ConversationalAssistant } from './assistant.js';
import { createApiResponse } from './utils.js';

// Load environment variables
config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize AI Assistant
const assistant = new ConversationalAssistant({
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  claude: {
    apiKey: process.env.CLAUDE_API_KEY || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
  },
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json(createApiResponse(true, {
    status: 'healthy',
    timestamp: new Date(),
    version: '1.0.0',
  }));
});

// API Routes
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId, userId } = req.body;
    
    if (!message) {
      return res.status(400).json(createApiResponse(false, null, 'Message is required'));
    }

    const result = await assistant.processRequest(message, conversationId, userId);
    res.json(createApiResponse(true, result));
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json(createApiResponse(false, null, 'Internal server error'));
  }
});

app.get('/api/conversations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const conversation = assistant.getConversation(id);
    
    if (!conversation) {
      return res.status(404).json(createApiResponse(false, null, 'Conversation not found'));
    }
    
    res.json(createApiResponse(true, conversation));
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json(createApiResponse(false, null, 'Internal server error'));
  }
});

app.get('/api/conversations', (req, res) => {
  try {
    const { userId } = req.query;
    const conversations = assistant.listConversations(userId as string);
    res.json(createApiResponse(true, conversations));
  } catch (error) {
    console.error('List conversations error:', error);
    res.status(500).json(createApiResponse(false, null, 'Internal server error'));
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const stats = assistant.getProviderStats();
    res.json(createApiResponse(true, stats));
  } catch (error) {
    console.error('Stats API error:', error);
    res.status(500).json(createApiResponse(false, null, 'Internal server error'));
  }
});

// WebSocket connections for real-time chat
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('chat:message', async (data) => {
    try {
      const { message, conversationId, userId } = data;
      
      // Send typing indicator
      socket.emit('chat:typing', { conversationId });
      
      const result = await assistant.processRequest(message, conversationId, userId);
      
      // Send response
      socket.emit('chat:response', result);
      
      // Broadcast to other clients in the same conversation if needed
      if (conversationId) {
        socket.to(conversationId).emit('chat:response', result);
      }
    } catch (error) {
      socket.emit('chat:error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  socket.on('join:conversation', (conversationId) => {
    socket.join(conversationId);
  });

  socket.on('leave:conversation', (conversationId) => {
    socket.leave(conversationId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json(createApiResponse(false, null, 'Internal server error'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json(createApiResponse(false, null, 'Endpoint not found'));
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

httpServer.listen(PORT, () => {
  console.log(`🚀 TooLoo.ai API Server running at http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
  console.log(`💬 WebSocket ready for real-time connections`);
});

export { app, httpServer, io };