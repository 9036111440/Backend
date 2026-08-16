const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});


const generateTextResponse = async (
    messages
) => {

    const completion =
        await groq.chat.completions.create({

            model: 'llama-3.3-70b-versatile',

            messages,

            temperature: 0.7,

            max_tokens: 2048

        });


    return completion
        .choices[0]
        .message
        .content;
};

const generateImageResponse = async (
    text,
    imageBase64,
    mimeType
) => {

    const completion =
        await groq.chat.completions.create({

            model: 'qwen/qwen3.6-27b',

            messages: [
                {
                    role: 'user',

                    content: [

                        {
                            type: 'text',

                            text:
                                text ||
                                'Describe this image.'
                        },

                        {
                            type: 'image_url',

                            image_url: {
                                url:
                                    `data:${mimeType};base64,${imageBase64}`
                            }
                        }

                    ]
                }
            ],

            temperature: 0.7,

            max_completion_tokens: 2048

        });


    return completion
        .choices[0]
        .message
        .content;
};

const generatePdfResponse = async (
    pdfText,
    question
) => {

    const completion =
        await groq.chat.completions.create({

            model:
                'llama-3.3-70b-versatile',

            messages: [

                {
                    role: 'system',

                    content:
                        `You are a helpful AI assistant.

Answer the user's question using the provided PDF content.

Rules:
- Use only information available in the PDF.
- If the answer is not available in the PDF, say that you could not find it.
- Do not invent information.
- Give a clear and concise answer.`
                },

                {
                    role: 'user',

                    content:
                        `PDF CONTENT:

${pdfText}

USER QUESTION:

${question}`
                }

            ],

            temperature: 0.2,

            max_tokens: 2048

        });


    return completion
        .choices[0]
        .message
        .content;
};


module.exports = {
    generateTextResponse,
    generateImageResponse,
    generatePdfResponse
};


// module.exports = {
//     generateTextResponse
// };