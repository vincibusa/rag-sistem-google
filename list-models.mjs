import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

// Read .env.local manually since we are running this script directly
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
    console.error('GOOGLE_GEMINI_API_KEY not found in environment or .env.local');
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey });

async function listModels() {
    try {
        console.log('Listing models...');
        const response = await client.models.list();
        // The response is an async iterable or array depending on SDK version
        // Based on previous file-search.ts, it seems to be iterable
        for await (const model of response) {
            console.log(`- ${model.name} (Display: ${model.displayName})`);
            console.log(`  Supported methods: ${model.supportedGenerationMethods?.join(', ')}`);
        }
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
