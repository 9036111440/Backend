const mongoose =
    require('mongoose');


const aiUsageSchema =
    new mongoose.Schema({

        userId: {
            type:
                mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        conversationId: {
            type:
                mongoose.Schema.Types.ObjectId,
            ref: 'Conversation'
        },

        model: {
            type: String
        },

        promptTokens: {
            type: Number,
            default: 0
        },

        completionTokens: {
            type: Number,
            default: 0
        },

        totalTokens: {
            type: Number,
            default: 0
        }

    }, {
        timestamps: true
    });


module.exports =
    mongoose.model(
        'AiUsage',
        aiUsageSchema
    );