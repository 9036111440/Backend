const express = require('express');
const multer = require('multer');

const Conversation =
    require('../models/conversation.model');

const authenticateUser =
    require('../middleware/auth.middleware');

const {
    generateTextResponse,
    generateImageResponse,
    generatePdfResponse
} = require('../services/groq.service');


const router = express.Router();


const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 20 * 1024 * 1024
    }
});


router.post(
    '/message',
    // authenticateUser,
    upload.single('file'),

    async (req, res) => {

        try {
            const {
    extractPdfText
} = require('../services/pdf.service');

let pdfText = '';
const file = req.file;

if (
    file &&
    file.mimetype === 'application/pdf'
) {

    const result =
        await extractPdfText(
            file.path
        );

    pdfText = result.text;
    fs.unlinkSync(file.path);

    console.log(
        `PDF extracted: ${result.pages} pages`
    );

    console.log(
        `Extracted characters: ${pdfText.length}`
    );

}

            const userId = '6a7fe149a5a74971d2200e10'

            // const userId =
            //     req.user.userId || 1000;


            const message =
                req.body.message?.trim();


            // const file =
            //     req.file;


            if (!message && !file) {

                return res.status(400).json({
                    message:
                        'Message or attachment is required'
                });

            }


            // -------------------------
            // Find/create conversation
            // -------------------------

            let conversation;


            if (req.body.conversationId) {

                conversation =
                    await Conversation.findOne({

                        _id:
                            req.body.conversationId,

                        userId

                    });

            }


            if (!conversation) {

                conversation =
                    new Conversation({

                        userId,

                        title:
                            message
                                ? message.substring(0, 50)
                                : 'New Chat',

                        messages: []

                    });

            }


            // -------------------------
            // Add user message
            // -------------------------

            const userMessage = {

                role: 'user',

                content:
                    message || 'Attachment'

            };


            if (file) {

                userMessage.attachment = {

                    type:
                        file.mimetype.startsWith('image/')
                            ? 'image'
                            : 'file',

                    fileName:
                        file.originalname,

                    mimeType:
                        file.mimetype,

                    fileUrl:
                        `/uploads/${file.filename}`

                };

            }


            conversation.messages.push(
                userMessage
            );


            // -------------------------
            // Generate AI response
            // -------------------------
let aiResponse;

if (
    file &&
    file.mimetype === 'application/pdf'
) {

    aiResponse =
        await generatePdfResponse(
            pdfText,
            message
        );

}
else if (
    file &&
    file.mimetype.startsWith('image/')
) {

    const fs = require('fs');

    const imageBuffer =
        fs.readFileSync(file.path);

    const imageBase64 =
        imageBuffer.toString('base64');

    aiResponse =
        await generateImageResponse(
            message,
            imageBase64,
            file.mimetype
        );

}
else {

    const groqMessages =
        conversation.messages.map(
            msg => ({

                role: msg.role,

                content: msg.content

            })
        );

    aiResponse =
        await generateTextResponse(
            groqMessages
        );

}


            // -------------------------
            // Save AI response
            // -------------------------

            conversation.messages.push({

                role: 'assistant',

                content: aiResponse

            });


            await conversation.save();


            return res.status(200).json({

                conversationId:
                    conversation._id,

                userMessage,

                assistantMessage: {

                    role: 'assistant',

                    content:
                        aiResponse

                }

            });


        } catch (error) {

            console.error(
                'Chat error:',
                error
            );


            return res.status(500).json({

                message:
                    'Failed to process chat'

            });

        }

    }
);
router.get(
    '/conversations',
    // authenticateUser,

    async (req, res) => {

        try {

            const conversations =
                await Conversation
                    .find({
                        userId: '6a7fe149a5a74971d2200e10'
                            // req.user.userId || 1000
                    })
                    .sort({
                        updatedAt: -1
                    })
                    .select(
                        '_id title createdAt updatedAt messages'
                    );


            const result =
                conversations.map(
                    conversation => ({

                        id:
                            conversation._id,

                        title:
                            conversation.title,

                        updatedAt:
                            conversation.updatedAt,

                        messageCount:
                            conversation.messages.length

                    })
                );


            res.json(result);

        } catch (error) {

            console.error(error);

            res.status(500).json({

                message:
                    'Failed to load conversations'

            });

        }

    }
);
router.get(
    '/conversations/:id',
    // authenticateUser,

    async (req, res) => {

        try {

            const conversation =
                await Conversation.findOne({

                    _id:
                        req.params.id,

                    userId: '6a7fe149a5a74971d2200e10'
                        // req.user.userId || 1000

                });


            if (!conversation) {

                return res.status(404).json({

                    message:
                        'Conversation not found'

                });

            }


            res.json(conversation);

        } catch (error) {

            console.error(error);

            res.status(500).json({

                message:
                    'Failed to load conversation'

            });

        }

    }
);


module.exports = router;