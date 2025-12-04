import { Router } from 'express';
import { generateLLM } from '../../precog/providers/llm-provider.js';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/execute-task', async (req, res) => {
  const { task, taskType, description } = req.body;

  console.log(`[Workflows] Executing task: ${task} (${taskType})`);

  if (taskType === 'design') {
    try {
      // Generate HTML
      const prompt = `
You are an expert UI Designer and Frontend Developer.
Create a single-file HTML/CSS/JS UI for the following request: "${task}".
Description: ${description || task}

Requirements:
- Use modern CSS (Flexbox/Grid).
- Make it responsive.
- Include all CSS and JS in the single HTML file.
- Use a clean, modern aesthetic (Inter font, soft shadows, rounded corners).
- Do NOT use external CSS/JS libraries (except Google Fonts).
- Return ONLY the raw HTML code. Do not wrap in markdown code blocks.
`;

      const html = await generateLLM({
        prompt,
        provider: 'gemini', // Use Gemini for design generation
        system: 'You are a UI generator. Output only valid HTML.',
      });

      // Clean up markdown if present
      const cleanHtml = html
        .replace(/```html/g, '')
        .replace(/```/g, '')
        .trim();

      const filename = `design-${uuidv4()}.html`;
      const tempDir = path.join(process.cwd(), 'src/web-app/temp');
      await fs.ensureDir(tempDir);

      const filePath = path.join(tempDir, filename);
      await fs.outputFile(filePath, cleanHtml);

      console.log(`[Workflows] Generated design artifact: ${filename}`);

      res.json({
        ok: true,
        artifacts: [{ type: 'design', url: `/temp/${filename}` }],
      });
    } catch (error: any) {
      console.error(`[Workflows] Design generation failed: ${error.message}`);
      res.status(500).json({ ok: false, error: error.message });
    }
  } else {
    res.status(400).json({ ok: false, error: 'Unsupported task type' });
  }
});

export default router;
