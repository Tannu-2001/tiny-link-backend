const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();
const db = require("./db");

db.query("SELECT NOW()", (err, result) => {
  if (err) {
    console.error("❌ DB CONNECT ERROR:", err);
  } else {
    console.log("✅ Postgres Connected:", result.rows[0]);
  }
});

const linksRouter = require("./routes/links");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


app.get("/healthz", (_req, res) => {
  res.json({ ok: true, version: "1.0" });
});

app.use("/api/links", linksRouter);

app.use(express.static(path.join(__dirname, "..", "public"))); 

app.get("/:code", async (req, res, next) => {
  const { code } = req.params;

  try {
    const result = await db.query(
      `UPDATE links
       SET total_clicks = total_clicks + 1,
           last_clicked_at = NOW()
       WHERE code = $1
       RETURNING target_url`,
      [code]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Not found");
    }

    const target = result.rows[0].target_url;
    return res.redirect(302, target);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal server error");
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
