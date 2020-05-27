const mongoose = require("mongoose");

var DebtorSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true
	},
	amount: Number,
	isDebtFree: { type: Boolean, default: false },
	breakdown: Array
});

module.exports = mongoose.model("Debtor", DebtorSchema);
