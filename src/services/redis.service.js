const {
    createClient
} = require('redis');


// =============================================
// CREATE REDIS CLIENT
// =============================================

const redisClient =
    createClient({

        url:
            process.env.REDIS_URL

    });


// =============================================
// REDIS ERROR
// =============================================

redisClient.on(
    'error',
    (error) => {

        console.error(
            '❌ Redis error:',
            error
        );

    }
);


// =============================================
// CONNECT REDIS
// =============================================

const connectRedis =
    async () => {

        if (
            redisClient.isOpen
        ) {

            return;

        }


        await redisClient.connect();


        console.log(
            '✅ Redis connected successfully'
        );

    };


// =============================================
// SET VALUE WITH TTL
// =============================================

const setValue =
    async (
        key,
        value,
        ttlSeconds
    ) => {

        await redisClient.set(
            key,
            value,
            {
                EX:
                    ttlSeconds
            }
        );

    };


// =============================================
// GET VALUE
// =============================================

const getValue =
    async (
        key
    ) => {

        return await redisClient.get(
            key
        );

    };


// =============================================
// DELETE VALUE
// =============================================

const deleteValue =
    async (
        key
    ) => {

        await redisClient.del(
            key
        );

    };


// =============================================
// EXPORT
// =============================================

module.exports = {

    redisClient,

    connectRedis,

    setValue,

    getValue,

    deleteValue

};