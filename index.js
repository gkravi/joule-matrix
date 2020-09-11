// const async = require('async');
// const axios = require('axios');
// // axios.defaults.headers.common['Authorization'] =
// // 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVjOGExZDViMDE5MGIyMTQzNjBkYzA1NyIsImlhdCI6MTU5NjM0Mzk4MywiZXhwIjoxNjA0MTE5OTgzfQ.YORsRB4XCILzs5QnkLYWnpGVKY6_Emle0L_8MlYx81Q';
// // async.series(
// // 	[1, 2].map(el => {
// // 		return function (callback) {
// // 			// do some stuff ...
// // 			axios({
// // 				method: 'GET',
// // 				url: `https://jsonplaceholder.typicode.com/todos/${el}`,
// // 			}).then(res => callback(null, res.data));
// // 		};
// // 	}),
// // 	// [
// // 	// 	function (callback) {
// // 	// 		// do some stuff ...
// // 	// 		axios({
// // 	// 			method: 'GET',
// // 	// 			url: 'https://jsonplaceholder.typicode.com/todos/1',
// // 	// 		}).then(res => callback(null, res.data));
// // 	// 	},

// // 	// 	function (callback) {
// // 	// 		// do some more stuff ...
// // 	// 		axios({
// // 	// 			method: 'GET',
// // 	// 			url: 'https://jsonplaceholder.typicode.com/posts',
// // 	// 		}).then(res => callback(null, res.data));
// // 	// 	},
// // 	// ],

// // 	// optional callback
// // 	function (err, results) {
// // 		// results is now equal to ['one', 'two']
// // 		console.log(results);
// // 	}
// // );

// // create a queue object with concurrency 2
// var q = async.queue(function (task, callback) {
// 	console.log('Executing ' + task.name);
// 	// axios({
// 	// 	method: 'GET',
// 	// 	url: `https://jsonplaceholder.typicode.com/todos/${task.name}`,
// 	// }).then(res => console.log(res.data));
// 	callback();
// }, 2);

// // assign a callback
// q.drain = function () {
// 	console.log('All items have been processed');
// };

// // [1, 2, 3, 4].forEach(el => {
// // 	q.push({ name: el }, function (err) {
// // 		console.log('Finished processing foo');
// // 	});
// // 	// return function (callback) {
// // 	// 	// do some stuff ...
// // 	// 	axios({
// // 	// 		method: 'GET',
// // 	// 		url: `https://jsonplaceholder.typicode.com/todos/${el}`,
// // 	// 	}).then(res => callback(null, res.data));
// // 	// };
// // });
// // // add some items to the queue
// q.push({ name: 'foo' }, function (err) {
// 	console.log('Finished processing foo');
// });

// q.push({ name: 'bar' }, function (err) {
// 	console.log('Finished processing bar');
// });

// // add some items to the queue (batch-wise)
// q.push([{ name: 'baz' }, { name: 'bay' }, { name: 'bax' }], function (err) {
// 	console.log('Finished processing item');
// });

// // add some items to the front of the queue
// q.unshift({ name: 'bar' }, function (err) {
// 	console.log('Finished processing bar');
// });
const dotenv = require('dotenv');
const pino = require('pino');
//It adds value in config.env file to the environment variables
dotenv.config({ path: './config.env' });
const amqp = require('amqplib/callback_api');

amqp.connect(process.env.AMQP_CONN_URL, function (err, conn) {
	conn.createChannel(function (err, ch) {
		ch.consume(
			'tasks1',
			function (msg) {
				console.log('.....');
				setTimeout(function () {
					console.log('Message:', msg.content.toString());
				}, 4000);
			},
			{ noAck: true }
		);
	});
});
