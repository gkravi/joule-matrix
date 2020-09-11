const Report = require('../models/reportModel');
// const catchAsync = require('./../utils/catchAsync');
// const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const pino = require('pino');

const logger = pino({
	prettyPrint: { colorize: true },
});

logger.info('executing reportController.js....');

//ROUTE HANDLERS
exports.setTestUserIds = (req, res, next) => {
	// Allow nested routes
	if (!req.body.test) req.body.test = req.params.testId;
	if (!req.body.author) req.body.author = req.user.id;
	next();
};

exports.getAllReports = factory.getAll(Report);
exports.getReport = factory.getOne(Report);
exports.createReport = factory.createOne(Report);
exports.updateReport = factory.updateOne(Report);
exports.deleteReport = factory.deleteOne(Report);
