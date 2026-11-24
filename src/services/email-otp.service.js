const crypto = require('crypto');

const {
    setValue,
    getValue,
    deleteValue
} = require('./redis.service');


// =============================================
// OTP CONFIGURATION
// =============================================

const OTP_EXPIRY_SECONDS = 5 * 60;

const MAX_ATTEMPTS = 5;


// =============================================
// REDIS KEY
// =============================================

const getOtpKey = (email) => {

    return `email-otp:${email.toLowerCase().trim()}`;

};


const getAttemptsKey = (email) => {

    return `email-otp-attempts:${email.toLowerCase().trim()}`;

};


// =============================================
// GENERATE OTP
// =============================================

const generateOtp = () => {

    return crypto
        .randomInt(100000, 1000000)
        .toString();

};


// =============================================
// SAVE OTP
// =============================================

const saveOtp = async (
    email,
    otp
) => {

    const normalizedEmail =
        email.toLowerCase().trim();


    await setValue(
        getOtpKey(normalizedEmail),
        otp,
        OTP_EXPIRY_SECONDS
    );


    // Reset attempts whenever a new OTP is generated

    await setValue(
        getAttemptsKey(normalizedEmail),
        '0',
        OTP_EXPIRY_SECONDS
    );

};


// =============================================
// GET OTP
// =============================================

const getOtp = async (
    email
) => {

    return await getValue(
        getOtpKey(email)
    );

};


// =============================================
// GET ATTEMPTS
// =============================================

const getAttempts = async (
    email
) => {

    const attempts =
        await getValue(
            getAttemptsKey(email)
        );


    return Number(
        attempts || 0
    );

};


// =============================================
// INCREMENT ATTEMPTS
// =============================================

const incrementAttempts = async (
    email
) => {

    const key =
        getAttemptsKey(email);


    const currentAttempts =
        await getAttempts(email);


    const newAttempts =
        currentAttempts + 1;


    // Keep the same 5-minute lifetime

    await setValue(
        key,
        newAttempts.toString(),
        OTP_EXPIRY_SECONDS
    );


    return newAttempts;

};


// =============================================
// DELETE OTP
// =============================================

const deleteOtp = async (
    email
) => {

    await deleteValue(
        getOtpKey(email)
    );


    await deleteValue(
        getAttemptsKey(email)
    );

};


// =============================================
// VERIFY OTP
// =============================================

const verifyOtp = async (
    email,
    enteredOtp
) => {

    const storedOtp =
        await getOtp(email);


    // OTP doesn't exist
    // Usually means expired

    if (!storedOtp) {

        return {

            success: false,

            reason: 'OTP_EXPIRED'

        };

    }


    const attempts =
        await getAttempts(email);


    if (
        attempts >= MAX_ATTEMPTS
    ) {

        await deleteOtp(email);


        return {

            success: false,

            reason: 'MAX_ATTEMPTS'

        };

    }


    if (
        storedOtp !== enteredOtp
    ) {

        const newAttempts =
            await incrementAttempts(
                email
            );


        if (
            newAttempts >= MAX_ATTEMPTS
        ) {

            await deleteOtp(
                email
            );


            return {

                success: false,

                reason: 'MAX_ATTEMPTS'

            };

        }


        return {

            success: false,

            reason: 'INVALID_OTP',

            attemptsLeft:
                MAX_ATTEMPTS -
                newAttempts

        };

    }


    // Correct OTP
    // Delete immediately so it cannot be reused

    await deleteOtp(
        email
    );


    return {

        success: true

    };

};


// =============================================
// EXPORT
// =============================================

module.exports = {

    generateOtp,

    saveOtp,

    getOtp,

    getAttempts,

    incrementAttempts,

    deleteOtp,

    verifyOtp

};