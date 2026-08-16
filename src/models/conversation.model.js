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