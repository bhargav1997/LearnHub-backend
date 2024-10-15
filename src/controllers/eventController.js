const Event = require("../models/Event");
const { sendEventEmail } = require("../services/eventService");

exports.getEvents = async (req, res) => {
   try {
      const { start_date, end_date } = req.query;
      const query = { user: req.user._id };

      if (start_date && end_date) {
         query.start = { $gte: new Date(start_date) };
         query.end = { $lte: new Date(end_date) };
      }

      const events = await Event.find(query).sort({ start: 1 });
      res.json(events);
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

exports.createEvent = async (req, res) => {
   try {
      const event = new Event({
         ...req.body,
         user: req.user._id,
      });
      const newEvent = await event.save();

      // Send email to user about the new event
      await sendEventEmail(req.user.email, newEvent);

      res.status(201).json(newEvent);
   } catch (error) {
      res.status(400).json({ message: error.message });
   }
};

exports.updateEvent = async (req, res) => {
   try {
      const updatedEvent = await Event.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, {
         new: true,
         runValidators: true,
      });
      if (!updatedEvent) {
         return res.status(404).json({ message: "Event not found" });
      }

      // Optionally, send an email about the updated event
      await sendEventEmail(req.user.email, updatedEvent);

      res.json(updatedEvent);
   } catch (error) {
      res.status(400).json({ message: error.message });
   }
};

exports.deleteEvent = async (req, res) => {
   try {
      const deletedEvent = await Event.findOneAndDelete({ _id: req.params.id, user: req.user._id });
      if (!deletedEvent) {
         return res.status(404).json({ message: "Event not found" });
      }

      // Optionally, send an email about the deleted event
      // You might want to create a separate function for this in emailService.js

      res.json({ message: "Event deleted successfully" });
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};
