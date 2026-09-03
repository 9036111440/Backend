const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});


const sendOtpEmail = async (email, otp) => {

    const mailOptions = {

        from: process.env.EMAIL_USER,

        to: email,

        subject: 'AI Chatbot - Email Verification OTP',

        html: `
            <div style="font-family: Arial, sans-serif;">

                <h2>Email Verification</h2>

                <p>
                    Your verification OTP is:
                </p>

                <h1 style="letter-spacing: 5px;">
                    ${otp}
                </h1>

                <p>
                    This OTP is valid for <strong>5 minutes</strong>.
                </p>

                <p>
                    If you did not request this OTP, please ignore this email.
                </p>

            </div>
        `
    };

    await transporter.sendMail(mailOptions);
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

const sendPasswordResetOtpEmail = async (
    email,
    otp
) => {

    await transporter.sendMail({

        from:
            process.env.EMAIL_USER,

        to:
            email,

        subject:
            'AI Chatbot - Password Reset OTP',

        html: `
            <div
                style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                "
            >

                <h2>
                    Reset Your Password
                </h2>

                <p>
                    Use the following OTP to reset
                    your AI Chatbot password:
                </p>

                <h1
                    style="
                        letter-spacing: 6px;
                        margin: 20px 0;
                    "
                >
                    ${otp}
                </h1>

                <p>
                    This OTP is valid for
                    <strong>5 minutes</strong>.
                </p>

                <p>
                    You have a maximum of
                    <strong>5 attempts</strong>
                    to enter the correct OTP.
                </p>

                <p>
                    If you did not request a password
                    reset, you can safely ignore this email.
                </p>

            </div>
        `
    });

};

module.exports = {
    sendOtpEmail,
    sendConversationPdfEmail,
    sendPasswordResetOtpEmail,

};