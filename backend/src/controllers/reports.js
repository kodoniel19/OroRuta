const db = require("../config/db");
const { uuidv4, generateRefNo } = require("../utils");
const { z } = require("zod");

const reportSchema = z.object({
  type: z.enum(["Incorrect route information","Incorrect loading point","Incorrect terminal","Route change","Other"]),
  description: z.string().min(10).max(500),
  locationText: z.string().max(200).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
});

async function submit(req, res, next) {
  try {
    const data = reportSchema.parse(req.body);
    // Generate ref no
    const [[{ cnt }]] = await db.execute("SELECT COUNT(*) cnt FROM reports");
    const refNo = generateRefNo(cnt + 1);
    const id = uuidv4();
    await db.execute(
      `INSERT INTO reports (id, reference_no, device_id, type, description, location_text, lat, lng, status)
       VALUES (?,?,?,?,?,?,?,?,'pending')`,
      [id, refNo, req.deviceId, data.type, data.description,
       data.locationText || null, data.lat || null, data.lng || null]);
    res.status(201).json({ id, referenceNo: refNo });
  } catch (err) { next(err); }
}

async function mine(req, res, next) {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM reports WHERE device_id=? ORDER BY created_at DESC", [req.deviceId]);
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = { submit, mine };
