const AppError = require('./../utils/appError');

const handleCastErrorDB = err => {
	const message = `Invalid ${err.path}: ${err.value}.`;
	return new AppError(message, 400);
};
const handleDuplicateFieldsDB = err => {
	const value = JSON.stringify(err.keyValue);
	const message = `Duplicate field value ${value}. Please use another value`;
	return new AppError(message, 400);
};
const handleValidationErrorDB = err => {
	const errors = Object.values(err.errors).map(el => el.properties.message);
	const message = `Invalid input data. ${errors.join('. ')}`;
	return new AppError(message, 400);
};
const sendErrorDev = (err, req, res) => {
	// A) API
	if (req.originalUrl.startsWith('/api')) {
		return res.status(err.statusCode).json({
			status: err.status,
			error: err,
			message: err.message,
			stack: err.stack,
		});
	}
	// B) RENDERED WEBSITE
	console.error('ERROR 🔥', err);
	return res.status(err.statusCode).render('error', {
		title: 'Something went wrong!',
		msg: err.message,
	});
};
const handleJWTError = err =>
	new AppError('Invalid token. Please login again!', 401);

const handleJWTExpiredError = err =>
	new AppError('Your token has expired. Please login again.', 401);

const sendErrorProd = (err, req, res) => {
	// A) API
	if (req.originalUrl.startsWith('/api')) {
		// A. Operational, trusted error: send message to client
		if (err.isOperational) {
			return res.status(err.statusCode).json({
				status: err.status,
				message: err.message,
			});
			//Programming or other unknown error: don't leak error details
		}
		// 1) Log error
		console.error('ERROR 🔥', err);

		// 2) Send gneric message
		return res.status(500).json({
			status: 'error',
			message: 'Something went very wrong!',
		});
	}
	// B) RENDERED WEBSITE
	else {
		// B. Operational, trusted error: send message to client
		if (err.isOperational) {
			return res.status(err.statusCode).render('error', {
				title: 'Something went wrong!',
				msg: err.message,
			});
			//Programming or other unknown error: don't leak error details
		}
		// 1) Log error
		console.error('ERROR 🔥', err);

		// 2) Send gneric message
		return res.status(err.statusCode).render('error', {
			title: 'Something went wrong!',
			msg: 'Please try again later.',
		});
	}
};
module.exports = (err, req, res, next) => {
	err.statusCode = err.statusCode || 500;
	err.status = err.status || 'error';
	if (process.env.NODE_ENV === 'development') {
		sendErrorDev(err, req, res);
	} else if (process.env.NODE_ENV === 'production') {
		let error = { ...err };
		error.message = err.message;

		if (error.kind === 'ObjectId') error = handleCastErrorDB(error);
		if (error.code === 11000) error = handleDuplicateFieldsDB(error);
		if (error._message === 'Validation failed')
			error = handleValidationErrorDB(error);

		if (error.name === 'JsonWebTokenError') error = handleJWTError(error);
		if (error.name === 'TokenExpiredError')
			error = handleJWTExpiredError(error);

		sendErrorProd(error, req, res);
	}

	next();
};
