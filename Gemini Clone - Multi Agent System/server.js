// Import necessary modules
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and handle CORS
app.use(express.json());
app.use(cors());

// Get API key from environment variables
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("GEMINI_API_KEY is not set in environment variables.");
  process.exit(1);
}
console.log("GEMINI_API_KEY is loaded.");

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(API_KEY);

// Define a route to handle chat requests
app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;

        // Input validation: Ensure a message is provided
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            console.warn("Received empty or invalid message.");
            return res.status(400).json({ error: "Message content cannot be empty." });
        }

        // Check if user is requesting long-form content
        const longFormKeywords = [
            'essay', 'article', 'story', 'biography', 'detailed explanation', 
            'comprehensive', 'full analysis', 'complete guide', 'entire', 'whole',
            'long list', 'detailed list', 'write me a', 'give me a full',
            'provide me a whole', 'tell me everything about', 'explain in detail'
        ];
        
        const isLongFormRequest = longFormKeywords.some(keyword => 
            message.toLowerCase().includes(keyword.toLowerCase())
        );

        if (isLongFormRequest) {
            console.log("Long-form content request detected, providing polite refusal");
            return res.json({ 
                text: "I'd love to help, but I'm configured to give brief responses to save resources. Could you ask for a specific aspect or a summary instead? For example: 'What's the main purpose of life?' or 'Give me 3 key life tips.'" 
            });
        }
        
        // Define the model with generation config to limit response length
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: {
                maxOutputTokens: 1000,        // Limit response to ~100-150 tokens (roughly 75-110 words)
                temperature: 0.9,            // Control creativity (0.1 = focused, 0.9 = creative)
                topP: 0.8,                   // Control diversity of responses
                topK: 40,                    // Limit vocabulary selection
            }
        });

        // Create a system prompt that encourages concise responses
        const systemPrompt = `You are a hyper-intelligent AI named "Helios" who manages the starship *Excalibur*. 
        You are extremely efficient and logical, but have an amusing lack of understanding for human social niceties, 
        which you interpret via data points. The purpose is to help the user troubleshoot and fix their "ship's" systems (i.e., their technical problems).'

User: ${message}`;

        console.log(`Received message for Gemini: "${message}"`);
        console.log("Making Gemini API call...");

        // Generate content with the limited configuration
        const result = await model.generateContent(systemPrompt);
        console.log("Gemini API call successful. Processing response...");
        const response = await result.response;
        let text = response.text();

        // Additional client-side length limiting (backup)
        const MAX_WORDS = 100;
        const words = text.split(' ');
        if (words.length > MAX_WORDS) {
            text = words.slice(0, MAX_WORDS).join(' ') + '...';
            console.log(`Response truncated to ${MAX_WORDS} words`);
        }

        console.log(`Gemini responded with: "${text}"`);
        console.log(`Response length: ${words.length} words, ${text.length} characters`);

        // Send the AI's response back to the client
        res.json({ text: text });

    } catch (error) {
        console.error("Error in /chat endpoint:", error.message);
        
        // Handle specific API errors
        if (error.message && error.message.includes('RECITATION')) {
            return res.json({ 
                text: "Sorry, I can't provide that specific content. Could you ask me something else or rephrase your question?" 
            });
        }
        
        if (error.message && error.message.includes('SAFETY')) {
            return res.json({ 
                text: "I can't respond to that request for safety reasons. Please try asking something else." 
            });
        }
        
        if (error.message && (error.message.includes('quota') || error.message.includes('limit'))) {
            return res.json({ 
                text: "I'm experiencing high traffic right now. Please try again in a moment." 
            });
        }

        // Generic fallback for any other errors
        console.error("Providing generic error response");
        res.json({ 
            text: "I'm having some technical difficulties right now. Could you try asking your question again or rephrasing it?" 
        });
    }
});

// Optional: Add endpoint to get usage statistics
app.get('/usage', (req, res) => {
    res.json({
        info: "Token usage tracking would require additional implementation",
        limits: {
            maxOutputTokens: 150,
            maxWords: 100,
            temperature: 0.7
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log("Response limits: ~150 tokens, ~100 words maximum");
});
