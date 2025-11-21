import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

// Read .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
let apiKey = process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/GOOGLE_GEMINI_API_KEY=(.*)/);
    if (match) {
        apiKey = match[1].trim();
    }
}

if (!apiKey) {
    console.error('GOOGLE_GEMINI_API_KEY not found');
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey });
const GEMINI_MODEL = 'gemini-2.5-flash-lite';

async function testGenerate() {
    try {
        console.log(`Testing generation with model: ${GEMINI_MODEL}`);
        console.log('Config: thinkingBudget = 0');

        const response = await client.models.generateContent({
            model: GEMINI_MODEL,
            contents: "Hello, are you working?",
            config: {
                thinkingConfig: {
                    thinkingBudget: 0,
                },
            },
        });

        console.log('Response received:');
        console.log(response.text);
    } catch (error) {
        console.error('Error testing generation:', error);
    }
}

testGenerate();
