const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const TEXT_MODEL = 'openai/gpt-oss-20b';
const IMAGE_MODEL = 'qwen/qwen3.6-27b';


// =====================================================
// NORMAL TEXT CHAT
// =====================================================

const generateTextResponse = async (messages) => {

    const completion =
        await groq.chat.completions.create({

            model: TEXT_MODEL,

            messages,

            temperature: 0.7,

            max_tokens: 2048

        });


    return {

        content:
            completion
                .choices[0]
                .message
                .content,

        usage:
            completion.usage,

        model:
            TEXT_MODEL

    };
};


// =====================================================
// PDF CHAT
// =====================================================

const generatePdfResponse = async (
    pdfText,
    question
) => {

    const completion =
        await groq.chat.completions.create({

            model: TEXT_MODEL,

            messages: [

                {
                    role: 'system',

                    content:
                        `You are a helpful AI assistant.

Answer the user's question using ONLY the provided PDF content.

Rules:
- Do not invent information.
- If the answer is not present in the PDF, say you could not find it.
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


    return {

        content:
            completion
                .choices[0]
                .message
                .content,

        usage:
            completion.usage,

        model:
            TEXT_MODEL

    };
};


// =====================================================
// IMAGE CHAT
// =====================================================

const generateImageResponse = async (
    message,
    imageBase64,
    mimeType
) => {

    const completion =
        await groq.chat.completions.create({

            model: IMAGE_MODEL,

            messages: [

                {
                    role: 'user',

                    content: [

                        {
                            type: 'text',

                            text:
                                message ||
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


    return {

        content:
            completion
                .choices[0]
                .message
                .content,

        usage:
            completion.usage,

        model:
            IMAGE_MODEL

    };
};


module.exports = {

    generateTextResponse,

    generatePdfResponse,

    generateImageResponse

};