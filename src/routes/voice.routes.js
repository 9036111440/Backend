
const express = require('express');
const multer = require('multer');
const Groq = require('groq-sdk');

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const authenticateUser =
    require('../middleware/auth.middleware');

const router = express.Router();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});


// =====================================================
// AUDIO UPLOAD CONFIGURATION
// =====================================================

const storage = multer.diskStorage({

    destination: (_req, _file, callback) => {
        callback(null, os.tmpdir());
    },

    filename: (_req, file, callback) => {

        const extension =
            path.extname(file.originalname).toLowerCase()
            || '.webm';

        callback(
            null,
            `ai-voice-${crypto.randomUUID()}${extension}`
        );

    }

});

const upload = multer({

    storage,

    limits: {
        fileSize: 25 * 1024 * 1024
    },

    fileFilter: (_req, file, callback) => {

        const extension =
            path.extname(file.originalname).toLowerCase();

        const audioExtensions = [
            '.webm',
            '.ogg',
            '.wav',
            '.mp3',
            '.m4a',
            '.mp4',
            '.mpeg',
            '.mpga',
            '.flac'
        ];

        if (
            (file.mimetype || '').startsWith('audio/')
            || audioExtensions.includes(extension)
        ) {

            return callback(null, true);

        }

        return callback(
            new Error('Please upload a supported audio file.')
        );

    }

});


// =====================================================
// SPLIT TEXT FOR GROQ TTS
//
// Orpheus TTS accepts a maximum of 200 characters
// per request. Keep our chunks below that limit.
// =====================================================

function splitTextIntoChunks(text, maxLength = 180) {

    const words =
        text.replace(/\s+/g, ' ').trim().split(' ');

    const chunks = [];

    let current = '';

    for (const word of words) {

        const candidate =
            current
                ? `${current} ${word}`
                : word;

        if (candidate.length <= maxLength) {

            current = candidate;

        } else {

            if (current) {
                chunks.push(current);
            }

            current = word;

            // Also handle an unusually long individual word.
            while (current.length > maxLength) {

                chunks.push(
                    current.slice(0, maxLength)
                );

                current =
                    current.slice(maxLength);

            }

        }

    }

    if (current) {
        chunks.push(current);
    }

    return chunks;

}


// =====================================================
// POST /api/voice/transcribe
//
// Multipart field:
// audio = recorded audio file
//
// Response:
// { transcript, language }
// =====================================================

router.post(
    '/transcribe',
    authenticateUser,
    upload.single('audio'),

    async (req, res) => {

        let tempFilePath = null;

        try {

            if (!req.file) {

                return res.status(400).json({
                    message: 'Audio recording is required.'
                });

            }

            tempFilePath = req.file.path;

            console.log(
                '🎙️ Transcribing voice for user:',
                req.user.userId
            );


            const transcription =
                await groq.audio.transcriptions.create({

                    file: fs.createReadStream(tempFilePath),

                    model: 'whisper-large-v3-turbo',

                    response_format: 'verbose_json',

                    temperature: 0

                });


            const transcript =
                (transcription.text || '').trim();


            if (!transcript) {

                return res.status(400).json({
                    message:
                        'No speech was detected. Please try again.'
                });

            }


            console.log(
                '✅ Voice transcription complete'
            );


            return res.status(200).json({

                transcript,

                language:
                    transcription.language || null

            });

        } catch (error) {

            console.error(
                '❌ Voice transcription failed:',
                error.message
            );

            return res.status(500).json({

                message:
                    'Failed to transcribe audio. Please try again.'

            });

        } finally {

            if (tempFilePath) {

                await fs.promises
                    .unlink(tempFilePath)
                    .catch(() => {});

            }

        }

    }
);


// =====================================================
// POST /api/voice/speech
//
// JSON body:
// { text: "AI answer" }
//
// Response:
// { audioChunks, mimeType, truncated }
// =====================================================

