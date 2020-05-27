const jwt = require("jsonwebtoken");
const User = require("../models/user");

module.exports = async (req, res, next) => {
	try {
		let authorization = req.headers.authorization;
		const token = authorization.replace("Bearer ", "");
		const decoded = jwt.verify(token, process.env.USERKEY);
		const user = await User.findOne({ _id: decoded.userId });
		if (!user) {
			throw new Error();
		}
		req.user = user;

		next();
	} catch (e) {
		res.status(401).send({ error: "You must be logged in" });
	}
};
