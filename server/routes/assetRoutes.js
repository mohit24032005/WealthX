const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
} = require("../controllers/assetController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getAssets);
router.post("/", createAsset);
router.put("/:id", updateAsset);
router.delete("/:id", deleteAsset);

module.exports = router;
