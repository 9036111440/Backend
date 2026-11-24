const jwt = require('jsonwebtoken');

const mongoose =
    require('mongoose');

const Conversation =
    require('../models/conversation.model');

const User =
    require('../models/user.model');

const {
    generateTextResponse
} =
    require('./groq.service');


// =============================================
// INITIALIZE SOCKET.IO
// =============================================

const initializeSocket = (io) => {

    // =========================================
    // SOCKET AUTHENTICATION
    // =========================================

    io.use((socket, next) => {

        try {

            const token =
                socket.handshake.auth?.token;


            if (!token) {

                return next(
                    new Error(
                        'Authentication token required'
                    )
                );

            }


            const decoded =
                jwt.verify(
                    token,
                    process.env.JWT_ACCESS_SECRET
                );


            if (!decoded.userId) {

                return next(
                    new Error(
                        'Invalid authentication token'
                    )
                );

            }


            // Store authenticated user

            socket.userId =
                decoded.userId;


            socket.userEmail =
                decoded.email;


            next();

        }

        catch (error) {

            console.error(
                'Socket authentication error:',
                error.message
            );


            next(
                new Error(
                    'Invalid or expired token'
                )
            );

        }

    });


    // =========================================
    // NEW SOCKET CONNECTION
    // =========================================

    io.on(
        'connection',
        (socket) => {

            console.log(
                `🔌 Socket connected: ${socket.id}`
            );

            console.log(
                `👤 User: ${socket.userId}`
            );


            // =================================
            // JOIN GROUP ROOM
            // =================================

            socket.on(
                'join-group',
                async (conversationId) => {

                    try {

                        if (!conversationId) {

                            socket.emit(
                                'group-error',
                                {
                                    message:
                                        'Conversation ID is required'
                                }
                            );

                            return;

                        }


                        // Validate MongoDB ObjectId

                        if (
                            !mongoose.Types.ObjectId.isValid(
                                conversationId
                            )
                        ) {

                            socket.emit(
                                'group-error',
                                {
                                    message:
                                        'Invalid conversation ID'
                                }
                            );

                            return;

                        }


                        // Check membership

                        const conversation =
                            await Conversation.findOne({

                                _id:
                                    conversationId,

                                isGroup:
                                    true,

                                $or: [

                                    {
                                        userId:
                                            socket.userId
                                    },

                                    {
                                        'participants.userId':
                                            socket.userId
                                    }

                                ]

                            });


                        if (!conversation) {

                            socket.emit(
                                'group-error',
                                {
                                    message:
                                        'You are not a member of this group'
                                }
                            );

                            return;

                        }


                        const roomName =
                            `conversation:${conversationId}`;


                        socket.join(
                            roomName
                        );


                        console.log(
                            `👥 User ${socket.userId} joined ${roomName}`
                        );


                        socket.emit(
                            'group-joined',
                            {
                                conversationId
                            }
                        );

                    }

                    catch (error) {

                        console.error(
                            'Join group socket error:',
                            error
                        );


                        socket.emit(
                            'group-error',
                            {
                                message:
                                    'Failed to join group'
                            }
                        );

                    }

                }
            );


            // =================================
            // SEND GROUP MESSAGE
            // =================================

            socket.on(
                'send-group-message',
                async (
                    data,
                    callback
                ) => {

                    try {

                        // ---------------------------------
                        // Read data
                        // ---------------------------------

                        const conversationId =
                            data?.conversationId;

                        const message =
                            typeof data?.message ===
                            'string'
                                ? data.message.trim()
                                : '';


                        // ---------------------------------
                        // Basic validation
                        // ---------------------------------

                        if (!conversationId) {

                            const errorResponse = {

                                code:
                                    'INVALID_CONVERSATION',

                                message:
                                    'Conversation ID is required'

                            };


                            socket.emit(
                                'group-error',
                                errorResponse
                            );


                            if (callback) {
                                callback(errorResponse);
                            }


                            return;

                        }


                        if (!message) {

                            const errorResponse = {

                                code:
                                    'EMPTY_MESSAGE',

                                message:
                                    'Message cannot be empty'

                            };


                            socket.emit(
                                'group-error',
                                errorResponse
                            );


                            if (callback) {
                                callback(errorResponse);
                            }


                            return;

                        }


                        if (
                            message.length >
                            6000
                        ) {

                            const errorResponse = {

                                code:
                                    'MESSAGE_TOO_LONG',

                                message:
                                    'Message is too long'

                            };


                            socket.emit(
                                'group-error',
                                errorResponse
                            );


                            if (callback) {
                                callback(errorResponse);
                            }


                            return;

                        }


                        // ---------------------------------
                        // Validate ObjectId
                        // ---------------------------------

                        if (
                            !mongoose.Types.ObjectId.isValid(
                                conversationId
                            )
                        ) {

                            const errorResponse = {

                                code:
                                    'INVALID_CONVERSATION',

                                message:
                                    'Invalid conversation ID'

                            };


                            socket.emit(
                                'group-error',
                                errorResponse
                            );


                            if (callback) {
                                callback(errorResponse);
                            }


                            return;

                        }


                        // ---------------------------------
                        // Find authenticated user
                        // ---------------------------------

                        const user =
                            await User.findById(
                                socket.userId
                            )
                            .select(
                                'firstName lastName email plan'
                            );


                        if (!user) {

                            const errorResponse = {

                                code:
                                    'USER_NOT_FOUND',

                                message:
                                    'User not found'

                            };


                            socket.emit(
                                'group-error',
                                errorResponse
                            );


                            if (callback) {
                                callback(errorResponse);
                            }


                            return;

                        }


                        // ---------------------------------
                        // Verify group membership
                        // ---------------------------------

                        const conversation =
                            await Conversation.findOne({

                                _id:
                                    conversationId,

                                isGroup:
                                    true,

                                $or: [

                                    {
                                        userId:
                                            socket.userId
                                    },

                                    {
                                        'participants.userId':
                                            socket.userId
                                    }

                                ]

                            });


                        if (!conversation) {

                            const errorResponse = {

                                code:
                                    'NOT_A_MEMBER',

                                message:
                                    'You are not a member of this group'

                            };


                            socket.emit(
                                'group-error',
                                errorResponse
                            );


                            if (callback) {
                                callback(errorResponse);
                            }


                            return;

                        }


                        // ---------------------------------
                        // Make sure sender is in room
                        // ---------------------------------

                        const roomName =
                            `conversation:${conversationId}`;


                        const room =
                            io.sockets.adapter.rooms.get(
                                roomName
                            );


                        const isInRoom =
                            room &&
                            room.has(socket.id);


                        if (!isInRoom) {

                            const errorResponse = {

                                code:
                                    'NOT_IN_ROOM',

                                message:
                                    'Join the group before sending messages'

                            };


                            socket.emit(
                                'group-error',
                                errorResponse
                            );


                            if (callback) {
                                callback(errorResponse);
                            }


                            return;

                        }


                        // ---------------------------------
                        // Sender name
                        // ---------------------------------

                        const senderName =
                            `${user.firstName} ${user.lastName}`
                                .trim();


                        // ---------------------------------
                        // Create user message
                        // ---------------------------------

                        const userMessage = {

                            role:
                                'user',

                            content:
                                message,

                            senderId:
                                user._id,

                            senderName:

                                senderName ||
                                user.email

                        };


                        // ---------------------------------
                        // Save user message
                        // ---------------------------------

                        conversation.messages.push(
                            userMessage
                        );


                        await conversation.save();


                        // Get the actual saved message
                        const savedUserMessage =
                            conversation.messages[
                                conversation.messages.length - 1
                            ];


                        // ---------------------------------
                        // Broadcast user message
                        // ---------------------------------

                        io.to(
                            roomName
                        ).emit(
                            'group-message',
                            {
                                message:
                                    savedUserMessage,

                                conversationId
                            }
                        );


                        // ---------------------------------
                        // Tell sender message was accepted
                        // ---------------------------------

                        if (callback) {

                            callback({

                                success:
                                    true,

                                messageId:
                                    savedUserMessage._id

                            });

                        }


                        // =================================
                        // BUILD SHARED AI CONTEXT
                        // =================================

                        const groqMessages =
                            conversation.messages
                                .map(
                                    (msg) => {

                                        // ---------------------------------
                                        // AI messages
                                        // ---------------------------------

                                        if (
                                            msg.role ===
                                            'assistant'
                                        ) {

                                            return {

                                                role:
                                                    'assistant',

                                                content:
                                                    msg.content

                                            };

                                        }


                                        // ---------------------------------
                                        // Human messages
                                        // ---------------------------------

                                        const name =
                                            msg.senderName ||
                                            'User';


                                        return {

                                            role:
                                                'user',

                                            content:
                                                `${name}: ${msg.content}`

                                        };

                                    }
                                );


                        // ---------------------------------
                        // Generate AI response
                        // ---------------------------------

                        console.log(
                            `🤖 Generating group AI response for ${conversationId}`
                        );


                        const aiResponse =
                            await generateTextResponse(
                                groqMessages
                            );


                        // ---------------------------------
                        // Validate AI response
                        // ---------------------------------

                        if (
                            !aiResponse ||
                            !aiResponse.content
                        ) {

                            throw new Error(
                                'AI returned an empty response'
                            );

                        }


                        // ---------------------------------
                        // Save AI response
                        // ---------------------------------

                        conversation.messages.push({

                            role:
                                'assistant',

                            content:
                                aiResponse.content

                        });


                        await conversation.save();


                        const savedAssistantMessage =
                            conversation.messages[
                                conversation.messages.length - 1
                            ];


                        // ---------------------------------
                        // Broadcast AI response
                        // ---------------------------------

                        io.to(
                            roomName
                        ).emit(
                            'group-ai-response',
                            {

                                message:
                                    savedAssistantMessage,

                                conversationId,

                                usage:
                                    aiResponse.usage,

                                model:
                                    aiResponse.model

                            }
                        );


                        console.log(
                            `🤖 Group AI response sent to ${roomName}`
                        );

                    }

                    catch (error) {

                        console.error(
                            'Send group message error:',
                            error
                        );


                        const errorResponse = {

                            code:
                                'GROUP_MESSAGE_FAILED',

                            message:
                                error.message ||
                                'Failed to send group message'

                        };


                        socket.emit(
                            'group-error',
                            errorResponse
                        );


                        if (callback) {

                            callback({

                                success:
                                    false,

                                ...errorResponse

                            });

                        }

                    }

                }
            );


            // =================================
            // LEAVE GROUP ROOM
            // =================================

            socket.on(
                'leave-group',
                (conversationId) => {

                    if (!conversationId) {

                        return;

                    }


                    const roomName =
                        `conversation:${conversationId}`;


                    socket.leave(
                        roomName
                    );


                    console.log(
                        `🚪 User ${socket.userId} left ${roomName}`
                    );

                }
            );


            // =================================
            // DISCONNECT
            // =================================

            socket.on(
                'disconnect',
                (reason) => {

                    console.log(
                        `🔌 Socket disconnected: ${socket.id}`
                    );

                    console.log(
                        `Reason: ${reason}`
                    );

                }
            );

        }
    );

};


module.exports =
    initializeSocket;