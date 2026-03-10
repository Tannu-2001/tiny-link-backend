const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken")
const rateLimit = require("express-rate-limit");

module.exports = (req, res, next) => {

  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const token = authHeader.split(" ")[1]

  const decoded = jwt.verify(token, "secret123")

  req.userId = decoded.userId

  next()
}
require("dotenv").config();

const linksRouter = require("./routes/links");
const authRoutes = require("./routes/auth")
const prisma = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, try again later."
});

app.use(limiter);

app.use("/api/auth", authRoutes)

/* API routes */
app.use("/api/links", linksRouter);

/* ROOT ROUTE */
app.get("/", (req, res) => {
  res.send("TinyLink API running 🚀");
});

/* SHORT LINK REDIRECT */
app.get("/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const link = await prisma.link.findUnique({
      where: { shortCode: code }
    });

    if (!link) {
      return res.status(404).send("Link not found");
    }

    await prisma.link.update({
      where: { shortCode: code },
      data: { clicks: { increment: 1 } }
    });

    res.redirect(link.originalUrl);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open in browser: http://localhost:${PORT}`);
});