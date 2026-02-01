# Ultra Secure Payment Portal

This guide will help you set up the Node.js backend to send real OTP emails.

## Prerequisites

- Node.js (version 14 or higher)
- Gmail account with App Password (or other email service)

## Setup Instructions

### 1. Install Dependencies

Open Command Prompt or PowerShell in the project folder and run:

```bash
npm install
```

### 2. Configure Email Settings

1. Edit the `.env` file in the project root
2. Replace the email configuration with your actual credentials:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-actual-email@gmail.com
EMAIL_PASS=your-app-password-here
EMAIL_FROM_NAME=Ultra Secure Payment Portal

# Server Configuration
PORT=3000
NODE_ENV=development

# Security
SESSION_SECRET=ultra-secure-secret-key-change-this-in-production
```

### 3. Gmail App Password Setup

If you're using Gmail:

1. Go to your Google Account settings
2. Navigate to Security → 2-Step Verification
3. Scroll down to "App passwords"
4. Generate a new app password for "Mail"
5. Use this 16-character password in the `.env` file

### 4. Start the Server

Run the following command:

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 5. Test the Application

1. Open your browser and go to `http://localhost:3000`
2. Fill out the payment form with a valid email address
3. Check your email inbox for the OTP

## Project Structure

```
/
├── server.js          # Main server file
├── index.html         # Frontend payment portal
├── package.json       # Dependencies
├── .env              # Environment variables (email credentials)
└── README.md         # This file
```

## API Endpoints

- `GET /` - Serves the payment portal
- `POST /api/generate-invoice` - Generates invoice and sends OTP
- `POST /api/verify-otp` - Verifies OTP and invoice
- `POST /api/resend-otp` - Resends OTP to email
- `GET /api/invoice/:invoiceNumber` - Gets invoice details

## Security Features

- Email validation
- OTP expiration (10 minutes)
- Rate limiting (attempt tracking)
- Session management
- Input sanitization
- Professional email templates

## Email Services Supported

- Gmail (smtp.gmail.com:587)
- Outlook (smtp-mail.outlook.com:587)
- Yahoo (smtp.mail.yahoo.com:587)
- Custom SMTP servers

## Troubleshooting

### Email Not Sending

1. Check your email credentials in `.env`
2. Ensure "Less secure app access" is enabled (Gmail)
3. Use App Password instead of regular password
4. Check console for error messages

### Server Won't Start

1. Make sure Node.js is installed: `node --version`
2. Install dependencies: `npm install`
3. Check if port 3000 is available

### CORS Issues

The server includes CORS headers for frontend-backend communication.

## Production Deployment

For production:

1. Change `NODE_ENV=production` in `.env`
2. Use a process manager like PM2
3. Set up SSL/HTTPS
4. Use a database instead of in-memory storage
5. Implement proper rate limiting
6. Add logging and monitoring

## Support


For issues or questions, check the server console for error messages and ensure all dependencies are properly installed.
