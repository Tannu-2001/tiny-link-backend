const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const prisma = require("../db")

const router = express.Router()

// register
router.post("/register", async (req, res) => {

  const { email, password } = req.body

  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    return res.status(400).json({ error: "Email already registered" })
  }

  const hashed = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed
    }
  })

  res.json(user)

})

// login
router.post("/login", async (req, res) => {

  const { email, password } = req.body

  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    return res.status(400).json({ error: "User not found" })
  }

  const valid = await bcrypt.compare(password, user.password)

  if (!valid) {
    return res.status(400).json({ error: "Invalid password" })
  }

  const token = jwt.sign(
    { userId: user.id },
    "secret123"
  )

  res.json({ token })

})

module.exports = router