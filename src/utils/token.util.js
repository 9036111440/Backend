const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {

    return jwt.sign(
        {
            userId: user._id.toString(),
            email: user.email
        },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'
        }
    );
};


const generateRefreshToken = (user) => {

    return jwt.sign(
        {
            userId: user._id.toString(),
            email: user.email
        },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn:
                process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
        }
    );
};


module.exports = {
    generateAccessToken,
    generateRefreshToken
};