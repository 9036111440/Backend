const express = require('express');

const User =
    require('../models/user.model');

const Conversation =
    require('../models/conversation.model');

const Payment =
    require('../models/payment.model');


const MessageFeedback =
    require('../models/message-feedback.model');

const authenticateUser =
    require('../middleware/auth.middleware');

const requireAdmin =
    require('../middleware/admin.middleware');


const router =
    express.Router();

    router.get(
    '/overview',
    // authenticateUser,
    // requireAdmin,

    async (req, res) => {

        try {

            const [

                totalUsers,

                demoUsers,

                proUsers,

                totalConversations,

                totalMessages,

                activeUsers,

                totalLikes,

                totalDislikes

            ] = await Promise.all([

                User.countDocuments(),

                User.countDocuments({
                    plan: 'demo'
                }),

                User.countDocuments({
                    plan: 'pro'
                }),

                Conversation.countDocuments(),

                Conversation.aggregate([

                    {
                        $unwind: '$messages'
                    },

                    {
                        $count: 'count'
                    }

                ]),

                User.countDocuments({

                    lastLoginAt: {

                        $gte:
                            new Date(
                                Date.now()
                                -
                                24 * 60 * 60 * 1000
                            )

                    }

                }),

                 MessageFeedback.countDocuments({
        feedback: 'up'
    }),

    MessageFeedback.countDocuments({
        feedback: 'down'
    })

            ]);


            const paidPayments =
                await Payment.find({

                    status: 'paid'

                }).select('amount');


            const revenue =
                paidPayments.reduce(
                    (sum, payment) =>
                        sum + payment.amount,
                    0
                ) / 100;


            res.json({

                totalUsers,

                demoUsers,

                proUsers,

                activeUsers,

                totalConversations,

                totalMessages:
                    totalMessages[0]?.count || 0,
                
                totalLikes,

                totalDislikes,

                revenue

            });

        } catch (error) {

            console.error(
                'Admin overview error:',
                error
            );

            res.status(500).json({

                message:
                    'Failed to load admin dashboard'

            });

        }

    }
);

router.get(
    '/users-per-day',
    // authenticateUser,
    // requireAdmin,

    async (req, res) => {

        try {

            const data =
                await User.aggregate([

                    {
                        $group: {

                            _id: {
                                $dateToString: {
                                    format:
                                        '%Y-%m-%d',
                                    date:
                                        '$createdAt'
                                }
                            },

                            count: {
                                $sum: 1
                            }

                        }
                    },

                    {
                        $sort: {
                            _id: 1
                        }
                    }

                ]);


            res.json(data);

        } catch (error) {

            console.error(error);

            res.status(500).json({

                message:
                    'Failed to load user analytics'

            });

        }

    }
);

router.get(
    '/messages-per-day',
    // authenticateUser,
    // requireAdmin,

    async (req, res) => {

        try {

            const data =
                await Conversation.aggregate([

                    {
                        $unwind:
                            '$messages'
                    },

                    {
                        $group: {

                            _id: {
                                $dateToString: {
                                    format:
                                        '%Y-%m-%d',
                                    date:
                                        '$messages.createdAt'
                                }
                            },

                            count: {
                                $sum: 1
                            }

                        }
                    },

                    {
                        $sort: {
                            _id: 1
                        }
                    }

                ]);


            res.json(data);

        } catch (error) {

            console.error(error);

            res.status(500).json({

                message:
                    'Failed to load message analytics'

            });

        }

    }
);

router.get(
    '/pro-conversions',
    // authenticateUser,
    // requireAdmin,

    async (req, res) => {

        try {

            const data =
                await Payment.aggregate([

                    {
                        $match: {
                            status: 'paid',
                            plan: 'pro'
                        }
                    },

                    {
                        $group: {

                            _id: {
                                $dateToString: {
                                    format:
                                        '%Y-%m-%d',
                                    date:
                                        '$createdAt'
                                }
                            },

                            count: {
                                $sum: 1
                            }

                        }
                    },

                    {
                        $sort: {
                            _id: 1
                        }
                    }

                ]);


            res.json(data);

        } catch (error) {

            console.error(error);

            res.status(500).json({

                message:
                    'Failed to load conversion analytics'

            });

        }

    }
);

router.get(
    '/revenue',
    // authenticateUser,
    // requireAdmin,

    async (req, res) => {

        try {

            const data =
                await Payment.aggregate([

                    {
                        $match: {
                            status: 'paid'
                        }
                    },

                    {
                        $group: {

                            _id: {
                                $dateToString: {
                                    format:
                                        '%Y-%m-%d',
                                    date:
                                        '$createdAt'
                                }
                            },

                            revenue: {
                                $sum: '$amount'
                            }

                        }
                    },

                    {
                        $sort: {
                            _id: 1
                        }
                    }

                ]);


            const result =
                data.map(item => ({

                    date:
                        item._id,

                    revenue:
                        item.revenue / 100

                }));


            res.json(result);

        } catch (error) {

            console.error(error);

            res.status(500).json({

                message:
                    'Failed to load revenue analytics'

            });

        }

    }
);

router.get(
    '/recent-users',
    // authenticateUser,
    // requireAdmin,

    async (req, res) => {

        try {

            const users =
                await User.find()

                    .sort({
                        createdAt: -1
                    })

                    .limit(10)

                    .select(
                        'firstName lastName email plan role createdAt'
                    );


            res.json(users);

        } catch (error) {

            console.error(error);

            res.status(500).json({

                message:
                    'Failed to load recent users'

            });

        }

    }
);


module.exports = router;