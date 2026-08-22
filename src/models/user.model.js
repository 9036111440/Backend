const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true
        },

        lastName: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },
        plan: {
            type: String,
            enum: ['demo', 'pro'],
            default: 'demo'
        },

        proActivatedAt: {
            type: Date,
            default: null
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        },
        lastLoginAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('User', userSchema);