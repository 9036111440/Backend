const jwt = require('jsonwebtoken');

const authenticateUser = (req, res, next) => {

    try {

        const authHeader =
            req.headers.authorization;


        if (!authHeader) {

            return res.status(401).json({
                message: 'Authorization token required'
            });

        }


        const token =
            authHeader.startsWith('Bearer ')
                ? authHeader.substring(7)
                : authHeader;


        const decoded =
            jwt.verify(
                token,
                process.env.JWT_ACCESS_SECRET
            );


        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            message: 'Invalid or expired access token'
        });

    }

};


module.exports = authenticateUser;