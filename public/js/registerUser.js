/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

// type is either 'password' or 'data'
export const registerUser = async data => {
	try {
		const url = '/api/v1/users/signup';
		const res = await axios({
			method: 'POST',
			url,
			data,
		});

		if (res.data.status === 'success') {
			showAlert('success', 'User Registered successfully!');
			window.setTimeout(() => {
				location.assign('/');
			}, 1500);
		}
	} catch (err) {
		showAlert('error', err.response.data.message);
	}
};
