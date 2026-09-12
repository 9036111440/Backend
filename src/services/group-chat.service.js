const crypto = require('crypto');

const Conversation =
    require('../models/conversation.model');

const ConversationInvite =
    require('../models/conversation-invite.model');


// =============================================
// CREATE SECURE INVITE TOKEN
// =============================================

const generateInviteToken = () => {

    return crypto
        .randomBytes(32)
        .toString('hex');

};


// =============================================
// HASH INVITE TOKEN
// =============================================

const hashInviteToken = (token) => {

    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

};


// =============================================
// CREATE GROUP
// =============================================

const createGroup = async (
    userId,
    title
) => {

    const groupTitle =
        title &&
        title.trim()
            ? title.trim()
            : 'New Group Chat';


    const conversation =
        new Conversation({

            userId,

            title:
                groupTitle,

            isGroup:
                true,

            participants: [
                {
                    userId,

                    role:
                        'owner'
                }
            ],

            messages: []

        });


    await conversation.save();


    return conversation;

};


// =============================================
// CREATE INVITE
// =============================================

const createInvite = async (
    conversationId,
    userId
) => {

    const conversation =
        await Conversation.findOne({

            _id:
                conversationId,

            isGroup:
                true,

            userId

        });


    if (!conversation) {

        throw new Error(
            'Group not found or user is not the owner'
        );

    }


    const rawToken =
        generateInviteToken();


    const tokenHash =
        hashInviteToken(
            rawToken
        );


    // Invite valid for 24 hours
    const expiresAt =
        new Date(
            Date.now() +
            24 * 60 * 60 * 1000
        );


    await ConversationInvite.create({

        conversationId,

        tokenHash,

        createdBy:
            userId,

        expiresAt

    });


    return {

        token:
            rawToken,

        expiresAt

    };

};


// =============================================
// JOIN GROUP USING INVITE
// =============================================

const joinGroup = async (
    token,
    userId
) => {

    const tokenHash =
        hashInviteToken(
            token
        );


    const invite =
        await ConversationInvite.findOne({

            tokenHash,

            expiresAt: {
                $gt:
                    new Date()
            }

        });


    if (!invite) {

        throw new Error(
            'Invalid or expired invitation'
        );

    }


    const conversation =
        await Conversation.findOne({

            _id:
                invite.conversationId,

            isGroup:
                true

        });


    if (!conversation) {

        throw new Error(
            'Group conversation not found'
        );

    }


    const alreadyMember =
        conversation.participants
            .some(
                participant =>
                    participant.userId
                        .toString() ===
                    userId.toString()
            );


    if (!alreadyMember) {

        conversation.participants.push({

            userId,

            role:
                'member',

            joinedAt:
                new Date()

        });


        await conversation.save();

    }


    return conversation;

};


// =============================================
// GET GROUP
// =============================================

const getGroup = async (
    conversationId,
    userId
) => {

    const conversation =
        await Conversation.findOne({

            _id:
                conversationId,

            isGroup:
                true,

            $or: [

                {
                    userId
                },

                {
                    'participants.userId':
                        userId
                }

            ]

        })
        .populate(
            'participants.userId',
            'firstName lastName email'
        );


    return conversation;

};


// =============================================
// REMOVE MEMBER
// =============================================

const removeMember = async (
    conversationId,
    ownerId,
    memberId
) => {

    const conversation =
        await Conversation.findOne({

            _id:
                conversationId,

            isGroup:
                true,

            userId:
                ownerId

        });


    if (!conversation) {

        throw new Error(
            'Group not found or user is not the owner'
        );

    }


    if (
        ownerId.toString() ===
        memberId.toString()
    ) {

        throw new Error(
            'Owner cannot be removed'
        );

    }


    conversation.participants =
        conversation.participants
            .filter(
                participant =>
                    participant.userId
                        .toString() !==
                    memberId.toString()
            );


    await conversation.save();


    return conversation;

};


// =============================================
// EXPORT
// =============================================

module.exports = {

    createGroup,

    createInvite,

    joinGroup,

    getGroup,

    removeMember,

    generateInviteToken,

    hashInviteToken

};