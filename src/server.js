require('dotenv').config();

const dns = require('dns');

dns.setServers([
  '8.8.8.8',
  '1.1.1.1'
]);
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const paymentRoutes =
    require('./routes/payment.routes');



const User = require('./models/user.model');
const EmailOtp = require('./models/otp.model');
const { sendOtpEmail } = require('./services/email.service');

const cookieParser = require('cookie-parser');

const {
    generateAccessToken,
    generateRefreshToken
} = require('./utils/token.util');

const chatRoutes =
    require('./routes/chat.routes');

const app = express();

app.use(
    cors({
        origin: 'http://localhost:4200',
        credentials: true,
        exposedHeaders: [
            'X-Access-Token',
            'X-Refresh-Token'
        ]
    })
);
app.use(express.json());
app.use(cookieParser());
app.use(
    '/api/chat',
    chatRoutes
);
app.use(
    '/api/payment',
    paymentRoutes
);

const PORT = process.env.PORT || 3000;


// MongoDB
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB connected successfully');
    })
    .catch((error) => {
        console.error('❌ MongoDB connection failed');
        console.error(error.message);
    });


// Test API
app.get('/', (req, res) => {

    res.json({
        message: 'AI Chatbot API is running'
    });

});


// Register
app.post('/api/auth/register', async (req, res) => {

    try {

        const {
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            verificationToken
        } = req.body;

                if (!verificationToken) {

            return res.status(400).json({
                message: 'Please verify your email first'
            });

        }


        let decodedToken;

        try {

            decodedToken = jwt.verify(
                verificationToken,
                process.env.JWT_SECRET
            );

        } catch (error) {

            return res.status(400).json({
                message:
                    'Email verification expired. Please verify your email again.'
            });

        }


        if (
            decodedToken.purpose !==
            'email-verification'
        ) {

            return res.status(400).json({
                message:
                    'Invalid email verification'
            });

        }


        const normalizedEmail =
            email.toLowerCase().trim();


        if (
            decodedToken.email !==
            normalizedEmail
        ) {

            return res.status(400).json({
                message:
                    'Verified email does not match registration email'
            });

        }

        // Required fields
        if (
            !firstName ||
            !lastName ||
            !email ||
            !password ||
            !confirmPassword
        ) {

            return res.status(400).json({
                message: 'All fields are required'
            });

        }


        // Password match
        if (password !== confirmPassword) {

            return res.status(400).json({
                message: 'Passwords do not match'
            });

        }


        // Password validation
        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{9,}$/;

        if (!passwordRegex.test(password)) {

            return res.status(400).json({
                message:
                    'Password must contain at least 9 characters, one uppercase, one lowercase, one number and one special character'
            });

        }


        // Check existing user
        const existingUser = await User.findOne({
            email: email.toLowerCase()
        });

        if (existingUser) {

            return res.status(409).json({
                message: 'Email already registered'
            });

        }

        

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);


        // Create user
        const user = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password: hashedPassword
        });


        await user.save();


        // Never return password
        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            }
        });

    } catch (error) {

        console.error('Registration error:', error);

        res.status(500).json({
            message: 'Something went wrong'
        });

    }

});

app.post('/api/auth/send-otp', async (req, res) => {

    try {

        const { email } = req.body;

        // Required validation
        if (!email) {

            return res.status(400).json({
                message: 'Email is required'
            });

        }

        const normalizedEmail = email.toLowerCase().trim();


        // Validate email format
        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(normalizedEmail)) {

            return res.status(400).json({
                message: 'Please provide a valid email'
            });

        }


        // Check if email already registered
        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {

            return res.status(409).json({
                message: 'Email already registered'
            });

        }


        // Generate 6 digit OTP
        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();


        // Hash OTP
        const hashedOtp = await bcrypt.hash(otp, 10);


        // Remove previous OTP
        await EmailOtp.deleteMany({
            email: normalizedEmail
        });


        // OTP expires in 5 minutes
        const expiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        );


        // Save OTP
        await EmailOtp.create({
            email: normalizedEmail,
            otp: hashedOtp,
            expiresAt
        });


        // Send email
        await sendOtpEmail(
            normalizedEmail,
            otp
        );


        res.status(200).json({
            message: 'OTP sent successfully'
        });


    } catch (error) {

        console.error('Send OTP error:', error);

        res.status(500).json({
            message: 'Failed to send OTP'
        });

    }

});

