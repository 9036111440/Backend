const mongoose = require('mongoose');

const messageFeedbackSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true
        },

        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        feedback: {
            type: String,
            enum: ['up', 'down'],
            required: true
        }
    },
    {
        timestamps: true
    }
);


/*
 * One user can have only one feedback
 * for one specific AI message.
 */
messageFeedbackSchema.index(
    {
        userId: 1,
        messageId: 1
    },
    {
        unique: true
    }
);


module.exports =
    mongoose.model(
        'MessageFeedback',
        messageFeedbackSchema
    );