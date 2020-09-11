const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Test = require('./../../models/testModel');
const Report = require('./../../models/reportModel');
const User = require('./../../models/userModel');
const Asset = require('./../../models/assetModel');
const Enroll = require('./../../models/enrollModel');
dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
	'<PASSWORD>',
	process.env.DATABASE_PASSWORD
);

mongoose
	// .connect(DB, {
	.connect(process.env.DATABASE_LOCAL, {
		useNewUrlParser: true,
		useCreateIndex: true,
		useFindAndModify: false,
	})
	.then(() => console.log('DB connection successful!'));

// READ JSON FILE
const tests = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reports = JSON.parse(
	fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
);

// IMPORT DATA INTO DB
const importData = async () => {
	try {
		// await Test.create(tests, { validateBeforeSave: false });
		// await User.create(users, { validateBeforeSave: false });
		// await Report.create(reports);
		// const enroll = await Enroll.findOne({ tests: '5f005fe4721972854ce709ea' });
		// console.log(enroll.approverEmails);
		console.log('Data successfully loaded!');
	} catch (err) {
		console.log(err);
	}
	process.exit();
};

// DELETE ALL DATA FROM DB
const deleteData = async () => {
	try {
		await Test.deleteMany();
		//await User.deleteMany();
		await Report.deleteMany();
		await Asset.deleteMany();
		//await Enroll.deleteMany();
		console.log('Data successfully deleted!');
	} catch (err) {
		console.log(err);
	}
	process.exit();
};

if (process.argv[2] === '--import') {
	importData();
} else if (process.argv[2] === '--delete') {
	deleteData();
}
