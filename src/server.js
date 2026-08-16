const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

require('dotenv').config();

const User = require('./models/user.model');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
// Gmail transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Temporary OTP storage
const otpStore = new Map();

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
            confirmPassword
        } = req.body;


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
//checking the connection to gmail
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Gmail connection failed:', error.message);
    } else {
        console.log('✅ Gmail is ready to send emails');
    }
});

app.listen(PORT, () => {

    console.log(
        `🚀 Server running on http://localhost:${PORT}`
    );

});