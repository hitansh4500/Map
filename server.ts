import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { queryMapsGrounding, queryAssistantChat } from './src/server/geminiMapsHandler.ts';
import { computeRealRoadRoute } from './src/server/routeProxy.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// API route for real road network route computation
app.post('/api/compute-route', async (req, res) => {
  try {
    const { origin, destination, travelMode } = req.body;
    if (!origin || !destination) {
      res.status(400).json({ error: 'Origin and destination are required' });
      return;
    }
    const result = await computeRealRoadRoute(origin, destination, travelMode || 'DRIVING');
    if (!result) {
      res.status(404).json({ error: 'No routes found for specified locations' });
      return;
    }
    res.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({ error: err.message || 'Error computing route' });
  }
});

// API route for AI Maps Assistant Chat (places & dine-in recommendations)
app.post('/api/assistant-chat', async (req, res) => {
  try {
    const { message, history, locationAddress } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }
    const result = await queryAssistantChat(message, history || [], locationAddress || 'Kandivali West, Mumbai');
    res.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({ error: err.message || 'Assistant chat error' });
  }
});

// API route for Gemini Maps Grounding
app.post('/api/maps-grounding', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }
    const result = await queryMapsGrounding(prompt);
    res.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Serve static assets in production
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
