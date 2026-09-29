const db = require("../config/db");

async function getBase(req, res, next) {
  try {
    const [rows] = await db.execute("SELECT * FROM map_base ORDER BY type");
    rows.forEach(r => {
      if (typeof r.geometry === "string") {
        r.geometry = JSON.parse(r.geometry);
      }
    });
    res.json(rows);
  } catch (err) { next(err); }
}

async function getMapPack(req, res, next) {
  try {
    const [[row]] = await db.execute("SELECT * FROM offline_map_pack ORDER BY id DESC LIMIT 1");
    res.json(row || { version:"1.0.0", name:"CDO City Map Pack", size_mb:4.2 });
  } catch (err) { next(err); }
}

module.exports = { getBase, getMapPack };
