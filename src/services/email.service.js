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


module.exports = {
    sendOtpEmail,
    sendConversationPdfEmail
};