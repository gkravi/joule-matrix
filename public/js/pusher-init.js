// Enable pusher logging - don't include this in production
Pusher.logToConsole = true;

var pusher = new Pusher('e0d92595ec658fe147a0', {
	cluster: 'ap2',
});
var channel = pusher.subscribe('my-channel');
channel.bind('my-event', function (data) {
	alert(JSON.stringify(data));
});

// // retrieve the socket ID once we're connected
// pusher.connection.bind('connected', function () {
// 	// attach the socket ID to all outgoing Axios requests
// 	axios.defaults.headers.common['X-Socket-Id'] = pusher.connection.socket_id;
// });

// // request permission to display notifications, if we don't alreay have it
// Notification.requestPermission();
// pusher.subscribe('notifications').bind('post_updated', function (test) {
// 	// if we're on the home page, show an "Updated" badge
// 	// if (window.location.pathname === '/enrolls/') {
// 	// 	$('a[href="/tests/' + test._id + '"]').append(
// 	// 		'<span class="badge badge-primary badge-pill">Updated</span>'
// 	// 	);
// 	// }
// 	var notification = new Notification(
// 		test.title + ' was just updated. Check it out.'
// 	);
// 	notification.onclick = function (event) {
// 		window.location.href = '/tests/' + test.slug;
// 		event.preventDefault();
// 		notification.close();
// 	};
// });
