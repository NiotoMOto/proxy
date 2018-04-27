const mongoose = require('mongoose');

const { Schema } = mongoose;

const Response = new Schema({
  hash: { type: String, index: { unique: true } },
  data: { type: Object },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('response', Response);
