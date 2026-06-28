const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  date:              { type: Date,    default: Date.now, index: true },
  cube_state:        { type: String,  required: true },
  solution:          { type: String,  required: true },
  moves:             { type: [String], default: [] },
  move_count:        { type: Number,  required: true, min: 0, index: true },
  execution_time_ms: { type: Number,  required: true, min: 0 },
  is_valid:          { type: Boolean, default: true },
  algorithm:         { type: String,  default: 'Kociemba Two-Phase (JS)' },
  face_colors:       { type: mongoose.Schema.Types.Mixed, default: null },
  source:            { type: String, enum: ['photo', 'manual', 'edited', 'unknown'], default: 'unknown' },
}, { versionKey: false });

schema.index({ user_id: 1, date: -1 });
schema.index({ user_id: 1, move_count: 1 });

module.exports = mongoose.model('SolveHistory', schema);
