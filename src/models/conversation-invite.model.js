const mongoose = require('mongoose');

const conversationInviteSchema =
    new mongoose.Schema(
        {

            conversationId: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref: 'Conversation',

                required: true,

                index: true
            },

            tokenHash: {
                type: String,

                required: true,

                unique: true,

                index: true
            },

            createdBy: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref: 'User',

                required: true
            },

            expiresAt: {
                type: Date,

                required: true,

                index: true
            }

        },
        {
            timestamps: true
        }
    );

module.exports =
    mongoose.model(
        'ConversationInvite',
        conversationInviteSchema
    );