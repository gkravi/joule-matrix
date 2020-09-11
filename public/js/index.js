/* eslint-disable */
import '@babel/polyfill';
import { login, logout } from './login';
import { updateSettings } from './updateSettings';
import { registerUser } from './registerUser';
import { testEnrollment } from './enrollment';
import { approveRejectTest, approveAllTest } from './approveTest';
import { triggerTest } from './test';
import { showAlert } from './alerts';

// DOM ELEMENTS
const loginForm = document.querySelector('.form--login');
const registerForm = document.querySelector('.form--signup');
const enrollForm = document.querySelector('.form--enroll');
const enrollButton = document.querySelector(
	'.form--enroll .enroll__submit--btn'
);
const logOutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const triggerTestButton = document.querySelector('.btn--trigger');
const approvalForm = document.querySelector('.form--approve');
const acceptButton = document.querySelector('.btn--approve');
const rejectButton = document.querySelector('.btn--reject');
const approveAllButton = document.querySelector('.btn--approve-all');

// DELEGATION
if (loginForm)
	loginForm.addEventListener('submit', e => {
		e.preventDefault();
		const email = document.getElementById('email').value;
		const password = document.getElementById('password').value;
		login(email, password);
	});

if (approveAllButton)
	approveAllButton.addEventListener('click', e => {
		e.preventDefault();
		const tenant = approveAllButton.dataset.tenant;
		const testId = approveAllButton.dataset.testid;
		approveAllTest(tenant, testId);
	});
if (approvalForm) {
	acceptButton.addEventListener('click', e => {
		e.preventDefault();
		const data = { isApproved: 'Accepted' };
		const slugId = acceptButton.dataset.testid;
		approveRejectTest(data, slugId);
	});
	rejectButton.addEventListener('click', e => {
		e.preventDefault();
		const data = { isApproved: 'Rejected' };
		const slugId = rejectButton.dataset.testid;
		approveRejectTest(data, slugId);
	});
}

if (triggerTestButton)
	triggerTestButton.addEventListener('click', e => {
		e.preventDefault();
		const assetTypeButton = document.querySelector('#assettype');
		const testSlug = triggerTestButton.dataset.testid;
		const assetType = assetTypeButton
			? document.querySelector('#assettype').value
			: triggerTestButton.dataset.assettype;

		let type;
		if (assetType === 'DiffImage') type = 'imagediff';
		else if (assetType === 'SourceAsset' || assetType === 'TargetAsset')
			type = 'screenshot';
		else if (assetType === 'SourceHtml' || assetType === 'TargetHtml')
			type = 'webscraping';
		else if (assetType === 'DiffHtml') type = 'htmldiff';
		else if (assetType === 'SpeedTest') type = 'speedtest';
		console.log(`assetType ${assetType} and type ${type} slug ${testSlug}`);

		const data = {
			assetType,
			type,
			threshold: 0,
		};
		triggerTest(data, testSlug);
	});

if (registerForm)
	registerForm.addEventListener('submit', e => {
		e.preventDefault();
		const data = {
			name: document.getElementById('name').value,
			email: document.getElementById('email').value,
			password: document.getElementById('password').value,
			passwordConfirm: document.getElementById('password-confirm').value,
		};

		registerUser(data);
	});

if (enrollForm)
	enrollButton.addEventListener('click', e => {
		e.preventDefault();

		let testTypes = [];
		if (document.getElementById('imagediff').checked) {
			testTypes.push('imagediff');
		}
		if (document.getElementById('htmldiff').checked) {
			testTypes.push('htmldiff');
		}
		if (document.getElementById('speedtest').checked) {
			testTypes.push('speedtest');
		}

		let environments = [];

		if (document.getElementById('qa').checked) {
			const urls = Array.prototype.slice
				.call(document.querySelectorAll('.qa_url'))
				.map(el => {
					return el.value;
				});
			const approverEmails = Array.prototype.slice
				.call(document.querySelectorAll('.qa_email'))
				.map(el => {
					return el.value;
				});
			const env = {
				environment: 'qa',
				urls,
				approverEmails,
				testTypes,
			};
			environments.push(env);
		}
		if (document.getElementById('stage').checked) {
			const urls = Array.prototype.slice
				.call(document.querySelectorAll('.stage_url'))
				.map(el => {
					return el.value;
				});
			const approverEmails = Array.prototype.slice
				.call(document.querySelectorAll('.stage_email'))
				.map(el => {
					return el.value;
				});
			const env = {
				environment: 'stage',
				urls,
				approverEmails,
				testTypes,
			};
			environments.push(env);
		}
		if (document.getElementById('prod').checked) {
			const urls = Array.prototype.slice
				.call(document.querySelectorAll('.prod_url'))
				.map(el => {
					return el.value;
				});
			const approverEmails = Array.prototype.slice
				.call(document.querySelectorAll('.prod_email'))
				.map(el => {
					return el.value;
				});
			const env = {
				environment: 'prod',
				urls,
				approverEmails,
				testTypes,
			};
			environments.push(env);
		}

		const data = {
			tenant: document.getElementById('tenant').value,
			language: document.getElementById('language').value,
			environments,
		};

		testEnrollment(data);
	});

if (logOutBtn) logOutBtn.addEventListener('click', logout);

if (userDataForm)
	userDataForm.addEventListener('submit', async e => {
		e.preventDefault();
		const form = new FormData();
		form.append('name', document.getElementById('name').value);
		form.append('email', document.getElementById('email').value);
		form.append('photo', document.getElementById('photo').files[0]);

		updateSettings(form, 'data');
	});

if (userPasswordForm)
	userPasswordForm.addEventListener('submit', async e => {
		e.preventDefault();
		document.querySelector('.btn--save-password').textContent = 'Updating...';

		const passwordCurrent = document.getElementById('password-current').value;
		const password = document.getElementById('password').value;
		const passwordConfirm = document.getElementById('password-confirm').value;
		await updateSettings(
			{ passwordCurrent, password, passwordConfirm },
			'password'
		);

		document.querySelector('.btn--save-password').textContent = 'Save password';
		document.getElementById('password-current').value = '';
		document.getElementById('password').value = '';
		document.getElementById('password-confirm').value = '';
	});

const alertMessage = document.querySelector('body').dataset.alert;
if (alertMessage) showAlert('success', alertMessage, 20);
