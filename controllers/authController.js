const { promisify } = require('util');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');
const crypto = require('crypto');
const passport = require('passport');
const useragent = require('useragent');
const Saml2js = require('saml2js');
const pino = require('pino');

const logger = pino({
	prettyPrint: { colorize: true },
});

logger.info('executing authController.js....');

const signToken = id => {
	return jwt.sign({ id: id }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN,
	});
};
const createSendToken = (user, statusCode, res, dontSend) => {
	logger.info('executing createSendToken...');
	const token = signToken(user._id);
	const cookieOptions = {
		expires: new Date(
			Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
		),
		httpOnly: true,
	};
	logger.info(`Node Environment , ${process.env.NODE_ENV}`);
	if (process.env.NODE_ENV === 'production') cookieOptions.secure = false;

	res.cookie('jwt', token, cookieOptions);
	// res.cookie('Authorization', session)

	//Remove the password from output
	user.password = undefined;
	if (!dontSend)
		res.status(statusCode).json({
			status: 'success',
			token,
			data: {
				user,
			},
		});
};
exports.signup = catchAsync(async (req, res, next) => {
	logger.info('Sending email after signup');
	const newUser = await User.create(req.body);
	const url = `${req.protocol}://${req.get('host')}/me`;
	await new Email(newUser, url).sendWelcome();

	createSendToken(newUser, 201, res, false);
});

exports.login = catchAsync(async (req, res, next) => {
	const { email, password } = req.body;

	// 1) Check if email and password exists
	if (!email || !password) {
		logger.warn('Please provide email and password!');
		return next(new AppError('Please provide email and password!', 400));
	}
	// 2) Check if user exists && password is correct
	const user = await User.findOne({ email }).select('+password');
	if (!user || !(await user.correctPassword(password, user.password))) {
		logger.warn('Incorrect email or password');
		return next(new AppError('Incorrect email or password', 401));
	}
	// 3) If everything ok, send token to client
	createSendToken(user, 200, res, false);
});

exports.logout = catchAsync(async (req, res, next) => {
	res.cookie('jwt', 'loggedout', {
		expires: new Date(Date.now() + 10 * 1000),
		httpOnly: true,
	});
	res.status(200).json({ status: 'success' });
});

exports.protect = catchAsync(async (req, res, next) => {
	// 1) Getting the token and check of it's there
	let token;
	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith('Bearer')
	) {
		token = req.headers.authorization.split(' ')[1];
	} else if (req.cookies.jwt) {
		token = req.cookies.jwt;
	}
	if (!token) {
		logger.error(
			'You are not authorized!, Please login using valid authentication.'
		);
		return next(
			new AppError(
				'You are not authorized!, Please login using valid authentication.',
				401
			)
		);
	}
	// 2) Verification token
	const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

	// 3) Check if user still exists
	const currentUser = await User.findById(decoded.id);
	if (!currentUser) {
		logger.warn('The user belonging to this token does not exists.');
		return next(
			new AppError('The user belonging to this token does not exists.', 401)
		);
	}

	// 4) Check if user changed password after the token was issued
	if (currentUser.changedPasswordAfter(decoded.iat)) {
		logger.warn('User recently changed password! Please log in again.');
		return next(
			new AppError('User recently changed password! Please log in again.', 401)
		);
	}
	//Grant access to protected route
	req.user = currentUser;
	res.locals.user = currentUser;
	next();
});

// Obly for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
	if (req.cookies.jwt) {
		logger.info('Verify if user is loggedIn');
		try {
			// 1) Verify token
			const decoded = await promisify(jwt.verify)(
				req.cookies.jwt,
				process.env.JWT_SECRET
			);

			// 2) Check if user still exists
			const currentUser = await User.findById(decoded.id);
			if (!currentUser) {
				return next();
			}

			// 3) Check if user changed password after the token was issued
			if (currentUser.changedPasswordAfter(decoded.iat)) {
				return next();
			}
			// There is a LoggedIn User
			res.locals.user = currentUser;
			return next();
		} catch (error) {
			logger.error('Error ', error);
			return next();
		}
	}
	next();
};

