require("dotenv").config();
const express = require("express"),
  mongoose = require("mongoose"),
  jwt = require("jsonwebtoken"),
  cors = require("cors"),
  bcrypt = require("bcrypt"),
  User = require("./models/user"),
  Debtor = require("./models/debtor"),
  auth = require("./middlewares/auth"),
  app = express();

app.use(express.json());
mongoose.connect(process.env.DATABASEURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});

app.use(cors());

app.post("/api/signup", async (req, res) => {
  const user = new User(req.body);
  try {
    let newUser = await user.save();
    if (!newUser) {
      throw new Error("Username already exists");
    }
    const token = jwt.sign({ userid: user._id }, process.env.USERKEY);
    res.status(201).send({ token, username: user.username });
  } catch (e) {
    res.status(400).send(e);
  }
});

app.post("/api/login", async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  if (!username || !password) {
    return res.status(400).send({ error: "Must provide Username or Password" });
  }

  let user = await User.findOne({ username });
  if (!user) {
    return res.status(400).send({ error: "Invalid Username or Password" });
  }

  let flag = await bcrypt.compare(password, user.password);
  if (!flag) {
    return res.status(400).send({ error: "Invalid Username or Password" });
  }

  const token = jwt.sign({ userId: user._id }, process.env.USERKEY);
  res.send({ token, username: user.username });
});

app.get("/api/debtors", auth, async (req, res) => {
  const match = {};

  if (req.query.isDebtFree) {
    match.isDebtFree = req.query.isDebtFree === "true";
  }

  try {
    await req.user
      .populate({
        path: "debtors",
        match,
      })
      .execPopulate();
    res.send(req.user.toJSON());
  } catch (e) {
    res.status(500).send();
  }
});

app.post("/api/debtors/new", auth, async (req, res) => {
  let isDebtFree = true;

  let breakdown = [];
  if (req.body.amount > 0) {
    let today = new Date();
    isDebtFree = false;
    const breakdownItem = {
      id: mongoose.Types.ObjectId(),
      amount: req.body.amount,
      type: "previouslyOwed",
      date: `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`,
    };
    breakdown.push(breakdownItem);
  }

  const debtor = new Debtor({
    ...req.body,
    isDebtFree,
    breakdown,
  });

  try {
    await debtor.save();
    req.user.debtors.push(debtor._id);
    req.user.save();
    res.status(201).send(debtor);
  } catch (e) {
    res.status(400).send(e);
  }
});

app.post("/api/debtors/:id/new", auth, async (req, res) => {
  let today = new Date();

  try {
    const { breakdownData } = req.body;
    breakdownData["date"] = `${today.getDate()}/${
      today.getMonth() + 1
    }/${today.getFullYear()}`;
    let debtor = await Debtor.findById(req.params.id);
    const updatedBreakdown = [...debtor.breakdown, breakdownData];
    debtor.breakdown = updatedBreakdown;
    let newAmountOwed =
      breakdownData.type === "paid"
        ? debtor.amount - breakdownData.amount
        : debtor.amount + breakdownData.amount;
    if (newAmountOwed < 0 || newAmountOwed === 0) {
      newAmountOwed = 0;
      isDebtFree = true;
    } else {
      isDebtFree = false;
    }
    debtor.amount = newAmountOwed;
    debtor.isDebtFree = isDebtFree;
    debtor.save();
    res.send(debtor);
  } catch (e) {
    res.status(400).send(e.message);
  }
});

app.delete("/api/debtors/:id", auth, async (req, res) => {
  try {
    const debtor = await Debtor.findOneAndDelete({ _id: req.params.id });
    const newDebtors = req.user.debtors.filter((d) => d != req.params.id);
    req.user.debtors = newDebtors;
    req.user.save();
    if (!debtor) {
      res.status(404).send();
    }

    res.send(debtor);
  } catch (e) {
    res.status(500).send();
  }
});

app.listen(process.env.PORT, () => {
  console.log("Listening...... ");
});
