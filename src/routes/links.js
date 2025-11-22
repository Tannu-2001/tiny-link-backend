const express = require("express");
const router = express.Router();
const db = require("../db");

const CODE_REGEX = /^[A-Za-z0-9]{6,8}$/;

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

router.post("/", async (req, res) => {
  try {
    let { url, code } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "url is required" });
    }

    url = url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({ error: "Invalid URL" });
    }

    if (code) {
      code = code.trim();
      if (!CODE_REGEX.test(code)) {
        return res
          .status(400)
          .json({ error: "Code must match [A-Za-z0-9]{6,8}" });
      }
    } else {
      code = generateCode();
    }

    const existing = await db.query(
      "SELECT code FROM links WHERE code = $1",
      [code]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "Code already exists" });
    }

    const result = await db.query(
      `INSERT INTO links (code, target_url)
       VALUES ($1, $2)
       RETURNING code, target_url, total_clicks, last_clicked_at, created_at`,
      [code, url]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT code, target_url, total_clicks, last_clicked_at, created_at
       FROM links
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const result = await db.query(
      `SELECT code, target_url, total_clicks, last_clicked_at, created_at
       FROM links
       WHERE code = $1`,
      [code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const result = await db.query("DELETE FROM links WHERE code = $1", [code]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    res.status(204).send(); 
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function generateCode() {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const length = 6 + Math.floor(Math.random() * 3); 
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

module.exports = router;