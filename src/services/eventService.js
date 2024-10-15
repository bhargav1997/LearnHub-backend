const nodemailer = require("nodemailer");
const ics = require('ics');

const transporter = nodemailer.createTransport({
   service: "gmail",
   auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
   },
});

function createICSFile(event) {
   const startDate = new Date(event.start);
   const endDate = event.end ? new Date(event.end) : new Date(startDate.getTime() + 60 * 60 * 1000); // Default to 1 hour if no end time

   const icsEvent = {
      start: [startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate(), startDate.getHours(), startDate.getMinutes()],
      end: [endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate(), endDate.getHours(), endDate.getMinutes()],
      title: event.title,
      description: event.description,
      location: event.resourceLink,
      url: event.resourceLink,
      categories: [event.resourceType],
   };

   return new Promise((resolve, reject) => {
      ics.createEvent(icsEvent, (error, value) => {
         if (error) {
            reject(error);
         } else {
            resolve(value);
         }
      });
   });
}

async function sendEventEmail(to, event) {
   const icsContent = await createICSFile(event);

   const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject: `New Event: ${event.title}`,
      html: `
         <h1>New Event: ${event.title}</h1>
         <p><strong>Description:</strong> ${event.description}</p>
         <p><strong>Start:</strong> ${event.start}</p>
         <p><strong>End:</strong> ${event.end || 'Not specified'}</p>
         <p><strong>Resource Type:</strong> ${event.resourceType}</p>
         <p><strong>Resource Link:</strong> ${event.resourceLink || 'Not provided'}</p>
         <p>You can add this event to your calendar using the attached .ics file.</p>
      `,
      attachments: [
         {
            filename: 'invite.ics',
            content: icsContent,
            contentType: 'text/calendar',
         },
      ],
   };

   try {
      await transporter.sendMail(mailOptions);
      console.log('Event email sent successfully');
   } catch (error) {
      console.error('Error sending event email:', error);
      throw error;
   }
}

module.exports = { sendEventEmail };
