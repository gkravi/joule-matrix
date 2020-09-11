const express = require('express');
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const testRouter = require('./routes/testRoutes');
const reportRouter = require('./routes/reportRoutes');
const userRouter = require('./routes/userRoutes');
const assetRouter = require('./routes/assetRoutes');
const enrollRouter = require('./routes/enrollRoutes');
const viewRouter = require('./routes/viewRoutes');
const imageUploadRouter = require('./routes/imageUploadRoute');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const app = express();
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const passportHandler = require('./utils/passportHandler');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http')();
const amqpRouter = require('./routes/amqpQueueRoute');
app.use(pinoHttp);

const swaggerOptions = {
	swaggerDefinition: {
		info: {
			title: 'Joule Visual Test API',
			version: 'v1',
			description:
				'Joule API for Visual Testing reporting and user management.',
			contact: {
				name: 'Ravi Gupta',
			},
			produces: ['application/json'],
			consumes: ['application/json'],
			servers: ['http://localhost:800'],
			basePath: '/',
			securityDefinitions: {
				bearerAuth: {
					type: 'apiKey',
					name: 'Authorization',
					scheme: 'bearer',
					in: 'header',
				},
			},
		},
	},
	apis: ['./routes/*.js'],
};
const swaggerDocument = swaggerJsDoc(swaggerOptions);
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
//1) GLOBAL MIDDLEWARE

//It will route only static files in public folder to get rendered using the URL
// This will handle request if there is no corresponding route defined in router config
// e.g. http://localhost:3000/img/pin.png or http://localhost:3000/overview.html
// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

//Enable CORS
app.use(cors());
// Set Security HTTP Headers
app.use(helmet());

//Development logging
if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev'));
}

// Limit request from same API
const limiter = rateLimit({
	max: 10000,
	windowMs: 60 * 60 * 1000,
	message: 'Too many requests from this IP, please try again in an hour!',
});

app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '2048kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent paramter pollutions
app.use(
	hpp({
		whitelist: [
			'duration',
			'tenant',
			'author',
			'device',
			'diffNumber',
			'language',
		],
	})
);

app.use(passport.initialize());
app.use(passport.session());

// Test middleware
app.use((req, res, next) => {
	req.requestTime = new Date().toISOString();
	next();
});

//3) ROUTES

app.use('/api/v1/queue', amqpRouter);
app.use('/', viewRouter);
app.use('/api/v1/aws', imageUploadRouter);
app.use('/api/v1/enrolls', enrollRouter);
app.use('/api/v1/tests', testRouter);
app.use('/api/v1/reports', reportRouter);
app.use('/api/v1/assets', assetRouter);
app.use('/api/v1/users', userRouter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

//ERROR HANDLING of invalid request
app.all('*', (req, res, next) => {
	next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

//ERROR HANDLING MIDDLEWARE
app.use(globalErrorHandler);

module.exports = app;
