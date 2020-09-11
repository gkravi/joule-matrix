/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

// type is either 'password' or 'data'
export const triggerTest = async (data, testSlug) => {
	try {
		const url = `/api/v1/tests/${testSlug}/trigger`;
		const res = await axios({
			method: 'POST',
			url,
			data,
		});

		if (res.data.status === 'success') {
			showAlert('success', 'Test Queued successfully!');
			window.setTimeout(() => {
				location.assign(`/test/${testSlug}`);
			}, 1500);
		}
	} catch (err) {
		showAlert('error', err.response.data.message);
	}
};
