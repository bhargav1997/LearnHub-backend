const transporter = require("./mail");

require("dotenv").config();

const generateTwoFactorCode = () => {
   return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendTwoFactorCode = async (email, code) => {
   const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Two-Factor Authentication Code",
      text: `Your verification code is: ${code}`,
   };

   await transporter.sendMail(mailOptions);
};

module.exports = { generateTwoFactorCode, sendTwoFactorCode };
