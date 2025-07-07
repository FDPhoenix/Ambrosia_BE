const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

exports.transporter = nodemailer.createTransport({
   service: 'gmail',
   auth: {
      user: process.env.MAIL_ACCOUNT,
      pass: process.env.MAIL_APP_PASSWORD
   }
});