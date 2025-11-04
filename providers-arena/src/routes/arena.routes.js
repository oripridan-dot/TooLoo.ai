import express from 'express';
import ArenaController from '../controllers/arena.controller.js';
import ArenaService from '../services/arena.service.js';

const router = express.Router();
const arenaService = new ArenaService();
const arenaController = new ArenaController(arenaService);

// Provider routes
router.get('/providers', arenaController.getProviders.bind(arenaController));
router.post('/providers/compare', arenaController.compareProviders.bind(arenaController));

// Aggregation routes
router.post('/aggregate', arenaController.getAggregatedResponse.bind(arenaController));
router.get('/health', arenaController.getProviderHealth.bind(arenaController));

// Tournament routes
router.post('/tournaments', arenaController.createTournament.bind(arenaController));
router.get('/tournaments', arenaController.getTournaments.bind(arenaController));
router.get('/tournaments/:id', arenaController.getTournamentById.bind(arenaController));
router.put('/tournaments/:id', arenaController.updateTournament.bind(arenaController));
router.delete('/tournaments/:id', arenaController.deleteTournament.bind(arenaController));

export default router;