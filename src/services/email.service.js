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

    await transporter.sendMail({

        to,

        subject:
            `AI Chat Conversation - ${conversationTitle || 'Conversation'}`,

        text:
            `Your AI Chat conversation is attached as a PDF.`,

        attachments: [

            {
                filename:
                    fileName,

                content:
                    pdfBuffer,

                contentType:
                    'application/pdf'

            }

        ]

    });

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

module.exports = {
    sendOtpEmail,
    sendConversationPdfEmail,
    sendPasswordResetOtpEmail,

};