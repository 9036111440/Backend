const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: true
        },

        content: {
            type: String,
            required: true
        },

        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },

        senderName: {
            type: String,
            trim: true
        },

        attachment: {
            type: {
                type: String
            },

            fileName: {
                type: String
            },

            mimeType: {
                type: String
            },

            fileUrl: {
                type: String
            }
        },

        pdfContext: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);


const conversationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        title: {
            type: String,
            default: 'New Chat'
        },
        isGroup: {
            type: Boolean,
            default: false
        },

        participants: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                    required: true
                },

                role: {
                    type: String,
                    enum: [
                        'owner',
                        'member'
                    ],
                    default: 'member'
                },

                joinedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],

        messages: {
            type: [messageSchema],
            default: []
        }
    },
    {
        timestamps: true
    }
);


module.exports =
    mongoose.model(
        'Conversation',
        conversationSchema
    );