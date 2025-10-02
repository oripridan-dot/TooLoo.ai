import fetch from 'node-fetch';

// Replace with your 10 prompts
const prompts = [
    "Prompt 1",
    "Prompt 2",
    "Prompt 3",
    "Prompt 4",
    "Prompt 5",
    "Prompt 6",
    "Prompt 7",
    "Prompt 8",
    "Prompt 9",
    "Prompt 10"
];

(async () => {
    try {
        await Promise.all(prompts.map(async (prompt, i) => {
            const res = await fetch('http://localhost:3001/api/v1/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            const json = await res.json();
            console.log(`Result ${i + 1}:`, json.content);
        }));
    } catch (err) {
        console.error('Error during parallel requests:', err);
    }
})();
