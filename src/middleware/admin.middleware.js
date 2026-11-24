const User =
    require('../models/user.model');

const requireAdmin = async (
    req,
    res,
    next
) => {

    try {

        const user =
            await User.findById(
                req.user.userId
            ).select('role');

        // const user =  '6a89adb932fa4c587cdc34f0'

        if (!user) {

            return res.status(401).json({
                message: 'User not found'
            });

        }


        if (user.role !== 'admin') {

            return res.status(403).json({
                message: 'Admin access required'
            });

        }


        next();

    } catch (error) {

        console.error(
            'Admin authorization error:',
            error
        );

        return res.status(500).json({
            message: 'Authorization failed'
        });

    }
};


module.exports = requireAdmin;