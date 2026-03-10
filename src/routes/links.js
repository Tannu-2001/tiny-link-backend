const express = require("express")
const router = express.Router()
const prisma = require("../db")
const auth = require("../middleware/auth")

const CODE_REGEX = /^[A-Za-z0-9]{6,8}$/

function isValidUrl(url) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

function generateCode() {

  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

  const length = 6 + Math.floor(Math.random() * 3)

  let code = ""

  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }

  return code
}

//
// CREATE LINK
//
router.post("/", auth, async (req, res) => {

  try {

    let { url, code } = req.body

    if (!url) {
      return res.status(400).json({ error: "URL required" })
    }

    url = url.trim()

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({ error: "Invalid URL" })
    }

    if (!code) {
      code = generateCode()
    }

    const link = await prisma.link.create({
      data: {
        shortCode: code,
        originalUrl: url,
        userId: req.userId
      }
    })

    res.status(201).json(link)

  } catch (err) {

    console.error(err)
    res.status(500).json({ error: "Server error" })

  }

})

//
// GET LINKS
//
router.get("/", async (req, res) => {

  const links = await prisma.link.findMany({
    orderBy: { createdAt: "desc" }
  })

  res.json(links)

})

//
// stats
router.get("/stats/:code", async (req, res) => {
  const { code } = req.params;

  const link = await prisma.link.findUnique({
    where: { shortCode: code }
  });

  if (!link) {
    return res.status(404).json({ error: "Not found" });
  }

  res.json({
    code: link.shortCode,
    target_url: link.originalUrl,
    total_clicks: link.clicks,
    created_at: link.createdAt
  });
});
// DELETE
//
router.delete("/:code", async (req, res) => {

  const { code } = req.params

  await prisma.link.delete({
    where: { shortCode: code }
  })

  res.json({ message: "Deleted" })

})

//
// REDIRECT
//
router.get("/:code", async (req, res) => {

  const { code } = req.params

  const link = await prisma.link.findUnique({
    where: { shortCode: code }
  })

  if (!link) {
    return res.status(404).send("Not found")
  }

  await prisma.link.update({
    where: { shortCode: code },
    data: {
      clicks: { increment: 1 }
    }
  })

  res.redirect(link.originalUrl)

})

module.exports = router