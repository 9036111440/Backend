const express = require('express');
const multer = require('multer');

const Conversation =
    require('../models/conversation.model');

const authenticateUser =
    require('../middleware/auth.middleware');

const User =
    require('../models/user.model');

const AiUsage =
    require('../models/ai-usage.model');

const {
    generateTextResponse,
    generateImageResponse,
    generatePdfResponse
} = require('../services/groq.service');

const MessageFeedback =
    require('../models/message-feedback.model');
    
const {
    generateConversationPdf
} =
    require('../services/conversation-pdf.service');

const path =
    require('path');

const fs =
    require('fs');


const router = express.Router();


const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 20 * 1024 * 1024
    }
});


router.post(
    '/message',
    authenticateUser,
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
                // fs.unlinkSync(file.path);

                console.log(
                    `PDF extracted: ${result.pages} pages`
                );

                console.log(
                    `Extracted characters: ${pdfText.length}`
                );

            }

            const userId = req.user.userId

            const user = await User.findById(userId);

            if (!user) {

                return res.status(404).json({
                    message: 'User not found'
                });

            }

            // const userId =
            //     req.user.userId || 1000;


            const message =
                req.body.message?.trim();


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


            // =================================
            // CHECK CHAT LIMIT
            // =================================

            if (user.plan === 'demo') {

                const userChatCount =
                    conversation.messages.filter(
                        msg =>
                            msg.role === 'user'
                    ).length;


                console.log(
                    `📊 Demo chat usage: ${userChatCount}/3`
                );


                if (userChatCount >= 3) {

                    return res.status(403).json({

                        code:
                            'CHAT_LIMIT_REACHED',

                        message:
                            'You have reached the 3-message Demo limit for this conversation.',

                        plan:
                            'demo',

                        limit:
                            3,

                        used:
                            userChatCount

                    });

                }

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


            // Store extracted PDF text on the message
            // so it persists in the conversation and
            // can be reused for follow-up questions
            if (
                file &&
                file.mimetype === 'application/pdf' &&
                pdfText
            ) {

                userMessage.pdfContext = pdfText;

            }


            conversation.messages.push(
                userMessage
            );


            // -------------------------
            // Generate AI response
            // -------------------------
            let aiResponse;
            let aiUsage;
            let aiModel;

            if (
                file &&
                file.mimetype === 'application/pdf'
            ) {

                const pdfResult =
                    await generatePdfResponse(
                        pdfText,
                        message
                    );

                aiResponse =
                    pdfResult.content;

                aiUsage =
                    pdfResult.usage;

                aiModel =
                    pdfResult.model;

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

                const imageResult =
                    await generateImageResponse(
                        message,
                        imageBase64,
                        file.mimetype
                    );

                aiResponse =
                    imageResult.content;

                aiUsage =
                    imageResult.usage;

                aiModel =
                    imageResult.model;

            }
            else {

                // Look for the most recent PDF context
                // stored in this conversation, so follow-up
                // questions can still reference the PDF
                // without re-uploading it
                const pdfMessage =
                    [...conversation.messages]
                        .reverse()
                        .find(msg => msg.pdfContext);

                const groqMessages = [];

                if (pdfMessage) {

                    groqMessages.push({

                        role: 'system',

                        content:
                            `The user previously uploaded a PDF document. Use the following content to answer questions when relevant. If the question is unrelated to the PDF, answer normally.\n\nPDF CONTENT:\n\n${pdfMessage.pdfContext}`

                    });

                }

                groqMessages.push(

                    ...conversation.messages.map(
                        msg => ({

                            role: msg.role,

                            content: msg.content

                        })
                    )

                );

                const textResult =
                    await generateTextResponse(
                        groqMessages
                    );

                aiResponse =
                    textResult.content;

                aiUsage =
                    textResult.usage;

                aiModel =
                    textResult.model;

            }

// -------------------------
// Save AI response
// -------------------------

conversation.messages.push({
    role: 'assistant',
    content: aiResponse
});

// -------------------------
// Save AI usage
// -------------------------

if (aiUsage) {
    await AiUsage.create({
        userId,
        conversationId: conversation._id,
        model: aiModel,
        promptTokens: aiUsage.prompt_tokens || 0,
        completionTokens: aiUsage.completion_tokens || 0,
        totalTokens: aiUsage.total_tokens || 0
    });
}

// Save conversation
await conversation.save();

const savedAssistantMessage =
    conversation.messages[conversation.messages.length - 1];

return res.status(200).json({
    conversationId: conversation._id,
    userMessage,
    assistantMessage: {
        _id: savedAssistantMessage._id,
        role: savedAssistantMessage.role,
        content: savedAssistantMessage.content
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
    authenticateUser,

    async (req, res) => {
        console.log(req.user)

        try {

            const conversations =
                await Conversation
                    .find({
                        // userId: '6a89adb932fa4c587cdc34f0'
                        userId: req.user.userId
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
    authenticateUser,

    async (req, res) => {

        try {

            const conversation =
                await Conversation.findOne({

                    _id:
                        req.params.id,

                    // userId: '6a89adb932fa4c587cdc34f0'
                    userId: req.user.userId

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

// ============================================================
// REGENERATE LAST AI RESPONSE
// ============================================================

router.post(
    '/regenerate',
    authenticateUser,

    // Use your authentication middleware in production.
    // If you are still temporarily testing locally without
    // authentication, keep the same userId strategy you
    // already use in your current chat route.
    // authenticateUser,

    async (req, res) => {

        try {

            const {
                conversationId
            } = req.body;


            // ---------------------------------------------
            // VALIDATION
            // ---------------------------------------------

            if (!conversationId) {

                return res.status(400).json({

                    message:
                        'conversationId is required'

                });

            }


            /*
             * IMPORTANT:
             *
             * Use the SAME userId logic that your existing
             * chat route currently uses.
             *
             * Production:
             *
             * const userId = req.user.userId;
             *
             * Local testing without auth:
             * use your existing test userId.
             */

            const userId =
                req.user?.userId;


            if (!userId) {

                return res.status(401).json({

                    message:
                        'Authentication required'

                });

            }


            // ---------------------------------------------
            // FIND CONVERSATION
            // ---------------------------------------------

            const conversation =
                await Conversation.findOne({

                    _id:
                        conversationId,

                    userId

                });


            if (!conversation) {

                return res.status(404).json({

                    message:
                        'Conversation not found'

                });

            }


            // ---------------------------------------------
            // FIND LAST ASSISTANT MESSAGE
            // ---------------------------------------------

            let lastAssistantIndex = -1;

            for (
                let i = conversation.messages.length - 1;
                i >= 0;
                i--
            ) {

                if (
                    conversation.messages[i].role ===
                    'assistant'
                ) {

                    lastAssistantIndex = i;

                    break;

                }

            }


            if (
                lastAssistantIndex === -1
            ) {

                return res.status(400).json({

                    message:
                        'No AI response available to regenerate'

                });

            }


            // ---------------------------------------------
            // FIND USER MESSAGE BEFORE AI RESPONSE
            // ---------------------------------------------

            let userMessageIndex = -1;

            for (
                let i = lastAssistantIndex - 1;
                i >= 0;
                i--
            ) {

                if (
                    conversation.messages[i].role ===
                    'user'
                ) {

                    userMessageIndex = i;

                    break;

                }

            }


            if (
                userMessageIndex === -1
            ) {

                return res.status(400).json({

                    message:
                        'Unable to find the original user message'

                });

            }


            const userMessage =
                conversation.messages[userMessageIndex];


            // ---------------------------------------------
            // PREPARE GROQ MESSAGES
            // ---------------------------------------------

            const pdfMessage =
                [...conversation.messages]
                    .slice(
                        0,
                        userMessageIndex + 1
                    )
                    .reverse()
                    .find(
                        msg => msg.pdfContext
                    );


            const groqMessages = [];


            if (pdfMessage) {

                groqMessages.push({

                    role: 'system',

                    content:
                        `The user previously uploaded a PDF document. Use the following content to answer questions when relevant. If the question is unrelated to the PDF, answer normally.\n\nPDF CONTENT:\n\n${pdfMessage.pdfContext}`

                });

            }


            /*
             * Only include messages BEFORE the old
             * assistant response.
             *
             * This means the model sees the same
             * conversation context as before.
             */

            const messagesBeforeAssistant =
                conversation.messages
                    .slice(
                        0,
                        lastAssistantIndex
                    )
                    .map(
                        msg => ({

                            role:
                                msg.role,

                            content:
                                msg.content

                        })
                    );


            groqMessages.push(
                ...messagesBeforeAssistant
            );


            // ---------------------------------------------
            // GENERATE NEW RESPONSE
            // ---------------------------------------------

            const aiResponse =
                await generateTextResponse(
                    groqMessages
                );


            // ---------------------------------------------
            // REPLACE OLD AI RESPONSE
            // ---------------------------------------------

            conversation.messages[
                lastAssistantIndex
            ].content =
                aiResponse;


            /*
             * Any previous feedback for this message
             * should no longer apply because its content
             * has changed.
             */

            await MessageFeedback.deleteMany({

                conversationId,

                messageId:
                    conversation.messages[
                        lastAssistantIndex
                    ]._id

            });


            await conversation.save();


            // ---------------------------------------------
            // RESPONSE
            // ---------------------------------------------

            return res.status(200).json({

                conversationId:
                    conversation._id,

                messageId:
                    conversation.messages[
                        lastAssistantIndex
                    ]._id,

                role:
                    'assistant',

                content:
                    aiResponse

            });


        } catch (error) {

            console.error(
                'Regenerate error:',
                error
            );


            return res.status(500).json({

                message:
                    'Failed to regenerate AI response'

            });

        }

    }
);

// ============================================================
// AI MESSAGE FEEDBACK
// ============================================================

router.post(
    '/feedback',

    authenticateUser,

    async (req, res) => {

        try {

            const {
                conversationId,
                messageId,
                feedback
            } = req.body;


            // ---------------------------------------------
            // VALIDATION
            // ---------------------------------------------

            if (
                !conversationId ||
                !messageId ||
                !feedback
            ) {

                return res.status(400).json({

                    message:
                        'conversationId, messageId and feedback are required'

                });

            }


            if (
                !['up', 'down'].includes(
                    feedback
                )
            ) {

                return res.status(400).json({

                    message:
                        'Feedback must be up or down'

                });

            }


            const userId =
                req.user?.userId;


            if (!userId) {

                return res.status(401).json({

                    message:
                        'Authentication required'

                });

            }


            // ---------------------------------------------
            // VERIFY CONVERSATION BELONGS TO USER
            // ---------------------------------------------

            const conversation =
                await Conversation.findOne({

                    _id:
                        conversationId,

                    userId

                });


            if (!conversation) {

                return res.status(404).json({

                    message:
                        'Conversation not found'

                });

            }


            // ---------------------------------------------
            // VERIFY MESSAGE EXISTS
            // ---------------------------------------------

            const message =
                conversation.messages.id(
                    messageId
                );


            if (!message) {

                return res.status(404).json({

                    message:
                        'Message not found'

                });

            }


            if (
                message.role !==
                'assistant'
            ) {

                return res.status(400).json({

                    message:
                        'Feedback can only be given to AI messages'

                });

            }


            // ---------------------------------------------
            // UPSERT FEEDBACK
            // ---------------------------------------------

            const savedFeedback =
                await MessageFeedback.findOneAndUpdate(

                    {
                        userId,

                        messageId
                    },

                    {
                        $set: {

                            conversationId,

                            feedback

                        }

                    },

                    {
                        new: true,

                        upsert: true,

                        setDefaultsOnInsert: true
                    }

                );


            return res.status(200).json({

                message:
                    'Feedback saved successfully',

                feedback:
                    savedFeedback.feedback

            });


        } catch (error) {

            console.error(
                'Feedback error:',
                error
            );


            return res.status(500).json({

                message:
                    'Failed to save feedback'

            });

        }

    }
);


// =====================================================
// EXPORT CONVERSATION AS PDF
// =====================================================

router.get(
    '/conversations/:id/pdf',

    authenticateUser,

    async (
        req,
        res
    ) => {

        try {

            const conversation =
                await Conversation.findOne({
                    _id: req.params.id,

                    // IMPORTANT:
                    // Replace with req.user.userId
                    // when authentication is enabled.
                    userId:
                        req.user?.userId
                });


            if (!conversation) {

                return res.status(404).json({

                    message:
                        'Conversation not found'

                });

            }


            const pdfBuffer =
                await generateConversationPdf(
                    conversation
                );


            const safeTitle =
                (
                    conversation.title ||
                    'conversation'
                )
                    .replace(
                        /[^a-z0-9]/gi,
                        '-'
                    )
                    .replace(
                        /-+/g,
                        '-'
                    )
                    .toLowerCase();


            res.setHeader(
                'Content-Type',
                'application/pdf'
            );


            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${safeTitle}.pdf"`
            );


            res.setHeader(
                'Content-Length',
                pdfBuffer.length
            );


            return res.send(
                pdfBuffer
            );


        } catch (error) {

            console.error(
                'Conversation PDF export error:',
                error
            );


            return res.status(500).json({

                message:
                    'Failed to generate conversation PDF'

            });

        }

    }
);

module.exports = router;