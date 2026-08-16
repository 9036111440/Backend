const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function testGroq() {
    try {

        console.log('Testing Groq API...');

        const response = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'user',
                    content: 'whats 22 *72'
                }
            ]
        });

        console.log('✅ Groq API is working!');
        console.log('\nResponse:');
        console.log(response.choices[0].message.content);

    } catch (error) {

        console.error('❌ Groq API failed');

        console.error('Status:', error.status);
        console.error('Message:', error.message);

    }
}

testGroq();