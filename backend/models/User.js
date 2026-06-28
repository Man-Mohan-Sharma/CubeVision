const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: true,
    minlength: 2,
    maxlength: 80,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    required: true,
    unique: true,
    index: true,
    maxlength: 160,
  },
  password_hash: {
    type: String,
    required: true,
    select: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
  last_login_at: {
    type: Date,
    default: null,
  },
  preferences: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({ theme: 'dark' }),
  },
}, { versionKey: false });

schema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    created_at: this.created_at,
    last_login_at: this.last_login_at,
    preferences: this.preferences || {},
  };
};

module.exports = mongoose.model('User', schema);