function cleanMarkdownForSpeech(input) {

    const lines =
        String(input || '')
            .replace(/\r/g, '')
            .split('\n');

    const output = [];

    let insideCodeBlock = false;

    for (const line of lines) {

        // Don't read code punctuation aloud.
        if (/^\s*```/.test(line)) {

            if (!insideCodeBlock) {
                output.push(
                    'A code example is shown in the chat.'
                );
            }

            insideCodeBlock = !insideCodeBlock;

            continue;
        }

        if (insideCodeBlock) {
            continue;
        }

        // Ignore Markdown table separator rows.
        if (
            /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/
                .test(line)
        ) {
            continue;
        }

        let cleaned = line.trim();

        // Convert table rows into spoken sentences.
        if (
            cleaned.startsWith('|') &&
            cleaned.endsWith('|')
        ) {

            cleaned = cleaned
                .slice(1, -1)
                .split('|')
                .map(cell => cell.trim())
                .filter(Boolean)
                .join('. ');

        }

        cleaned = cleaned

            // Links: speak the label, not the URL.
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

            // Inline code: speak its content.
            .replace(/`([^`]+)`/g, '$1')

            // Bold, italics and strikethrough.
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/__(.*?)__/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/_(.*?)_/g, '$1')
            .replace(/~~(.*?)~~/g, '$1')

            // Headings and blockquotes.
            .replace(/^\s{0,3}#{1,6}\s+/g, '')
            .replace(/^\s*>\s?/g, '')

            // Lists are spoken without Markdown markers.
            .replace(/^\s*[-*+]\s+/g, '')
            .replace(/^\s*\d+[.)]\s+/g, '')

            // Horizontal rules.
            .replace(/^\s*[-*_]{3,}\s*$/g, '')

            // Clean remaining Markdown characters.
            .replace(/[#*`|]/g, ' ')

            // Collapse excess whitespace.
            .replace(/\s+/g, ' ')
            .trim();

        if (cleaned) {
            output.push(cleaned);
        }
    }

    return output
        .join(' ')
        .replace(/\s+/g, ' ')
        .replace(/\s+([,.;:!?])/g, '$1')
        .trim();
}


router.post(
    '/speech',
    authenticateUser,

    async (req, res) => {

        try {

            const text =
                typeof req.body?.text === 'string'
                    ? req.body.text.trim()
                    : '';


            if (!text) {

                return res.status(400).json({
                    message: 'Text is required.'
                });

            }


            // Keep the TTS work bounded.
            // The displayed AI answer itself is not changed.

            const maxSpeechChars = 1200;

let speechText =
    cleanMarkdownForSpeech(text);

let truncated = false;

if (!speechText) {

    speechText =
        'The full response is available in the chat.';

}

            if (speechText.length > maxSpeechChars) {

                speechText =
                    speechText.slice(0, maxSpeechChars);

                const lastSpace =
                    speechText.lastIndexOf(' ');

                if (lastSpace > 1000) {
                    speechText =
                        speechText.slice(0, lastSpace);
                }

                truncated = true;

            }


            const chunks =
                splitTextIntoChunks(speechText, 180);


            const audioChunks = [];


            for (const chunk of chunks) {

                const audioResponse =
                    await groq.audio.speech.create({

                        model:
                            'canopylabs/orpheus-v1-english',

                        voice:
                            'hannah',

                        input:
                            chunk,

                        response_format:
                            'wav'

                    });


                const buffer =
                    Buffer.from(
                        await audioResponse.arrayBuffer()
                    );


                audioChunks.push(
                    buffer.toString('base64')
                );

            }


            return res.status(200).json({

                audioChunks,

                mimeType: 'audio/wav',

                truncated

            });

        } catch (error) {

            console.error(
                '❌ Text-to-speech failed:',
                error.message
            );


            return res.status(500).json({

                message:
                    'Failed to generate speech audio.'

            });

        }

    }
);


module.exports = router;
