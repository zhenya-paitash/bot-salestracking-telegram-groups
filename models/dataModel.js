const mongoose = require('mongoose')

const DataSchema = mongoose.Schema(
  {
    id: { type: Number, required: true },
    username: { type: String },
    position: { type: String, required: true, default: 'MENU' },
    groups: [
      {
        id: { type: Number },
        name: { type: String },
      },
    ],
    category: { type: String, default: '' },
    categories: [
      {
        id: { type: String },
        name: { type: String },
        groupReport: { type: String },
        words: [String],
      },
    ],
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model('Data', DataSchema)
