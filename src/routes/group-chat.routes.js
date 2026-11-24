const express =
    require('express');

const router =
    express.Router();


const authenticateUser =
    require('../middleware/auth.middleware');


const {
    createGroup,
    createInvite,
    joinGroup,
    getGroup,
    removeMember
} =
    require('../services/group-chat.service');


// =============================================
// CREATE GROUP
// =============================================

router.post(
    '/create',
    authenticateUser,
    async (req, res) => {

        try {

            const userId =
                req.user.userId;


            const {
                title
            } =
                req.body;


            const conversation =
                await createGroup(
                    userId,
                    title
                );


            return res.status(201).json({

                message:
                    'Group created successfully',

                conversationId:
                    conversation._id,

                title:
                    conversation.title,

                isGroup:
                    conversation.isGroup

            });

        }

        catch (error) {

            console.error(
                'Create group error:',
                error
            );


            return res.status(500).json({

                message:
                    'Failed to create group'

            });

        }

    }
);


// =============================================
// CREATE INVITE
// =============================================

router.post(
    '/:conversationId/invite',
    authenticateUser,
    async (req, res) => {

        try {

            const userId =
                req.user.userId;


            const {
                conversationId
            } =
                req.params;


            const invite =
                await createInvite(
                    conversationId,
                    userId
                );


            return res.status(201).json({

                message:
                    'Invitation created successfully',

                token:
                    invite.token,

                expiresAt:
                    invite.expiresAt

            });

        }

        catch (error) {

            console.error(
                'Create invite error:',
                error
            );


            return res.status(403).json({

                message:
                    error.message

            });

        }

    }
);


// =============================================
// JOIN GROUP
// =============================================

router.post(
    '/join/:token',
    authenticateUser,
    async (req, res) => {

        try {

            const userId =
                req.user.userId;


            const {
                token
            } =
                req.params;


            const conversation =
                await joinGroup(
                    token,
                    userId
                );


            return res.status(200).json({

                message:
                    'Joined group successfully',

                conversationId:
                    conversation._id,

                title:
                    conversation.title

            });

        }

        catch (error) {

            console.error(
                'Join group error:',
                error
            );


            return res.status(400).json({

                message:
                    error.message

            });

        }

    }
);


// =============================================
// GET GROUP
// =============================================

router.get(
    '/:conversationId',
    authenticateUser,
    async (req, res) => {

        try {

            const userId =
                req.user.userId;


            const {
                conversationId
            } =
                req.params;


            const conversation =
                await getGroup(
                    conversationId,
                    userId
                );


            if (!conversation) {

                return res.status(404).json({

                    message:
                        'Group not found'

                });

            }


            return res.status(200).json(
                conversation
            );

        }

        catch (error) {

            console.error(
                'Get group error:',
                error
            );


            return res.status(500).json({

                message:
                    'Failed to get group'

            });

        }

    }
);


// =============================================
// GET MEMBERS
// =============================================

router.get(
    '/:conversationId/members',
    authenticateUser,
    async (req, res) => {

        try {

            const userId =
                req.user.userId;


            const {
                conversationId
            } =
                req.params;


            const conversation =
                await getGroup(
                    conversationId,
                    userId
                );


            if (!conversation) {

                return res.status(404).json({

                    message:
                        'Group not found'

                });

            }


            return res.status(200).json({

                members:
                    conversation.participants

            });

        }

        catch (error) {

            console.error(
                'Get members error:',
                error
            );


            return res.status(500).json({

                message:
                    'Failed to get members'

            });

        }

    }
);


// =============================================
// REMOVE MEMBER
// =============================================

router.delete(
    '/:conversationId/members/:memberId',
    authenticateUser,
    async (req, res) => {

        try {

            const ownerId =
                req.user.userId;


            const {
                conversationId,
                memberId
            } =
                req.params;


            const conversation =
                await removeMember(
                    conversationId,
                    ownerId,
                    memberId
                );


            return res.status(200).json({

                message:
                    'Member removed successfully',

                conversationId:
                    conversation._id

            });

        }

        catch (error) {

            console.error(
                'Remove member error:',
                error
            );


            return res.status(403).json({

                message:
                    error.message

            });

        }

    }
);


module.exports =
    router;