exports.restrictTo = (...roles) => {
	return (req, res, next) => {
		// roles is an array ['admin']. role='user'
		if (!roles.includes(req.user.role)) {
			logger.warn('We do not have permission to perform this action');
			return next(
				new AppError('We do not have permission to perform this action', 403)
			);
		}
		next();
	};
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
	// 1) Get user based on POSTED email
	const user = await User.findOne({ email: req.body.email });
	if (!user) {
		logger.warn('There is no user with email address.');
		return next(new AppError('There is no user with email address.', 404));
	}
	// 2) Generate the random reset token
	const resetToken = user.createPasswordResetToken();
	await user.save({ validateBeforeSave: false });

	// 3) Send it to user's email

	try {
		const resetURL = `${req.protocol}://${req.get(
			'host'
		)}/api/v1/users/resetPassword/${resetToken}`;

		await new Email(user, resetURL).sendPasswordReset();

		res.status(200).json({
			status: 'success',
			message: 'Token sent to email!',
		});
	} catch (error) {
		user.passwordResetToken = undefined;
		user.passwordResetExpires = undefined;
		await user.save({ validateBeforeSave: false });
		logger.error('There was an error sending email. Try again later!', error);
		return next(
			new AppError('There was an error sending email. Try again later!', 500)
		);
	}
});

exports.resetPassword = catchAsync(async (req, res, next) => {
	// 1) Get user based on the token
	const hashedToken = crypto
		.createHash('sha256')
		.update(req.params.token)
		.digest('hex');

	const user = await User.findOne({
		passwordResetToken: hashedToken,
		passwordResetExpires: { $gt: Date.now() },
	});

	// 2) If the token has not expired, and there is user, set the new password
	if (!user) {
		logger.warn('Token is invalid or has expired.');
		return next(new AppError('Token is invalid or has expired.', 400));
	}
	user.password = req.body.password;
	user.passwordConfirm = req.body.passwordConfirm;
	user.passwordResetToken = undefined;
	user.passwordResetExpires = undefined;
	await user.save();

	// 3) Update changedPasswordAt property for the user

	// 4) Log the user in, send JWT
	createSendToken(user, 200, res, false);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
	// 1) Get the user from the collection
	const user = await User.findById(req.user.id).select('+password');
	// 2) Check if the POSTed current password is correct
	if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
		logger.warn('Your current password is wrong.');
		return next(new AppError('Your current password is wrong.', 401));
	}

	// 3) If so, update password
	user.password = req.body.password;
	user.passwordConfirm = req.body.passwordConfirm;
	await user.save();
	// 4) Log user in, send JWT
	createSendToken(user, 200, res, false);
});

exports.createUserSession = async (req, res) => {
	logger.info('Create User Session from SSO user');
	const {
		userEmail,
		userLastName,
		userFirstName,
		memberOf,
		personImmutableId,
	} = req.samlUserObject;
	// 1) Find User in db
	let user = await User.findOne({ email: userEmail });
	if (!user) {
		user = await User.create({
			email: userEmail,
			name: `${userFirstName} ${userLastName}`,
			password: `${process.env.SSO_USER_DEFAULT_PASSWORD}`,
			passwordConfirm: `${process.env.SSO_USER_DEFAULT_PASSWORD}`,
		});
		const url = `${req.protocol}://${req.get('host')}/me`;
		await new Email(user, url).sendWelcome();
	}
	// 2) If everything ok, send token to client
	createSendToken(user, 200, res, true);

	return res.redirect(302, `/`);
};

exports.userAgentHandler = (req, res, next) => {
	const agent = useragent.parse(req.headers['user-agent']);
	const deviceInfo = Object.assign(
		{},
		{
			device: agent.device,
			os: agent.os,
		}
	);
	req.device = deviceInfo;
	next();
};

exports.ssoCallback = (req, res, next) => {
	const xmlResponse = req.body.SAMLResponse;
	const parser = new Saml2js(xmlResponse);
	req.samlUserObject = parser.toObject();
	next();
};
