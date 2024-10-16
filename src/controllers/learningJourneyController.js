const LearningJourney = require("../models/LearningJourney");

exports.createLearningJourney = async (req, res) => {
   try {
      const { name, description, resources, tasks, steps, notes } = req.body;
      const newJourney = new LearningJourney({
         user: req.user._id,
         name,
         description,
         resources,
         tasks,
         steps,
         notes,
      });
      const savedJourney = await newJourney.save();
      res.status(201).json(savedJourney);
   } catch (error) {
      res.status(400).json({ message: error.message });
   }
};

exports.updateLearningJourney = async (req, res) => {
   try {
      const { id } = req.params;
      const { name, description, resources, tasks, steps, notes } = req.body;
      const updatedJourney = await LearningJourney.findOneAndUpdate(
         { _id: id, user: req.user._id },
         { name, description, resources, tasks, steps, notes },
         { new: true },
      );
      if (!updatedJourney) {
         return res.status(404).json({ message: "Learning journey not found" });
      }
      res.json(updatedJourney);
   } catch (error) {
      res.status(400).json({ message: error.message });
   }
};

exports.deleteLearningJourney = async (req, res) => {
   try {
      const { id } = req.params;
      const deletedJourney = await LearningJourney.findOneAndDelete({ _id: id, user: req.user._id });
      if (!deletedJourney) {
         return res.status(404).json({ message: "Learning journey not found" });
      }
      res.json({ message: "Learning journey deleted successfully" });
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

exports.getLearningJourney = async (req, res) => {
   try {
      const { id } = req.params;
      const journey = await LearningJourney.findOne({ _id: id, user: req.user._id });
      if (!journey) {
         return res.status(404).json({ message: "Learning journey not found" });
      }
      res.json(journey);
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

exports.getAllLearningJourneys = async (req, res) => {
   try {
      const journeys = await LearningJourney.find({ user: req.user._id });
      res.json(journeys);
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};
