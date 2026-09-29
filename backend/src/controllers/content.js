const db = require("../config/db");

async function getPage(req, res, next) {
  try {
    const [[row]] = await db.execute("SELECT * FROM content_pages WHERE slug=?", [req.params.slug]);
    if (!row) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Page not found" } });
    if (typeof row.sections === "string") {
      row.sections = JSON.parse(row.sections);
    }
    res.json(row);
  } catch (err) { next(err); }
}

async function getHelpTopics(req, res, next) {
  try {
    const [rows] = await db.execute("SELECT * FROM help_topics ORDER BY seq");
    res.json(rows);
  } catch (err) { next(err); }
}

async function getFaqs(req, res, next) {
  try {
    const [rows] = await db.execute("SELECT * FROM faqs ORDER BY seq");
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = { getPage, getHelpTopics, getFaqs };
