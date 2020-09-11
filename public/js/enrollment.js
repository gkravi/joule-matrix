/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

// type is either 'password' or 'data'
export const testEnrollment = async data => {
	try {
		console.log(data);
		const url = '/api/v1/enrolls';
		const res = await axios({
			method: 'POST',
			url,
			data,
		});

		if (res.data.status === 'success') {
			showAlert('success', 'Enrollment successfull!');
			window.setTimeout(() => {
				location.assign('/');
			}, 1500);
		}
	} catch (err) {
		showAlert('error', err.response.data.message);
	}
};
