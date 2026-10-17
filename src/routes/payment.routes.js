const express = require('express');

const crypto = require('crypto');


const {
    sendPaymentInvoiceEmail
} = require('../services/email.service');

const razorpay =
    require('../services/razorpay.service');

const User =
    require('../models/user.model');

const Payment =
    require('../models/payment.model');

    const authenticateUser =
        require('../middleware/auth.middleware');


const router =
    express.Router();


// ==========================================
// CREATE RAZORPAY ORDER
// ==========================================

router.post(
    '/create-order',
    authenticateUser,

    async (req, res) => {

        try {

            // const userId =
                process.env.TEST_USER_ID;

                const userId =req.user.userId



            // --------------------------------
            // Find user
            // --------------------------------

            const user =
                await User.findById(
                    userId
                );


            if (!user) {

                return res.status(404).json({

                    message:
                        'User not found'

                });

            }


            // --------------------------------
            // Already Pro?
            // --------------------------------

            if (
                user.plan === 'pro'
            ) {

                return res.status(400).json({

                    message:
                        'User is already Pro'

                });

            }


            // --------------------------------
            // PRO PRICE
            // --------------------------------

            // ₹99
            // Razorpay expects paise

            const amount =
                99 * 100;


            // --------------------------------
            // Create Razorpay order
            // --------------------------------

            const order =
                await razorpay.orders.create({

                    amount,

                    currency: 'INR',

                    receipt:
                        `pro_${userId}_${Date.now()}`,

                    notes: {

                        userId:
                            userId.toString(),

                        plan:
                            'pro'

                    }

                });


            // --------------------------------
            // Save payment
            // --------------------------------

            await Payment.create({

                userId,

                razorpayOrderId:
                    order.id,

                amount,

                currency: 'INR',

                plan: 'pro',

                status: 'created'

            });


            return res.status(200).json({

                keyId:
                    process.env.RAZORPAY_KEY_ID,

                orderId:
                    order.id,

                amount:
                    order.amount,

                currency:
                    order.currency

            });


        } catch (error) {

            console.error(
                'Create order error:',
                error
            );


            return res.status(500).json({

                message:
                    'Unable to create payment order'

            });

        }

    }
);


// ==========================================
// VERIFY PAYMENT
// ==========================================

router.post(
    '/verify',

    async (req, res) => {

        try {

            const {

                razorpay_payment_id,

                razorpay_order_id,

                razorpay_signature

            } = req.body;


            // --------------------------------
            // Validate request
            // --------------------------------

            if (
                !razorpay_payment_id ||
                !razorpay_order_id ||
                !razorpay_signature
            ) {

                return res.status(400).json({

                    message:
                        'Invalid payment response'

                });

            }


            // --------------------------------
            // Find our order
            // --------------------------------

            const payment =
                await Payment.findOne({

                    razorpayOrderId:
                        razorpay_order_id

                });


            if (!payment) {

                return res.status(404).json({

                    message:
                        'Payment order not found'

                });

            }


            // --------------------------------
            // Create signature
            // --------------------------------

            const generatedSignature =
                crypto
                    .createHmac(
                        'sha256',
                        process.env.RAZORPAY_KEY_SECRET
                    )
                    .update(
                        `${payment.razorpayOrderId}|${razorpay_payment_id}`
                    )
                    .digest('hex');


            // --------------------------------
            // Compare signatures
            // --------------------------------

            const valid =
                crypto.timingSafeEqual(

                    Buffer.from(
                        generatedSignature
                    ),

                    Buffer.from(
                        razorpay_signature
                    )

                );


            if (!valid) {

                payment.status =
                    'failed';

                await payment.save();


                return res.status(400).json({

                    message:
                        'Payment verification failed'

                });

            }


            // --------------------------------
            // Payment verified
            // --------------------------------

            payment.razorpayPaymentId =
                razorpay_payment_id;

            payment.razorpaySignature =
                razorpay_signature;

            payment.status =
                'paid';


            await payment.save();


            // --------------------------------
            // Upgrade user
            // --------------------------------

            const user =
                await User.findById(
                    payment.userId
                );


            if (!user) {

                return res.status(404).json({

                    message:
                        'User not found'

                });

            }


            user.plan =
                'pro';

            user.proActivatedAt =
                new Date();


            await user.save();

            
try {
    if (!user.email) {
        throw new Error('Customer email is missing');
    }

    const paymentDate = new Date();

    await sendPaymentInvoiceEmail({
        email: user.email,
        customerName:
            user.name || user.username || 'Customer',
        invoiceNumber: `INV-${payment.razorpayPaymentId}`,
        paymentId: payment.razorpayPaymentId,
        orderId: payment.razorpayOrderId,
        amount: payment.amount / 100,
        paymentDate
    });
} catch (emailError) {
    // Payment has succeeded. Email failure must not
    // turn a successful payment into an API failure.
    console.error(
        'Payment receipt email failed:',
        emailError
    );
}



            return res.status(200).json({

                success: true,

                message:
                    'Payment successful. Pro plan activated.',

                plan:
                    user.plan

            });


        } catch (error) {

            console.error(
                'Payment verification error:',
                error
            );


            return res.status(500).json({

                message:
                    'Payment verification failed'

            });

        }

    }
);


// ==========================================
// GET CURRENT PLAN
// ==========================================

router.get(
    '/plan',
    authenticateUser,

    async (req, res) => {

        try {

            const userId = req.user.userId


            const user =
                await User.findById(
                    userId
                ).select(
                    'plan proActivatedAt'
                );


            if (!user) {

                return res.status(404).json({

                    message:
                        'User not found'

                });

            }


            return res.json({

                plan:
                    user.plan,

                proActivatedAt:
                    user.proActivatedAt

            });


        } catch (error) {

            console.error(error);


            return res.status(500).json({

                message:
                    'Unable to get plan'

            });

        }

    }
);


module.exports =
    router;