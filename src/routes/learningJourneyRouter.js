const express = require("express");
const learningJourneyController = require("../controllers/learningJourneyController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", learningJourneyController.createLearningJourney);
router.put("/:id", learningJourneyController.updateLearningJourney);
router.delete("/:id", learningJourneyController.deleteLearningJourney);
router.get("/:id", learningJourneyController.getLearningJourney);
router.get("/", learningJourneyController.getAllLearningJourneys);

module.exports = router;
