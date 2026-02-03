const AppError = require('./AppError')

module.exports = (err) => {
  // Validation errors
  if (err.name === 'SequelizeValidationError') {
    return new AppError(err.errors.map(e => e.message).join(', '), 400, 'VALIDATION_ERROR')
  }

  // Unique constraint
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path
    return new AppError(`${field} already exists`, 409, 'DUPLICATE_RESOURCE')
  }

  // Foreign key constraint
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return new AppError('Referenced resource does not exist', 400,'INVALID_REFERENCE')
  }

  return new AppError('Database error', 500, 'DATABASE_ERROR')
}