app.post('/api/auth/verify-otp', async (req, res) => {

    try {

        const {
            email,
            otp
        } = req.body;


        if (!email || !otp) {

            return res.status(400).json({
                message: 'Email and OTP are required'
            });

        }


        const normalizedEmail =
            email.toLowerCase().trim();


        // Find OTP
        const otpRecord = await EmailOtp
            .findOne({
                email: normalizedEmail
            })
            .sort({
                createdAt: -1
            });


        if (!otpRecord) {

            return res.status(400).json({
                message: 'OTP not found. Please request a new OTP.'
            });

        }


        // Check expiry
        if (
            new Date() > otpRecord.expiresAt
        ) {

            await EmailOtp.deleteOne({
                _id: otpRecord._id
            });

            return res.status(400).json({
                message: 'OTP has expired. Please request a new OTP.'
            });

        }


        // Maximum attempts
        if (otpRecord.attempts >= 5) {

            await EmailOtp.deleteOne({
                _id: otpRecord._id
            });

            return res.status(429).json({
                message:
                    'Too many incorrect attempts. Please request a new OTP.'
            });

        }


        // Compare OTP
        const isValidOtp =
            await bcrypt.compare(
                otp,
                otpRecord.otp
            );


        if (!isValidOtp) {

            otpRecord.attempts += 1;

            await otpRecord.save();

            return res.status(400).json({
                message: 'Invalid OTP'
            });

        }


        // OTP verified
        await EmailOtp.deleteOne({
            _id: otpRecord._id
        });


        // Generate verification token
        const verificationToken =
            jwt.sign(
                {
                    email: normalizedEmail,
                    purpose: 'email-verification'
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: '15m'
                }
            );


        res.status(200).json({

            message:
                'Email verified successfully',

            verificationToken

        });


    } catch (error) {

        console.error(
            'Verify OTP error:',
            error
        );

        res.status(500).json({
            message: 'Failed to verify OTP'
        });

    }

});

app.post('/api/auth/login', async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        // -----------------------------
        // Required validation
        // -----------------------------

        if (!email || !password) {

            return res.status(400).json({
                message: 'Email and password are required'
            });

        }


        const normalizedEmail =
            email.toLowerCase().trim();


        // -----------------------------
        // Find user
        // -----------------------------

        const user = await User.findOne({
            email: normalizedEmail
        });


        if (!user) {

            return res.status(401).json({
                message: 'Invalid email or password'
            });

        }


        // -----------------------------
        // Compare password
        // -----------------------------

        const isPasswordValid =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!isPasswordValid) {

            return res.status(401).json({
                message: 'Invalid email or password'
            });

        }


        // -----------------------------
        // Generate tokens
        // -----------------------------

        const accessToken =
            generateAccessToken(user);

        const refreshToken =
            generateRefreshToken(user);


        // -----------------------------
        // Send refresh token as cookie
        // -----------------------------

        res.cookie(
            'refreshToken',
            refreshToken,
            {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite:
                    process.env.NODE_ENV === 'production'
                        ? 'none'
                        : 'lax',

                maxAge: 7 * 24 * 60 * 60 * 1000
            }
        );


        // -----------------------------
        // Also send tokens in headers
        // -----------------------------

        res.setHeader(
            'X-Access-Token',
            accessToken
        );

        res.setHeader(
            'X-Refresh-Token',
            refreshToken
        );


        // -----------------------------
        // Response
        // -----------------------------

        return res.status(200).json({

            message: 'Login successful',

            accessToken,

            refreshToken,

            user: {

                id: user._id,

                firstName: user.firstName,

                lastName: user.lastName,

                email: user.email

            }

        });


    } catch (error) {

        console.error(
            'Login error:',
            error
        );

        return res.status(500).json({
            message: 'Something went wrong'
        });

    }

});


app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});