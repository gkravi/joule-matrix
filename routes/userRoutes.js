const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');
const passport = require('passport');

const router = express.Router();

/**
 * This Route Authenticates req with IDP
 * If Session is active it returns saml response
 * If Session is not active it redirects to IDP's login form
 */
router.get(
	'/login/sso',
	passport.authenticate('saml', {
		successRedirect: '/',
		failureRedirect: '/login',
	})
);

/**
 * This is the callback URL
 * Once Identity Provider validated the Credentials it will be called with base64 SAML req body
 * Here we used Saml2js to extract user Information from SAML assertion attributes
 * If every thing validated we validates if user email present into user DB.
 * Then creates a session for the user set in cookies and do a redirect to Application
 */
router.post(
	'/login/sso/callback',
	authController.userAgentHandler,
	passport.authenticate('saml', { failureRedirect: '/', failureFlash: true }),
	authController.ssoCallback,
	authController.createUserSession
);

/**
 * @swagger
 *
 * /api/v1/users/signup:
 *   post:
 *     description: Signup to the application
 *     tags: ['/api/v1/users']
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: name
 *         description: name to use for Signup.
 *         in: formData
 *         required: true
 *         type: string
 *       - name: email
 *         description: User's email.
 *         in: formData
 *         required: true
 *         type: string
 *       - name: password
 *         description: User's password.
 *         in: formData
 *         required: true
 *         type: string
 *       - name: passwordConfirm
 *         description: User's passwordConfirm.
 *         in: formData
 *         required: true
 *         type: string
 *       - name: role
 *         description: User's role.
 *         in: formData
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: signup
 */
router.post('/signup', authController.signup);

/**
 * @swagger
 * definitions:
 *   login:
 *     properties:
 *       email:
 *         type: String
 *       password:
 *         type: String
 */

/**
 * @swagger
 *
 * /api/v1/users/login:
 *   post:
 *     description: Login to the application
 *     tags: ['/api/v1/users']
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: login
 *         description: User Email and Password for login.
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#definitions/login'
 *     responses:
 *       200:
 *         description: logged In
 */
router.post('/login', authController.login);

router.get('/logout', authController.logout);

/**
 * @swagger
 *
 * /api/v1/users/forgotPassword:
 *   post:
 *     description: ForgotPassword to the application
 *     tags: ['/api/v1/users']
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: email
 *         description: email to use for login.
 *         in: formData
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: forgotPassword
 */
router.post('/forgotPassword', authController.forgotPassword);
/**
 * @swagger
 *
 * /api/v1/users/resetPassword/:token:
 *   patch:
 *     description: ResetPassword to the application
 *     tags: ['/api/v1/users']
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: password
 *         description: password to use for reset password.
 *         in: formData
 *         required: true
 *         type: string
 *       - name: passwordConfirm
 *         description: passwordConfirm to use for reset password.
 *         in: formData
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Reset Password
 */
router.patch('/resetPassword/:token', authController.resetPassword);

// MIDDLEWARE to protect all route after this

router.use(authController.protect);

/**
 * @swagger
 *
 * /api/v1/users/updateMyPassword:
 *   patch:
 *     description: UpdateMyPassword to the application who is logged in
 *     tags: ['/api/v1/users']
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: passwordCurrent
 *         description: Current User password.
 *         in: formData
 *         required: true
 *         type: string
 *       - name: password
 *         description: new password to use for update logged in user password.
 *         in: formData
 *         required: true
 *         type: string
 *       - name: passwordConfirm
 *         description: passwordConfirm to use for update logged in user password confirm.
 *         in: formData
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Update My Password
 */
router.patch('/updateMyPassword', authController.updatePassword);
/**
 * @swagger
 *
 * /api/v1/users/me:
 *   get:
 *     description: Get Current loggedIn User of the application
 *     tags: ['/api/v1/users']
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Get Current User
 */
router.get('/me', userController.getMe, userController.getUser);
/**
 * @swagger
 *
 * /api/v1/users/updateMe:
 *   post:
 *     description: Update Current loggedIn User to the application
 *     tags: ['/api/v1/users']
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: role
 *         description: role to use for update.
 *         in: formData
 *         required: true
 *         type: string
 *       - name: name
 *         description: name to use for update.
 *         in: formData
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: UpdateMe
 */
router.patch(
	'/updateMe',
	userController.uploadUserPhoto,
	userController.resizeUserPhoto,
	userController.updateMe
);
/**
 * @swagger
 *
 * /api/v1/users/resetPassword/:token:
 *   delete:
 *     description: Delete Current User LoggedIn to the application
 *     tags: ['/api/v1/users']
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Delete Current User
 */
router.delete('/deleteMe', userController.deleteMe);

// MIDDLEWARE to restrict all route after this to admin user only
router.use(authController.restrictTo('admin'));

router
	.route('/')
	.get(userController.getAllUsers)
	.post(userController.createUser);
router
	.route('/:id')
	.get(userController.getUser)
	.patch(userController.updateUser)
	.delete(userController.deleteUser);

module.exports = router;
