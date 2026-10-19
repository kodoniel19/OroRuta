require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const router = require("./routes");
const { errorHandler } = require("./middleware");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false }));

app.use("/api/v1", router);

app.use((req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Endpoint not found" } }));
app.use(errorHandler);

if (require.main === module) {
  const setupAdminTables = require("./config/setupAdminTables");
  const seedAnnouncements = require("./config/seedAnnouncements");
  setupAdminTables()
    .then(() => seedAnnouncements())
    .catch(console.error);
  app.listen(PORT, () => console.log(`OroRuta API running on port ${PORT}`));
}

module.exports = app;
