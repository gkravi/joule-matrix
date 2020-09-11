// import { showAlert } from './alerts';
// import axios from 'axios';

const loginForm = document.querySelector('.login-form .form');

if (loginForm)
	loginForm.addEventListener('submit', e => {
		e.preventDefault();
		const email = document.getElementById('email').value;
		const password = document.getElementById('password').value;
		login(email, password);
	});

const login = async (email, password) => {
	try {
		const res = await axios({
			method: 'POST',
			url: '/api/v1/users/login',
			data: {
				email,
				password,
			},
		});

		if (res.data.status === 'success') {
			alert('success', 'Logged in successfully!');
			console.log(res.data);
			window.setTimeout(() => {
				location.assign('/');
			}, 1500);
		}
	} catch (err) {
		alert('error', err.response.data.message);
	}
};
