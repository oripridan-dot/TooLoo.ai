class ArenaController {
  constructor(arenaService) {
    this.arenaService = arenaService;
  }

  async getProviders(req, res) {
    try {
      const providers = this.arenaService.getAvailableProviders();
      res.status(200).json({ providers });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async compareProviders(req, res) {
    try {
      const { prompt, providers } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required' });
      }
      
      const results = await this.arenaService.compareProviders(prompt, providers);
      res.status(200).json({ results });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async createTournament(req, res) {
    try {
      const tournamentData = req.body;
      const tournament = await this.arenaService.createTournament(tournamentData);
      res.status(201).json(tournament);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getTournaments(req, res) {
    try {
      const tournaments = await this.arenaService.getTournaments();
      res.status(200).json(tournaments);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getTournamentById(req, res) {
    try {
      const { id } = req.params;
      const tournament = this.arenaService.getTournamentById(parseInt(id));
      if (!tournament) {
        return res.status(404).json({ message: 'Tournament not found' });
      }
      res.status(200).json(tournament);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateTournament(req, res) {
    try {
      const { id } = req.params;
      const updatedData = req.body;
      const updatedTournament = this.arenaService.updateTournament(parseInt(id), updatedData);
      res.status(200).json(updatedTournament);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async deleteTournament(req, res) {
    try {
      const { id } = req.params;
      const deletedTournament = this.arenaService.deleteTournament(parseInt(id));
      res.status(200).json(deletedTournament);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getAggregatedResponse(req, res) {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required' });
      }
      
      const aggregated = await this.arenaService.getAggregatedResponse(prompt);
      res.status(200).json(aggregated);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getProviderHealth(req, res) {
    try {
      const health = await this.arenaService.getProviderHealth();
      res.status(200).json(health);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

}

export default ArenaController;