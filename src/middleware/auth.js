const jwt = require("jsonwebtoken")

module.exports = (req, res, next) => {

  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const token = authHeader.split(" ")[1]

  try {

    const decoded = jwt.verify(token, "secret123")

    req.userId = decoded.userId

    next()

  } catch {
    res.status(401).json({ error: "Invalid token" })
  }

}