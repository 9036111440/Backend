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

    content:
        aiResponse

});


// -------------------------
// Save AI usage
// -------------------------

if (aiUsage) {

    await AiUsage.create({

        userId,

        conversationId:
            conversation._id,

        model:
            aiModel,

        promptTokens:
            aiUsage.prompt_tokens || 0,

        completionTokens:
            aiUsage.completion_tokens || 0,

        totalTokens:
            aiUsage.total_tokens || 0

    });

}

            // Save conversation
await conversation.save();


// Save AI usage
if (aiUsage) {

    await AiUsage.create({

        userId,

        conversationId:
            conversation._id,

        model:
            aiModel,

        promptTokens:
            aiUsage.prompt_tokens || 0,

        completionTokens:
            aiUsage.completion_tokens || 0,

        totalTokens:
            aiUsage.total_tokens || 0

    });

}


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
    authenticateUser,

    async (req, res) => {
        console.log(req.user)

        try {

            const conversations =
                await Conversation
                    .find({
                        // userId: '6a89adb932fa4c587cdc34f0'
                       userId : req.user.userId
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


module.exports = router;