const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
   // Configure your email service here
   service: "gmail",
   auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
   },
   tls: {
      rejectUnauthorized: false,
   },
});

module.exports = transporter;
