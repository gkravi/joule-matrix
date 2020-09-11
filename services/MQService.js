const amqp = require('amqplib/callback_api');
const dotenv = require('dotenv');
const pino = require('pino');
const testUtils = require('../utils/testUtils');
//It adds value in config.env file to the environment variables
dotenv.config({ path: './config.env' });

const logger = pino({
	prettyPrint: { colorize: true },
});

logger.info('executing MQService.js....');

//AMQP CONNECTION
let queueName = 'JouleVT-Test-Queue';
let ch = null;

var amqpConn = null;
const start = () => {
	amqp.connect(process.env.AMQP_CONN_URL + '?heartbeat=60', function (
		err,
		conn
	) {
		conn.createChannel(function (err, ch) {
			logger.info(`Connection Successfull for channel`);
			ch.assertQueue('jobs', { durable: true });
			if (err) {
				console.error('[AMQP]', err.message);
				return setTimeout(start, 1000);
			}
			conn.on('error', function (err) {
				if (err.message !== 'Connection closing') {
					console.error('[AMQP] conn error', err.message);
				}
			});
			conn.on('close', function () {
				console.error('[AMQP] reconnecting');
				return setTimeout(start, 1000);
			});
			console.log('[AMQP] connected');
			amqpConn = conn;
			// ch.consume(
			// 	"jobs",
			// 	async function (msg) {
			// 		console.log('.....');
			// const { test, data, type } = JSON.parse(msg.content.toString());
			// console.log('Executing ' + data.type);
			// console.log(`test: ${test.slug}`);
			// if (data.type === 'screenshot') {
			// 	await testUtils.triggerScreenshot(data, test);
			// } else if (data.type === 'imagediff') {
			// 	await testUtils.triggerImageDiffing(data, test);
			// } else if (data.type === 'webscraping') {
			// 	await testUtils.triggerWebScraping(data, test);
			// } else if (data.type === 'htmldiff') {
			// 	await testUtils.triggerHTMLDiffing(data, test);
			// } else if (data.type === 'speedtest') {
			// 	await testUtils.triggerSpeedTest(data, test);
			// } else {
			// 	logger.warn(`Not a valid test type ${data.type}`);
			// }
			// },
			// 	{ noAck: true }
			// );
			whenConnected();
		});
	});
};

// process.on('exit', code => {
// 	ch.close();
// 	logger.info(`Closing rabbitmq channel`);
// });

const whenConnected = () => {
	startPublisher();
	startWorker();
};
var pubChannel = null;
var offlinePubQueue = [];
const startPublisher = () => {
	amqpConn.createConfirmChannel(function (err, ch) {
		if (closeOnErr(err)) return;
		ch.on('error', function (err) {
			console.error('[AMQP] channel error', err.message);
		});
		ch.on('close', function () {
			console.log('[AMQP] channel closed');
		});

		pubChannel = ch;
		while (true) {
			var m = offlinePubQueue.shift();
			if (!m) break;
			publish(m[0], m[1], m[2]);
		}
	});
};

// method to publish a message, will queue messages internally if the connection is down and resend later
const publish = (exchange, routingKey, content) => {
	try {
		pubChannel.publish(
			exchange,
			routingKey,
			content,
			{ persistent: true },
			function (err, ok) {
				if (err) {
					console.error('[AMQP] publish', err);
					offlinePubQueue.push([exchange, routingKey, content]);
					pubChannel.connection.close();
				}
			}
		);
	} catch (e) {
		console.error('[AMQP] publish', e.message);
		offlinePubQueue.push([exchange, routingKey, content]);
	}
};
// A worker that acks messages only if processed succesfully
const startWorker = () => {
	amqpConn.createChannel(function (err, ch) {
		if (closeOnErr(err)) return;
		ch.on('error', function (err) {
			console.error('[AMQP] channel error', err.message);
		});
		ch.on('close', function () {
			console.log('[AMQP] channel closed');
		});
		ch.prefetch(10);
		ch.assertQueue('jobs', { durable: true }, function (err, _ok) {
			if (closeOnErr(err)) return;
			ch.consume('jobs', processMsg, { noAck: false });
			console.log('Worker is started');
		});

		function processMsg(msg) {
			work(msg, function (ok) {
				try {
					if (ok) ch.ack(msg);
					else ch.reject(msg, true);
				} catch (e) {
					closeOnErr(e);
				}
			});
		}
	});
};

const work = async (msg, cb) => {
	// console.log('Got msg', msg.content.toString());
	const { test, data, type } = JSON.parse(msg.content.toString());
	console.log('Executing ' + data.type);
	console.log(`test: ${test.slug}`);
	if (data.type === 'screenshot') {
		await testUtils.triggerScreenshot(data, test);
	} else if (data.type === 'imagediff') {
		await testUtils.triggerImageDiffing(data, test);
	} else if (data.type === 'webscraping') {
		await testUtils.triggerWebScraping(data, test);
	} else if (data.type === 'htmldiff') {
		await testUtils.triggerHTMLDiffing(data, test);
	} else if (data.type === 'speedtest') {
		await testUtils.triggerSpeedTest(data, test);
	} else {
		logger.warn(`Not a valid test type ${data.type}`);
	}
	cb(true);
};

const closeOnErr = err => {
	if (!err) return false;
	console.error('[AMQP] error', err);
	amqpConn.close();
	return true;
};

// setInterval(function () {
// 	publish('', 'jobs', new Buffer('work work work'));
// }, 1000);

start();

exports.publishToQueue = async (req, res, next) => {
	console.log('publishToQueue');
	const data = req.body;
	publish('', 'jobs', new Buffer(JSON.stringify(data)));
	// ch.assertQueue(queueName);
	// console.log('sendToQueue...');
	// ch.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
	// 	persistent: true,
	// });
	// res.status(200).json({
	// 	status: 'success',
	// 	data: {
	// 		data: 'Task Queued',
	// 	},
	// });
};
