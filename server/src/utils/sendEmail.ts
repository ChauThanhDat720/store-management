import { subscribe } from 'node:diagnostics_channel';
import nodemailer from 'nodemailer';
interface EmailOption {
    email: string;
    subject: string;
    message: string;
}
export const sendEmail = async (options: EmailOption) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    const mailOptions = {
        from: `Store Management <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.message,
    };
    transporter.sendMail(mailOptions)
}