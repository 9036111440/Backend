const crypto =
    require('crypto');

const {
    setValue,
    getValue,
    deleteValue
} =
    require('./redis.service');


// =============================================
// OTP SETTINGS
// =============================================

const OTP_EXPIRY_SECONDS =
    5 * 60;


// =============================================
// GENERATE OTP
// =============================================

const generateOtp =
    () => {

        return crypto
            .randomInt(
                100000,
                1000000
            )
            .toString();

    };


// =============================================
// CREATE REDIS KEY
// =============================================

const getOtpKey =
    (email) => {

        return `email-otp:${email.toLowerCase().trim()}`;

    };


// =============================================
// SAVE OTP
// =============================================

const saveOtp =
    async (
        email,
        otp
    ) => {

        const key =
            getOtpKey(email);


        await setValue(
            key,
            otp,
            OTP_EXPIRY_SECONDS
        );

    };


// =============================================
// GET OTP
// =============================================

const getOtp =
    async (
        email
    ) => {

        const key =
            getOtpKey(email);


        return await getValue(
            key
        );

    };


// =============================================
// DELETE OTP
// =============================================

const deleteOtp =
    async (
        email
    ) => {

        const key =
            getOtpKey(email);


        await deleteValue(
            key
        );

    };


// =============================================
// VERIFY OTP
// =============================================

const verifyOtp =
    async (
        email,
        enteredOtp
    ) => {

        const storedOtp =
            await getOtp(email);


        // OTP doesn't exist
        // means expired or never generated

        if (!storedOtp) {

            return {

                success:
                    false,

                reason:
                    'OTP_EXPIRED'

            };

        }


        // OTP mismatch

        if (
            storedOtp !==
            enteredOtp
        ) {

            return {

                success:
                    false,

                reason:
                    'INVALID_OTP'

            };

        }


        // OTP correct
        // Delete immediately so
        // it cannot be reused

        await deleteOtp(
            email
        );


        return {

            success:
                true

        };

    };


module.exports = {

    generateOtp,

    saveOtp,

    getOtp,

    deleteOtp,

    verifyOtp

};