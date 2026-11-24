const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});


const { BrevoClient } = require('@getbrevo/brevo');

const brevo = new BrevoClient({
    apiKey: process.env.BREVO_API_KEY
});

const sendOtpEmail = async (email, otp) => {
    try {
        const result = await brevo.transactionalEmails.sendTransacEmail({
            sender: {
                name: 'AI Chatbot',
                email: process.env.EMAIL_FROM
            },
            to: [
                {
                    email: email
                }
            ],
            subject: 'AI Chatbot - Email Verification OTP',
            htmlContent: `
                <div style="font-family: Arial, sans-serif;">
                    <h2>Email Verification</h2>
                    <p>Your OTP is:</p>

                    <h1 style="letter-spacing: 5px;">
                        ${otp}
                    </h1>

                    <p>This OTP is valid for 5 minutes.</p>

                    <p>
                        If you did not request this OTP,
                        please ignore this email.
                    </p>
                </div>
            `
        });

        console.log('OTP email sent via Brevo:', result.messageId);

        return result;

    } catch (error) {
        console.error('Brevo OTP email error:', error);
        throw error;
    }
};



const sendConversationPdfEmail = async (
    to,
    pdfBuffer,
    fileName,
    conversationTitle
) => {
    try {
        const result =
            await brevo.transactionalEmails.sendTransacEmail({
                sender: {
                    name: 'AI Chatbot',
                    email: process.env.EMAIL_FROM
                },
                to: [
                    {
                        email: to
                    }
                ],
                subject: `AI Chat Conversation - ${
                    conversationTitle || 'Conversation'
                }`,
                textContent:
                    'Your AI Chat conversation is attached as a PDF.',
                attachment: [
                    {
                        name: fileName,
                        content: Buffer.from(pdfBuffer).toString('base64')
                    }
                ]
            });

        console.log('Conversation PDF email sent via Brevo:',
            result.messageId);

        return result;
    } catch (error) {
        console.error('Brevo PDF email error:', error);
        throw error;
    }
};



// =====================================================
// SEND PASSWORD RESET OTP EMAIL
// =====================================================

const sendPasswordResetOtpEmail = async (email, otp) => {
    try {
        const result = await brevo.transactionalEmails.sendTransacEmail({
            sender: {
                name: 'AI Chatbot',
                email: process.env.EMAIL_FROM
            },
            to: [
                {
                    email: email
                }
            ],
            subject: 'AI Chatbot - Password Reset OTP',
            htmlContent: `
                <div style="font-family: Arial, sans-serif;">
                    <h2>Password Reset</h2>

                    <p>Your password reset OTP is:</p>

                    <h1 style="letter-spacing: 5px;">
                        ${otp}
                    </h1>

                    <p>
                        This OTP is valid for 5 minutes.
                    </p>

                    <p>
                        Maximum attempts: 5.
                    </p>
                </div>
            `
        });

        console.log(
            'Password reset email sent via Brevo:',
            result.messageId
        );

        return result;

    } catch (error) {
        console.error(
            'Brevo password reset email error:',
            error
        );

        throw error;
    }
};


const sendPaymentInvoiceEmail = async ({
    email,
    customerName,
    invoiceNumber,
    paymentId,
    orderId,
    amount,
    paymentDate
}) => {
    const result =
        await brevo.transactionalEmails.sendTransacEmail({
            sender: {
                name: 'AI Chatbot',
                email: process.env.EMAIL_FROM
            },
            to: [{ email }],
            subject: `Payment Receipt - ${invoiceNumber}`,
            textContent: `
Hello ${customerName},

Thank you for purchasing AI Chatbot Pro!

PAYMENT RECEIPT

Invoice Number: ${invoiceNumber}
Customer: ${customerName}
Email: ${email}
Product: AI Chatbot Pro Subscription
Amount Paid: INR ${Number(amount).toFixed(2)}
Payment Status: Paid
Payment Date: ${paymentDate.toISOString()}

Razorpay Payment ID: ${paymentId}
Razorpay Order ID: ${orderId}

Thank you for your purchase!

AI Chatbot Team
            `.trim()
        });

    console.log(
        'Payment receipt email sent:',
        result.messageId
    );

    return result;
};


module.exports = {
    sendOtpEmail,
    sendConversationPdfEmail,
    sendPasswordResetOtpEmail,
    sendPaymentInvoiceEmail

};