const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Test = require('./models/testModel');

//It adds value in config.env file to the environment variables
dotenv.config({ path: './config.env' });

const app = require('./app');

const pino = require('pino');

const logger = pino({
	prettyPrint: { colorize: true },
});

logger.info('executing server.js....');

//CONNECT TO DB
const DB = process.env.DATABASE.replace(
	'<PASSWORD>',
	process.env.DATABASE_PASSWORD
);
mongoose
	.connect(process.env.DATABASE_LOCAL, {
		// .connect(DB, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useCreateIndex: true,
		useFindAndModify: true,
	})
	.then(con => {
		logger.info('DB connection successful!');
	})
	.catch(err => {
		logger.error('ERROR 🔥', err);
	});

//4) SERVER INIT
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
	logger.info(`App running on port ${port}...`);
});

//HANDLE UNHANDLED PROMISE REJECTION

process.on('unhandledRejection', err => {
	logger.info(err.name, err.message);
	logger.info('UNHANDLED REJECTION! 🔥 Shutting down...');
	server.close(() => {
		process.exit(1);
	});
});
