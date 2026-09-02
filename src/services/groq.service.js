const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const TEXT_MODEL = 'openai/gpt-oss-20b';
const IMAGE_MODEL = 'qwen/qwen3.6-27b';


// =====================================================
// NORMAL TEXT CHAT
// =====================================================

// =====================================================
// NORMAL TEXT CHAT
// =====================================================

const generateTextResponse = async (messages) => {

    const MAX_HISTORY_MESSAGES = 8;

    /*
     * Approximate character limit per message.
     *
     * This is intentionally conservative because
     * Groq's limit is measured in tokens, not characters.
     */

    const MAX_MESSAGE_CHARS = 6000;


    let safeMessages = Array.isArray(messages)
        ? messages
        : [];


    /*
     * Preserve system message.
     */

    const systemMessage =
        safeMessages.find(
            message =>
                message.role === 'system'
        );


    /*
     * Keep recent conversation only.
     */

    const conversationMessages =
        safeMessages
            .filter(
                message =>
                    message.role !== 'system'
            )
            .slice(
                -MAX_HISTORY_MESSAGES
            );


    /*
     * Trim large messages.
     */

    const trimmedMessages =
        conversationMessages.map(
            message => {

                if (
                    typeof message.content !==
                    'string'
                ) {

                    return message;

                }


                if (
                    message.content.length <=
                    MAX_MESSAGE_CHARS
                ) {

                    return message;

                }


                return {

                    ...message,

                    content:
                        message.content.slice(
                            0,
                            MAX_MESSAGE_CHARS
                        ) +
                        '\n\n[Previous content truncated.]'

                };

            }
        );


    safeMessages = [

        ...(systemMessage
            ? [systemMessage]
            : []
        ),

        ...trimmedMessages

    ];


    console.log(
        'Sending messages to Groq:',
        safeMessages.length
    );


    try {

        const completion =
            await groq.chat.completions.create({

                model:
                    TEXT_MODEL,

                messages:
                    safeMessages,

                temperature:
                    0.7,

                max_tokens:
                    1024

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

    } catch (error) {

        console.error(
            'Groq text generation error:',
            error
        );


        if (
            error?.status === 413 ||
            error?.code ===
                'rate_limit_exceeded'
        ) {

            throw new Error(
                'AI request is too large. Please start a new chat or shorten your message.'
            );

        }

        throw error;

    }

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