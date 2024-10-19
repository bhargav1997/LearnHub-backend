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

// New routes for deleting resources and tasks
router.delete('/:journeyId/resources/:resourceId', learningJourneyController.deleteResource);
router.delete('/:journeyId/tasks/:taskId', learningJourneyController.deleteTask);

router.post("/:id/share", learningJourneyController.shareJourney);
router.get("/shared", learningJourneyController.getSharedJourneys);
router.put("/shared/:id/respond", learningJourneyController.respondToSharedJourney);

module.exports = router;
