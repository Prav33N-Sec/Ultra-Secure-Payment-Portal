const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// In-memory storage for OTPs (in production, use Redis or database)
const otpStorage = new Map();
const invoiceStorage = new Map();

// Email transporter configuration
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify email configuration on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('Email configuration error:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

// Helper function to generate OTP
function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Helper function to generate unique invoice number
function generateUniqueInvoiceNumber() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const checksum = (timestamp + random).split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 100;
    return `INV-${timestamp.toUpperCase()}-${random.toUpperCase()}-${checksum.toString().padStart(2, '0')}`;
}

// Email template for OTP
function getOTPEmailTemplate(otp, customerName, invoiceNumber) {
    return {
        subject: '🔐 Your Secure Payment OTP - Ultra Secure Payment Portal',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .otp-box { background: #f8f9fa; border: 2px solid #007bff; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
                .otp-code { font-size: 2rem; font-weight: bold; color: #007bff; letter-spacing: 5px; margin: 10px 0; }
                .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 15px 0; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 0.9rem; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🛡️ Ultra Secure Payment Portal</h1>
                    <p>Your One-Time Password (OTP)</p>
                </div>
                <div class="content">
                    <h2>Hello ${customerName},</h2>
                    <p>You have requested an OTP for your payment verification. Please use the following code to complete your transaction:</p>
                    
                    <div class="otp-box">
                        <p><strong>Your OTP Code:</strong></p>
                        <div class="otp-code">${otp}</div>
                        <p><small>Valid for 10 minutes</small></p>
                    </div>

                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong>
                        <ul style="margin: 10px 0; text-align: left;">
                            <li>This OTP is valid for 10 minutes only</li>
                            <li>Do not share this code with anyone</li>
                            <li>Invoice Number: <strong>${invoiceNumber}</strong></li>
                            <li>If you didn't request this, please ignore this email</li>
                        </ul>
                    </div>

                    <p>If you have any questions or concerns, please contact our support team immediately.</p>
                </div>
                <div class="footer">
                    <p>© 2025 Ultra Secure Payment Portal. All rights reserved.</p>
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        `
    };
}

// API Routes

// Route to serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route to serve the admin dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Admin API Routes

// Get all invoices for admin dashboard
app.get('/api/admin/invoices', (req, res) => {
    try {
        const invoicesArray = Array.from(invoiceStorage.values())
            .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first

        res.json({
            success: true,
            data: invoicesArray
        });
    } catch (error) {
        console.error('Error fetching invoices for admin:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoices'
        });
    }
});

// Admin manual invoice verification
app.post('/api/admin/verify-invoice', (req, res) => {
    try {
        const { invoiceNumber } = req.body;

        if (!invoiceNumber) {
            return res.status(400).json({
                success: false,
                message: 'Invoice number is required'
            });
        }

        const invoice = invoiceStorage.get(invoiceNumber);
        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        // Update invoice status to admin-verified
        invoice.adminVerified = true;
        invoice.adminVerificationTime = Date.now();
        invoiceStorage.set(invoiceNumber, invoice);

        res.json({
            success: true,
            message: 'Invoice verified by admin',
            data: invoice
        });

        console.log(`Admin verified invoice: ${invoiceNumber}`);

    } catch (error) {
        console.error('Error in admin verification:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Approve invoice
app.post('/api/admin/approve-invoice', (req, res) => {
    try {
        const { invoiceNumber } = req.body;

        if (!invoiceNumber) {
            return res.status(400).json({
                success: false,
                message: 'Invoice number is required'
            });
        }

        const invoice = invoiceStorage.get(invoiceNumber);
        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        // Update invoice status to approved
        invoice.status = 'approved';
        invoice.adminApproved = true;
        invoice.adminApprovalTime = Date.now();
        invoiceStorage.set(invoiceNumber, invoice);

        res.json({
            success: true,
            message: 'Invoice approved successfully',
            data: invoice
        });

        console.log(`Admin approved invoice: ${invoiceNumber}`);

    } catch (error) {
        console.error('Error approving invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Reject invoice
app.post('/api/admin/reject-invoice', (req, res) => {
    try {
        const { invoiceNumber } = req.body;

        if (!invoiceNumber) {
            return res.status(400).json({
                success: false,
                message: 'Invoice number is required'
            });
        }

        const invoice = invoiceStorage.get(invoiceNumber);
        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        // Update invoice status to rejected
        invoice.status = 'rejected';
        invoice.adminRejected = true;
        invoice.adminRejectionTime = Date.now();
        invoiceStorage.set(invoiceNumber, invoice);

        res.json({
            success: true,
            message: 'Invoice rejected',
            data: invoice
        });

        console.log(`Admin rejected invoice: ${invoiceNumber}`);

    } catch (error) {
        console.error('Error rejecting invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Check if invoice is admin approved (for payment flow)
app.post('/api/check-admin-approval', (req, res) => {
    try {
        const { invoiceNumber } = req.body;

        if (!invoiceNumber) {
            return res.status(400).json({
                success: false,
                message: 'Invoice number is required'
            });
        }

        const invoice = invoiceStorage.get(invoiceNumber);
        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        const isApproved = invoice.status === 'approved' && invoice.adminApproved;

        res.json({
            success: true,
            approved: isApproved,
            status: invoice.status,
            message: isApproved ? 
                'Invoice is approved by admin' : 
                'Invoice pending admin approval'
        });

    } catch (error) {
        console.error('Error checking admin approval:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Route to generate invoice and send OTP
app.post('/api/generate-invoice', async (req, res) => {
    try {
        const { customerName, customerEmail, customerPhone, paymentAmount } = req.body;

        // Validation
        if (!customerName || !customerEmail || !customerPhone || !paymentAmount) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email address'
            });
        }

        // Generate OTP and invoice
        const otp = generateOTP();
        const invoiceNumber = generateUniqueInvoiceNumber();
        const sessionId = 'SES-' + Date.now().toString(36).toUpperCase();

        // Store in memory (in production, use database)
        const invoiceData = {
            customerName,
            customerEmail,
            customerPhone,
            paymentAmount: parseFloat(paymentAmount),
            otp,
            invoiceNumber,
            sessionId,
            timestamp: Date.now(),
            status: 'pending',
            attempts: 0
        };

        otpStorage.set(customerEmail, {
            otp,
            invoiceNumber,
            timestamp: Date.now(),
            attempts: 0
        });

        invoiceStorage.set(invoiceNumber, invoiceData);

        // Send OTP email
        const emailTemplate = getOTPEmailTemplate(otp, customerName, invoiceNumber);
        
        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
            to: customerEmail,
            subject: emailTemplate.subject,
            html: emailTemplate.html
        };

        await transporter.sendMail(mailOptions);

        // Return success response (don't include OTP in response for security)
        res.json({
            success: true,
            message: 'Invoice generated and OTP sent to email',
            data: {
                invoiceNumber,
                sessionId,
                maskedEmail: customerEmail.substr(0, 3) + '****@' + customerEmail.split('@')[1]
            }
        });

        console.log(`OTP sent to ${customerEmail}: ${otp} for invoice: ${invoiceNumber}`);

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP email. Please check your email configuration.'
        });
    }
});

// Route to verify OTP and invoice
app.post('/api/verify-otp', (req, res) => {
    try {
        const { email, otp, invoiceNumber } = req.body;

        if (!email || !otp || !invoiceNumber) {
            return res.status(400).json({
                success: false,
                message: 'Email, OTP, and invoice number are required'
            });
        }

        // Check if OTP exists for this email
        const storedOTP = otpStorage.get(email);
        if (!storedOTP) {
            return res.status(400).json({
                success: false,
                message: 'No OTP found for this email'
            });
        }

        // Check if OTP is expired (10 minutes)
        const currentTime = Date.now();
        const otpAge = currentTime - storedOTP.timestamp;
        if (otpAge > 10 * 60 * 1000) { // 10 minutes
            otpStorage.delete(email);
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Check attempts
        if (storedOTP.attempts >= 3) {
            otpStorage.delete(email);
            return res.status(400).json({
                success: false,
                message: 'Maximum OTP attempts exceeded'
            });
        }

        // Verify OTP and invoice number
        if (storedOTP.otp !== otp || storedOTP.invoiceNumber !== invoiceNumber) {
            storedOTP.attempts++;
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP or invoice number',
                attemptsLeft: 3 - storedOTP.attempts
            });
        }

        // Success - remove OTP from storage
        otpStorage.delete(email);

        // Update invoice status
        const invoiceData = invoiceStorage.get(invoiceNumber);
        if (invoiceData) {
            invoiceData.status = 'verified';
            invoiceStorage.set(invoiceNumber, invoiceData);
        }

        res.json({
            success: true,
            message: 'OTP and invoice verified successfully',
            data: {
                invoiceNumber,
                status: 'verified'
            }
        });

    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Route to resend OTP
app.post('/api/resend-otp', async (req, res) => {
    try {
        const { email, invoiceNumber } = req.body;

        if (!email || !invoiceNumber) {
            return res.status(400).json({
                success: false,
                message: 'Email and invoice number are required'
            });
        }

        // Check if invoice exists
        const invoiceData = invoiceStorage.get(invoiceNumber);
        if (!invoiceData) {
            return res.status(400).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        // Generate new OTP
        const newOtp = generateOTP();

        // Update OTP storage
        otpStorage.set(email, {
            otp: newOtp,
            invoiceNumber,
            timestamp: Date.now(),
            attempts: 0
        });

        // Send new OTP email
        const emailTemplate = getOTPEmailTemplate(newOtp, invoiceData.customerName, invoiceNumber);
        
        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: emailTemplate.subject,
            html: emailTemplate.html
        };

        await transporter.sendMail(mailOptions);

        res.json({
            success: true,
            message: 'New OTP sent to email'
        });

        console.log(`New OTP sent to ${email}: ${newOtp} for invoice: ${invoiceNumber}`);

    } catch (error) {
        console.error('Error resending OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend OTP email'
        });
    }
});

// Route to get invoice details
app.get('/api/invoice/:invoiceNumber', (req, res) => {
    const { invoiceNumber } = req.params;
    
    const invoiceData = invoiceStorage.get(invoiceNumber);
    if (!invoiceData) {
        return res.status(404).json({
            success: false,
            message: 'Invoice not found'
        });
    }

    // Return invoice data without sensitive information
    const { otp, ...safeInvoiceData } = invoiceData;
    res.json({
        success: true,
        data: safeInvoiceData
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📧 Email service configured with: ${process.env.EMAIL_USER}`);
});

module.exports = app;