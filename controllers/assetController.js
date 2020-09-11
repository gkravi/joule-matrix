const Asset = require('../models/assetModel');
const factory = require('./handlerFactory');

//ROUTE HANDLERS
exports.getAllAssets = factory.getAll(Asset);
exports.getAsset = factory.getOne(Asset);
exports.createAsset = factory.createOne(Asset);
exports.updateAsset = factory.updateOne(Asset);
exports.deleteAsset = factory.deleteOne(Asset);
