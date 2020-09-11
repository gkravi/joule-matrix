/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

// type is either 'password' or 'data'
export const approveRejectTest = async (data, testSlug) => {
	try {
		const url = `/api/v1/tests/${testSlug}/approve`;
		const message = data.isApproved === 'Accepted' ? 'Approved' : 'Rejected';
		const res = await axios({
			method: 'PATCH',
			url,
			data,
		});

		if (res.data.status === 'success') {
			showAlert('success', `Test ${message}!`);
			window.setTimeout(() => {
				location.assign(`/test/${testSlug}`);
			}, 1500);
		}
	} catch (err) {
		showAlert('error', err.response.data.message);
	}
};

export const approveAllTest = async (tenant, testId) => {
	try {
		const url = `/api/v1/tests/${testId}/approveAll`;
		const res = await axios({
			method: 'PATCH',
			url,
		});
		if (res.data.status === 'success') {
			showAlert('success', `All Tests Approved for this Tenant!`);
			window.setTimeout(() => {
				location.assign(`/enrolls/${tenant}/${testId}`);
			}, 1500);
		}
	} catch (err) {
		showAlert('error', err.response.data.message);
	}
};
