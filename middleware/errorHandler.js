const handleSequelizeError = require('../utils/handleSequelizeError')


module.exports = (err, req, res, next) => {
    console.error(err)
    const statusCode = err.statusCode || 500
    let error

    if (err.name?.startsWith('Sequelize')) {
        error = handleSequelizeError(err)
    }
    else{ error = err }

    res.status(statusCode).json(
        {
            success: false,
            message: error.message || 'Internal Server Error',
            code: error.code || 'UNKNOWN ERROR'
        }
    )
}