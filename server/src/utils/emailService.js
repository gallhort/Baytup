const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false // Accept self-signed certificates
    }
  });
};

// Send email verification email
const sendEmailVerification = async (user, verificationToken) => {
  try {
    const transporter = createTransporter();

    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Verify Your Email - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .button:hover {
              background: linear-gradient(135deg, #F7931E, #FF6B35);
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
            .alternative-link {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
              word-break: break-all;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Baytup</div>
            <p>Welcome to Algeria's Premier Rental Marketplace</p>
          </div>

          <div class="content">
            <h2>Welcome to Baytup, ${user.firstName}!</h2>

            <p>Thank you for joining Baytup, Algeria's premier platform for property and vehicle rentals. To get started, please verify your email address by clicking the button below:</p>

            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify My Email</a>
            </div>

            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>

            <div class="alternative-link">
              ${verificationUrl}
            </div>

            <p><strong>This link will expire in 24 hours.</strong></p>

            <p>Once your email is verified, you'll be able to:</p>
            <ul>
              <li>Browse and book amazing properties and vehicles</li>
              <li>List your own properties or vehicles for rent</li>
              <li>Connect with hosts and guests across Algeria</li>
              <li>Enjoy secure payment processing</li>
            </ul>

            <p>If you didn't create an account with Baytup, please ignore this email.</p>

            <p>Welcome aboard!</p>
            <p><strong>The Baytup Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Baytup, ${user.firstName}!

        Thank you for joining Baytup. Please verify your email address by visiting:
        ${verificationUrl}

        This link will expire in 24 hours.

        If you didn't create an account with Baytup, please ignore this email.

        The Baytup Team
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    const transporter = createTransporter();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Password Reset Request - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .button:hover {
              background: linear-gradient(135deg, #F7931E, #FF6B35);
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .alternative-link {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
              word-break: break-all;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Baytup</div>
            <p>Password Reset Request</p>
          </div>

          <div class="content">
            <h2>Reset Your Password</h2>

            <p>Hello ${user.firstName},</p>

            <p>We received a request to reset your password for your Baytup account. Click the button below to reset your password:</p>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset My Password</a>
            </div>

            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>

            <div class="alternative-link">
              ${resetUrl}
            </div>

            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link will expire in 10 minutes for security reasons</li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>Your password will remain unchanged until you create a new one</li>
              </ul>
            </div>

            <p>For security reasons, if you don't reset your password within 10 minutes, you'll need to request a new password reset link.</p>

            <p>If you're having trouble or didn't request this reset, please contact our support team.</p>

            <p>Best regards,</p>
            <p><strong>The Baytup Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request - Baytup

        Hello ${user.firstName},

        We received a request to reset your password. Visit this link to reset your password:
        ${resetUrl}

        This link will expire in 10 minutes.

        If you didn't request this password reset, please ignore this email.

        The Baytup Team
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Send welcome email (after email verification)
const sendWelcomeEmail = async (user) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Welcome to Baytup! Your account is ready',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .feature-list {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🎉 Baytup</div>
            <p>Your Account is Ready!</p>
          </div>

          <div class="content">
            <h2>Welcome to Baytup, ${user.firstName}!</h2>

            <p>Congratulations! Your email has been verified and your Baytup account is now fully activated.</p>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}" class="button">Start Exploring</a>
            </div>

            <div class="feature-list">
              <h3>What's Next?</h3>
              <ul>
                <li><strong>Explore Properties:</strong> Discover unique stays across Algeria</li>
                <li><strong>Rent Vehicles:</strong> Find the perfect car, motorcycle, or bike</li>
                <li><strong>Become a Host:</strong> List your property or vehicle for extra income</li>
                <li><strong>Secure Payments:</strong> Pay safely with our integrated payment system</li>
                <li><strong>24/7 Support:</strong> Our team is here to help whenever you need</li>
              </ul>
            </div>

            <p>Ready to ${user.role === 'host' ? 'start hosting' : 'find your next adventure'}? Head to your dashboard and explore everything Baytup has to offer.</p>

            <p>Thank you for choosing Baytup - Algeria's premier rental marketplace!</p>

            <p>Happy ${user.role === 'host' ? 'hosting' : 'exploring'},</p>
            <p><strong>The Baytup Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

// Send host application submitted email
const sendHostApplicationSubmitted = async (user, application) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Host Application Submitted - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Host Application Submitted - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .info-box {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
              border-left: 4px solid #FF6B35;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Baytup</div>
            <p>Host Application Submitted</p>
          </div>

          <div class="content">
            <h2>Thank You, ${user.firstName}!</h2>

            <p>We've received your host application and our team is excited to review it.</p>

            <div class="info-box">
              <h3>What Happens Next?</h3>
              <ul>
                <li><strong>Review Process:</strong> Our team will carefully review your application within 2-3 business days</li>
                <li><strong>Verification:</strong> We'll verify your documents and information</li>
                <li><strong>Notification:</strong> You'll receive an email once the review is complete</li>
              </ul>
            </div>

            <p>In the meantime, you can:</p>
            <ul>
              <li>Check your application status in your dashboard</li>
              <li>Prepare high-quality photos of your properties or vehicles</li>
              <li>Read our hosting guidelines and best practices</li>
            </ul>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/become-host/status" class="button">View Application Status</a>
            </div>

            <p>If you have any questions about your application, feel free to contact our support team.</p>

            <p>Best regards,</p>
            <p><strong>The Baytup Host Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Host Application Submitted - Baytup

        Thank You, ${user.firstName}!

        We've received your host application and our team is excited to review it.

        What Happens Next?
        - Review Process: Our team will carefully review your application within 2-3 business days
        - Verification: We'll verify your documents and information
        - Notification: You'll receive an email once the review is complete

        Check your application status: ${process.env.CLIENT_URL}/become-host/status

        Best regards,
        The Baytup Host Team
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending host application submitted email:', error);
    throw error;
  }
};

// Send host application approved email
const sendHostApplicationApproved = async (user, application) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Congratulations! You\'re Now a Baytup Host - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Host Application Approved - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .success-box {
              background: #d4edda;
              border: 1px solid #c3e6cb;
              color: #155724;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
              text-align: center;
            }
            .feature-list {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🎉 Baytup</div>
            <p>Welcome to the Host Community!</p>
          </div>

          <div class="content">
            <h2>Congratulations, ${user.firstName}!</h2>

            <div class="success-box">
              <h3 style="margin-top: 0;">✓ Your Host Application has been Approved!</h3>
              <p style="margin-bottom: 0;">You're now an official Baytup host and can start listing your properties or vehicles.</p>
            </div>

            <p>We're thrilled to have you join our community of trusted hosts across Algeria!</p>

            <div class="feature-list">
              <h3>Getting Started as a Host:</h3>
              <ul>
                <li><strong>Create Your First Listing:</strong> Add detailed descriptions and high-quality photos</li>
                <li><strong>Set Your Availability:</strong> Choose when your property or vehicle is available</li>
                <li><strong>Set Competitive Prices:</strong> Use our pricing tools to maximize your earnings</li>
                <li><strong>Respond to Bookings:</strong> Quick responses lead to better reviews</li>
                <li><strong>Maintain High Standards:</strong> Great experiences lead to 5-star ratings</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/host/listings/new" class="button">Create Your First Listing</a>
            </div>

            <p><strong>Host Resources:</strong></p>
            <ul>
              <li>Host Dashboard - Manage all your listings and bookings</li>
              <li>Host Guidelines - Best practices for success</li>
              <li>Host Support - Get help whenever you need it</li>
              <li>Host Community - Connect with other hosts</li>
            </ul>

            ${application.reviewNotes ? `
              <p><strong>Reviewer Notes:</strong></p>
              <p style="background: #f8f9fa; padding: 15px; border-radius: 6px;">${application.reviewNotes}</p>
            ` : ''}

            <p>Ready to start your hosting journey? We're here to support you every step of the way!</p>

            <p>Best regards,</p>
            <p><strong>The Baytup Host Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Congratulations! You're Now a Baytup Host

        Congratulations, ${user.firstName}!

        Your host application has been approved! You're now an official Baytup host and can start listing your properties or vehicles.

        Getting Started:
        - Create your first listing with detailed descriptions and photos
        - Set your availability and competitive prices
        - Respond quickly to booking requests
        - Maintain high standards for great reviews

        Create your first listing: ${process.env.CLIENT_URL}/host/listings/new

        ${application.reviewNotes ? `Reviewer Notes: ${application.reviewNotes}` : ''}

        Best regards,
        The Baytup Host Team
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending host application approved email:', error);
    throw error;
  }
};

// Send host application rejected email
const sendHostApplicationRejected = async (user, application) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Host Application Update - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Host Application Update - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .info-box {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Baytup</div>
            <p>Host Application Update</p>
          </div>

          <div class="content">
            <h2>Hello ${user.firstName},</h2>

            <p>Thank you for your interest in becoming a Baytup host. After careful review, we're unable to approve your host application at this time.</p>

            ${application.rejectionReason ? `
              <div class="info-box">
                <strong>Reason for Decision:</strong>
                <p style="margin-bottom: 0;">${application.rejectionReason}</p>
              </div>
            ` : ''}

            <p><strong>What This Means:</strong></p>
            <ul>
              <li>You can continue using Baytup as a guest to book properties and vehicles</li>
              <li>You may reapply to become a host after addressing the concerns mentioned above</li>
              <li>Our support team is available if you have questions about this decision</li>
            </ul>

            <p>We encourage you to review our hosting requirements and consider reapplying in the future once you meet all criteria.</p>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/support" class="button">Contact Support</a>
            </div>

            <p>Thank you for your understanding, and we hope to have you as a host in the future.</p>

            <p>Best regards,</p>
            <p><strong>The Baytup Host Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Host Application Update - Baytup

        Hello ${user.firstName},

        Thank you for your interest in becoming a Baytup host. After careful review, we're unable to approve your host application at this time.

        ${application.rejectionReason ? `Reason: ${application.rejectionReason}` : ''}

        You can continue using Baytup as a guest and may reapply to become a host in the future.

        Contact support: ${process.env.CLIENT_URL}/support

        Best regards,
        The Baytup Host Team
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending host application rejected email:', error);
    throw error;
  }
};

// Send host application resubmission request email
const sendHostApplicationResubmission = async (user, application) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Action Required: Update Your Host Application - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Host Application - Resubmission Required - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .info-box {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Baytup</div>
            <p>Action Required on Your Host Application</p>
          </div>

          <div class="content">
            <h2>Hello ${user.firstName},</h2>

            <p>We've reviewed your host application and need some additional information or corrections before we can proceed.</p>

            ${application.reviewNotes ? `
              <div class="info-box">
                <strong>Required Changes:</strong>
                <p style="margin-bottom: 0;">${application.reviewNotes}</p>
              </div>
            ` : ''}

            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Review the feedback provided above</li>
              <li>Update your application with the requested information</li>
              <li>Resubmit your application for review</li>
            </ul>

            <p>Once you've made the necessary updates, our team will review your application again promptly.</p>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/become-host/application" class="button">Update Application</a>
            </div>

            <p>If you have any questions about the requested changes, please don't hesitate to contact our support team.</p>

            <p>Best regards,</p>
            <p><strong>The Baytup Host Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Action Required: Update Your Host Application - Baytup

        Hello ${user.firstName},

        We've reviewed your host application and need some additional information or corrections before we can proceed.

        ${application.reviewNotes ? `Required Changes: ${application.reviewNotes}` : ''}

        Next Steps:
        - Review the feedback provided
        - Update your application with the requested information
        - Resubmit your application for review

        Update your application: ${process.env.CLIENT_URL}/become-host/application

        Best regards,
        The Baytup Host Team
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending host application resubmission email:', error);
    throw error;
  }
};

// Send payout request email (to host and admins)
const sendPayoutRequestEmail = async (user, payout, isAdmin = false) => {
  try {
    const transporter = createTransporter();

    const formatCurrency = (amount) => {
      return `${amount.toLocaleString()} ${payout.currency}`;
    };

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: isAdmin ? `New Payout Request from ${payout.host.firstName} ${payout.host.lastName}` : 'Payout Request Submitted - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${isAdmin ? 'New Payout Request' : 'Payout Request Submitted'} - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .info-box {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
              border-left: 4px solid #FF6B35;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e5e5e5;
            }
            .detail-label {
              font-weight: 600;
              color: #666;
            }
            .detail-value {
              color: #333;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">💰 Baytup</div>
            <p>${isAdmin ? 'New Payout Request Received' : 'Payout Request Submitted'}</p>
          </div>

          <div class="content">
            <h2>${isAdmin ? `Payout Request from ${payout.host.firstName} ${payout.host.lastName}` : `Hello ${user.firstName},`}</h2>

            <p>${isAdmin ?
              'A new payout request has been submitted and requires your review.' :
              'Your payout request has been successfully submitted and is now pending review by our team.'
            }</p>

            <div class="info-box">
              <h3 style="margin-top: 0;">Payout Details</h3>
              <div class="detail-row">
                <span class="detail-label">Request ID:</span>
                <span class="detail-value">${payout._id.toString().substring(0, 12).toUpperCase()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Amount:</span>
                <span class="detail-value" style="font-weight: bold; color: #FF6B35;">${formatCurrency(payout.amount)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Payment Method:</span>
                <span class="detail-value">${payout.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : payout.paymentMethod.toUpperCase()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">Pending Review</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Requested:</span>
                <span class="detail-value">${new Date(payout.requestedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
              ${payout.estimatedArrival ? `
              <div class="detail-row">
                <span class="detail-label">Estimated Arrival:</span>
                <span class="detail-value">${new Date(payout.estimatedArrival).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
              ` : ''}
            </div>

            ${isAdmin ? `
              <h3>Bank Account Details</h3>
              <div class="info-box">
                <div class="detail-row">
                  <span class="detail-label">Bank Name:</span>
                  <span class="detail-value">${payout.bankAccount.bankName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Account Holder:</span>
                  <span class="detail-value">${payout.bankAccount.accountHolderName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Account Number:</span>
                  <span class="detail-value">${payout.bankAccount.accountNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">RIB:</span>
                  <span class="detail-value">${payout.bankAccount.rib}</span>
                </div>
                ${payout.bankAccount.iban ? `
                <div class="detail-row">
                  <span class="detail-label">IBAN:</span>
                  <span class="detail-value">${payout.bankAccount.iban}</span>
                </div>
                ` : ''}
              </div>

              ${payout.hostNotes ? `
                <h3>Host Notes</h3>
                <p style="background: #f8f9fa; padding: 15px; border-radius: 6px;">${payout.hostNotes}</p>
              ` : ''}

              <div style="text-align: center;">
                <a href="${process.env.CLIENT_URL}/dashboard/payouts" class="button">Review Payout Request</a>
              </div>
            ` : `
              <h3>What Happens Next?</h3>
              <ul>
                <li><strong>Review Process:</strong> Our team will review your request within 1-2 business days</li>
                <li><strong>Processing Time:</strong> Once approved, funds typically arrive within 3-5 business days</li>
                <li><strong>Email Updates:</strong> You'll receive email notifications for any status changes</li>
                <li><strong>Track Status:</strong> You can check your payout status anytime in your dashboard</li>
              </ul>

              <div style="text-align: center;">
                <a href="${process.env.CLIENT_URL}/dashboard/earnings" class="button">View Payout Status</a>
              </div>

              <p><strong>Important:</strong> Please ensure your bank account details are correct. If you need to make any changes, please contact our support team immediately.</p>
            `}

            <p>${isAdmin ?
              'Please review and process this request at your earliest convenience.' :
              'Thank you for being a valued host on Baytup!'
            }</p>

            <p>Best regards,</p>
            <p><strong>The Baytup ${isAdmin ? 'Finance' : 'Host'} Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending payout request email:', error);
    throw error;
  }
};

// Send payout completed email
const sendPayoutCompletedEmail = async (user, payout) => {
  try {
    const transporter = createTransporter();

    const formatCurrency = (amount) => {
      return `${amount.toLocaleString()} ${payout.currency}`;
    };

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Payout Completed - Funds Transferred - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payout Completed - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .success-box {
              background: #d4edda;
              border: 1px solid #c3e6cb;
              color: #155724;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
              text-align: center;
            }
            .info-box {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
              border-left: 4px solid #FF6B35;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e5e5e5;
            }
            .detail-label {
              font-weight: 600;
              color: #666;
            }
            .detail-value {
              color: #333;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">✅ Baytup</div>
            <p>Payout Completed Successfully</p>
          </div>

          <div class="content">
            <h2>Great News, ${user.firstName}!</h2>

            <div class="success-box">
              <h3 style="margin-top: 0;">🎉 Your payout has been completed!</h3>
              <p style="font-size: 24px; font-weight: bold; color: #155724; margin: 10px 0;">
                ${formatCurrency(payout.finalAmount || payout.amount)}
              </p>
              <p style="margin-bottom: 0;">has been transferred to your bank account</p>
            </div>

            <p>Your withdrawal request has been processed and the funds are on their way to your bank account.</p>

            <div class="info-box">
              <h3 style="margin-top: 0;">Payout Summary</h3>
              <div class="detail-row">
                <span class="detail-label">Transaction ID:</span>
                <span class="detail-value">${payout.transactionId || payout._id.toString().substring(0, 12).toUpperCase()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Request ID:</span>
                <span class="detail-value">${payout._id.toString().substring(0, 12).toUpperCase()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Amount Transferred:</span>
                <span class="detail-value" style="font-weight: bold; color: #FF6B35;">${formatCurrency(payout.finalAmount || payout.amount)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Bank Account:</span>
                <span class="detail-value">${payout.bankAccount.bankName} - ${payout.bankAccount.accountNumber}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Completed Date:</span>
                <span class="detail-value">${new Date(payout.completedAt || Date.now()).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
            </div>

            ${payout.adminNotes ? `
              <h3>Note from Finance Team</h3>
              <p style="background: #f8f9fa; padding: 15px; border-radius: 6px;">${payout.adminNotes}</p>
            ` : ''}

            <h3>What to Expect</h3>
            <ul>
              <li><strong>Arrival Time:</strong> Funds typically appear in your bank account within 1-3 business days</li>
              <li><strong>Bank Processing:</strong> Your bank may take additional time to process the transfer</li>
              <li><strong>Confirmation:</strong> Check your bank statement for the deposit</li>
              <li><strong>Questions:</strong> Contact our support team if you have any concerns</li>
            </ul>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/dashboard/earnings" class="button">View Earnings Dashboard</a>
            </div>

            <p>Thank you for being a valued host on Baytup! We're proud to support your hosting journey.</p>

            <p>Best regards,</p>
            <p><strong>The Baytup Finance Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending payout completed email:', error);
    throw error;
  }
};

// Send payout rejected email
const sendPayoutRejectedEmail = async (user, payout) => {
  try {
    const transporter = createTransporter();

    const formatCurrency = (amount) => {
      return `${amount.toLocaleString()} ${payout.currency}`;
    };

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Payout Request Update - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payout Request Update - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .warning-box {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .info-box {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
              border-left: 4px solid #FF6B35;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e5e5e5;
            }
            .detail-label {
              font-weight: 600;
              color: #666;
            }
            .detail-value {
              color: #333;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Baytup</div>
            <p>Payout Request Update</p>
          </div>

          <div class="content">
            <h2>Hello ${user.firstName},</h2>

            <p>We've reviewed your payout request and unfortunately, we're unable to process it at this time.</p>

            <div class="info-box">
              <h3 style="margin-top: 0;">Request Details</h3>
              <div class="detail-row">
                <span class="detail-label">Request ID:</span>
                <span class="detail-value">${payout._id.toString().substring(0, 12).toUpperCase()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Amount:</span>
                <span class="detail-value">${formatCurrency(payout.amount)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Request Date:</span>
                <span class="detail-value">${new Date(payout.requestedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
            </div>

            ${payout.rejectionReason ? `
              <div class="warning-box">
                <strong>Reason for Rejection:</strong>
                <p style="margin-bottom: 0;">${payout.rejectionReason}</p>
              </div>
            ` : ''}

            <h3>What This Means</h3>
            <ul>
              <li>The funds will remain in your available balance</li>
              <li>You can submit a new payout request after addressing the issue</li>
              <li>Contact support if you need clarification on the rejection reason</li>
              <li>Ensure your bank account details are correct before resubmitting</li>
            </ul>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/dashboard/earnings" class="button">View Earnings Dashboard</a>
            </div>

            <p>If you have questions about this decision or need assistance, please don't hesitate to contact our support team.</p>

            <p>Best regards,</p>
            <p><strong>The Baytup Finance Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending payout rejected email:', error);
    throw error;
  }
};

// Send booking created email
const sendBookingCreatedEmail = async (user, booking, userType = 'guest') => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: userType === 'guest' ? 'Booking Confirmed - Baytup' : 'New Booking Request - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${userType === 'guest' ? 'Booking Confirmed' : 'New Booking Request'} - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .info-box {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
              border-left: 4px solid #FF6B35;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">📅 Baytup</div>
            <p>${userType === 'guest' ? 'Booking Confirmed!' : 'New Booking Request'}</p>
          </div>

          <div class="content">
            <h2>${userType === 'guest' ? `Great News, ${user.firstName}!` : `New Booking Request`}</h2>

            <p>${userType === 'guest' ?
              `Your booking request for "${booking.listing?.title || 'the listing'}" has been submitted successfully!` :
              `You have received a new booking request for "${booking.listing?.title || 'your listing'}".`
            }</p>

            <div class="info-box">
              <h3>Booking Details</h3>
              <p><strong>Check-in:</strong> ${new Date(booking.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Check-out:</strong> ${new Date(booking.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Guests:</strong> ${booking.guestCount?.adults || 1} Adult(s)${booking.guestCount?.children ? `, ${booking.guestCount.children} Child(ren)` : ''}</p>
              <p><strong>Total Amount:</strong> ${booking.pricing?.totalAmount?.toLocaleString() || 0} DZD</p>
              <p><strong>Status:</strong> ${booking.status === 'pending' ? 'Pending Approval' : 'Confirmed'}</p>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/dashboard/${userType === 'host' ? 'host/' : ''}bookings/${booking._id}" class="button">View Booking Details</a>
            </div>

            <p>Best regards,</p>
            <p><strong>The Baytup Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending booking created email:', error);
    throw error;
  }
};

// Send booking updated email
const sendBookingUpdatedEmail = async (user, booking, userType = 'guest') => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Booking Updated - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Updated - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .info-box {
              background: #fff3cd;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
              border-left: 4px solid #FF6B35;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">📝 Baytup</div>
            <p>Booking Updated</p>
          </div>

          <div class="content">
            <h2>${user.firstName},</h2>

            <p>${userType === 'guest' ?
              `Your booking for "${booking.listing?.title || 'the listing'}" has been updated successfully.` :
              `A guest has updated their booking for "${booking.listing?.title || 'your listing'}".`
            }</p>

            <div class="info-box">
              <h3>Updated Booking Details</h3>
              <p><strong>Check-in:</strong> ${new Date(booking.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Check-out:</strong> ${new Date(booking.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Guests:</strong> ${booking.guestCount?.adults || 1} Adult(s)${booking.guestCount?.children ? `, ${booking.guestCount.children} Child(ren)` : ''}</p>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/dashboard/${userType === 'host' ? 'host/' : ''}bookings/${booking._id}" class="button">View Booking</a>
            </div>

            <p>Best regards,</p>
            <p><strong>The Baytup Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending booking updated email:', error);
    throw error;
  }
};

// Send booking approved email
const sendBookingApprovedEmail = async (user, booking) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Booking Approved! - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Approved - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .success-box {
              background: #d4edda;
              border: 1px solid #c3e6cb;
              color: #155724;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
              text-align: center;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">✅ Baytup</div>
            <p>Booking Approved!</p>
          </div>

          <div class="content">
            <h2>Great News, ${user.firstName}!</h2>

            <div class="success-box">
              <h3>Your booking has been approved by the host!</h3>
              <p>You're all set for your stay at "${booking.listing?.title || 'the listing'}"</p>
            </div>

            <p>Your booking has been confirmed. Here are the details:</p>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p><strong>Check-in:</strong> ${new Date(booking.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Check-out:</strong> ${new Date(booking.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Total Amount:</strong> ${booking.pricing?.totalAmount?.toLocaleString() || 0} DZD</p>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/dashboard/bookings/${booking._id}" class="button">View Booking Details</a>
            </div>

            <p>We hope you have an amazing stay!</p>
            <p><strong>The Baytup Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending booking approved email:', error);
    throw error;
  }
};

// Send booking rejected email
const sendBookingRejectedEmail = async (user, booking) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Booking Request Update - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Request Update - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .warning-box {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Baytup</div>
            <p>Booking Request Update</p>
          </div>

          <div class="content">
            <h2>Hello ${user.firstName},</h2>

            <p>We're sorry to inform you that your booking request for "${booking.listing?.title || 'the listing'}" was not approved by the host.</p>

            <div class="warning-box">
              <p><strong>Don't worry!</strong> There are many other amazing properties available on Baytup.</p>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/search" class="button">Browse Other Listings</a>
            </div>

            <p>If you have any questions, our support team is here to help.</p>

            <p>Best regards,</p>
            <p><strong>The Baytup Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending booking rejected email:', error);
    throw error;
  }
};

// Send review received email
const sendReviewReceivedEmail = async (user, review) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'New Review Received - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Review - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .review-box {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
              border-left: 4px solid #FFD700;
            }
            .stars {
              color: #FFD700;
              font-size: 24px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">⭐ Baytup</div>
            <p>New Review Received!</p>
          </div>

          <div class="content">
            <h2>Hello ${user.firstName},</h2>

            <p>You've received a new ${review.rating?.overall || 5}-star review!</p>

            <div class="review-box">
              <div class="stars">${'⭐'.repeat(review.rating?.overall || 5)}</div>
              <p><strong>From:</strong> ${review.reviewer?.firstName || 'A guest'}</p>
              ${review.comment ? `<p><strong>Review:</strong> "${review.comment}"</p>` : ''}
            </div>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/dashboard/reviews" class="button">View Full Review</a>
            </div>

            <p>Keep up the great work!</p>
            <p><strong>The Baytup Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending review received email:', error);
    throw error;
  }
};

// Send booking updated by guest email (to host)
const sendBookingUpdatedByGuestEmail = async (host, booking, changes) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: host.email,
      subject: 'Guest Updated Booking - Action May Be Required - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Updated - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .warning-box {
              background: #fff3cd;
              border-left: 4px solid #FF6B35;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .info-box {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🔔 Baytup</div>
            <p>Booking Update - Action Required</p>
          </div>

          <div class="content">
            <h2>Hello ${host.firstName},</h2>

            <p>A guest has updated their booking for "${booking.listing?.title || 'your listing'}". Please review the changes and take appropriate action.</p>

            <div class="warning-box">
              <h3 style="margin-top: 0;">⚠️ Changes Made:</h3>
              ${changes || '<p>Booking details have been updated.</p>'}
            </div>

            <div class="info-box">
              <h3>Updated Booking Details</h3>
              <p><strong>Guest:</strong> ${booking.guest?.firstName} ${booking.guest?.lastName}</p>
              <p><strong>Check-in:</strong> ${new Date(booking.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Check-out:</strong> ${new Date(booking.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Guests:</strong> ${booking.guestCount?.adults || 1} Adult(s)${booking.guestCount?.children ? `, ${booking.guestCount.children} Child(ren)` : ''}</p>
              <p><strong>Total Amount:</strong> ${booking.pricing?.totalAmount?.toLocaleString() || 0} ${booking.pricing?.currency || 'DZD'}</p>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/dashboard/host/bookings/${booking._id}" class="button">Review Booking Changes</a>
            </div>

            <p><strong>Action Required:</strong> Please approve or decline the updated booking within 24 hours.</p>

            <p>Best regards,</p>
            <p><strong>The Baytup Host Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending booking updated by guest email:', error);
    throw error;
  }
};

// Send booking updated by admin email
const sendBookingUpdatedByAdminEmail = async (user, booking, userType = 'guest') => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Booking Modified by Admin - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Modified - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .info-box {
              background: #fff3cd;
              border-left: 4px solid #FF6B35;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">📝 Baytup</div>
            <p>Booking Modified by Admin</p>
          </div>

          <div class="content">
            <h2>Hello ${user.firstName},</h2>

            <p>Your booking for "${booking.listing?.title || 'the listing'}" has been modified by our admin team.</p>

            <div class="info-box">
              <h3 style="margin-top: 0;">ℹ️ Important Notice</h3>
              <p>This change was made by Baytup administration to resolve an issue or accommodate a special request.</p>
              ${booking.adminNotes ? `<p><strong>Admin Note:</strong> ${booking.adminNotes}</p>` : ''}
            </div>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h3>Updated Booking Details</h3>
              <p><strong>Check-in:</strong> ${new Date(booking.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Check-out:</strong> ${new Date(booking.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Total Amount:</strong> ${booking.pricing?.totalAmount?.toLocaleString() || 0} ${booking.pricing?.currency || 'DZD'}</p>
              <p><strong>Status:</strong> ${booking.status}</p>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/dashboard/${userType === 'host' ? 'host/' : ''}bookings/${booking._id}" class="button">View Booking Details</a>
            </div>

            <p>If you have questions about these changes, please contact our support team.</p>

            <p>Best regards,</p>
            <p><strong>The Baytup Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending booking updated by admin email:', error);
    throw error;
  }
};

// Send payment confirmed by host email (to guest)
const sendPaymentConfirmedByHostEmail = async (guest, booking) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: guest.email,
      subject: 'Payment Confirmed - Booking Approved! - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Confirmed - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .success-box {
              background: #d4edda;
              border: 1px solid #c3e6cb;
              color: #155724;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
              text-align: center;
            }
            .info-box {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">✅ Baytup</div>
            <p>Payment Confirmed!</p>
          </div>

          <div class="content">
            <h2>Great News, ${guest.firstName}!</h2>

            <div class="success-box">
              <h3 style="margin-top: 0;">💰 Payment Confirmed!</h3>
              <p style="margin-bottom: 0;">The host has confirmed receipt of your payment. Your booking is now confirmed!</p>
            </div>

            <p>Your booking for "${booking.listing?.title || 'the listing'}" has been approved and confirmed.</p>

            <div class="info-box">
              <h3>Booking Details</h3>
              <p><strong>Check-in:</strong> ${new Date(booking.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Check-out:</strong> ${new Date(booking.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Total Amount Paid:</strong> ${booking.pricing?.totalAmount?.toLocaleString() || 0} ${booking.pricing?.currency || 'DZD'}</p>
              <p><strong>Payment Method:</strong> ${booking.paymentMethod === 'cash' ? 'Cash Payment' : booking.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'CCP'}</p>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/dashboard/bookings/${booking._id}" class="button">View Booking Details</a>
            </div>

            <p>You're all set! We hope you have an amazing stay.</p>

            <p>Best regards,</p>
            <p><strong>The Baytup Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending payment confirmed by host email:', error);
    throw error;
  }
};

// Send listing approved email (to host)
const sendListingApprovedEmail = async (host, listing) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: host.email,
      subject: 'Listing Approved - Now Live on Baytup! 🎉',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Listing Approved - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .success-box {
              background: #d4edda;
              border: 1px solid #c3e6cb;
              color: #155724;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
              text-align: center;
            }
            .tips-box {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🎉 Baytup</div>
            <p>Listing Approved!</p>
          </div>

          <div class="content">
            <h2>Congratulations, ${host.firstName}!</h2>

            <div class="success-box">
              <h3 style="margin-top: 0;">✅ Your Listing is Now Live!</h3>
              <p style="font-size: 18px; margin: 10px 0;"><strong>"${listing.title}"</strong></p>
              <p style="margin-bottom: 0;">Your listing has been approved and is now visible to thousands of potential guests on Baytup!</p>
            </div>

            <p>Your ${listing.category === 'stay' ? 'property' : 'vehicle'} is now available for bookings on our platform.</p>

            <div class="tips-box">
              <h3>Tips for Success:</h3>
              <ul>
                <li><strong>Respond Quickly:</strong> Fast responses lead to more bookings</li>
                <li><strong>Update Availability:</strong> Keep your calendar up to date</li>
                <li><strong>Great Photos:</strong> High-quality images attract more guests</li>
                <li><strong>Competitive Pricing:</strong> Use our pricing tools to optimize rates</li>
                <li><strong>Excellent Service:</strong> 5-star reviews lead to more bookings</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/listings/${listing._id}" class="button">View Your Listing</a>
            </div>

            ${listing.adminNotes ? `
              <div style="background: #e7f3ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <strong>Note from Admin:</strong>
                <p style="margin-bottom: 0;">${listing.adminNotes}</p>
              </div>
            ` : ''}

            <p>Start your hosting journey today and welcome your first guests!</p>

            <p>Best regards,</p>
            <p><strong>The Baytup Host Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending listing approved email:', error);
    throw error;
  }
};

// Send listing rejected email (to host)
const sendListingRejectedEmail = async (host, listing, rejectionReason) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: host.email,
      subject: 'Listing Review Update - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Listing Review Update - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .warning-box {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Baytup</div>
            <p>Listing Review Update</p>
          </div>

          <div class="content">
            <h2>Hello ${host.firstName},</h2>

            <p>Thank you for submitting your listing "<strong>${listing.title}</strong>". After careful review, we're unable to approve it at this time.</p>

            ${rejectionReason ? `
              <div class="warning-box">
                <strong>📋 Reason for Decision:</strong>
                <p style="margin-bottom: 0;">${rejectionReason}</p>
              </div>
            ` : ''}

            <h3>What You Can Do:</h3>
            <ul>
              <li>Review our listing guidelines and requirements</li>
              <li>Update your listing to address the concerns mentioned above</li>
              <li>Resubmit your listing for review</li>
              <li>Contact our support team if you need clarification</li>
            </ul>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/host/listings/${listing._id}/edit" class="button">Edit & Resubmit Listing</a>
            </div>

            <p>We're here to help you succeed! Please feel free to reach out if you have any questions.</p>

            <p>Best regards,</p>
            <p><strong>The Baytup Host Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending listing rejected email:', error);
    throw error;
  }
};

// Send listing deleted email
const sendListingDeletedEmail = async (host, listing, deletedBy = 'admin', reason = null) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: host.email,
      subject: `Listing ${deletedBy === 'admin' ? 'Removed' : 'Deleted'} - Baytup`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Listing ${deletedBy === 'admin' ? 'Removed' : 'Deleted'} - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .warning-box {
              background: ${deletedBy === 'admin' ? '#fff3cd' : '#f8f9fa'};
              border: 1px solid ${deletedBy === 'admin' ? '#ffeaa7' : '#e5e5e5'};
              color: ${deletedBy === 'admin' ? '#856404' : '#333'};
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Baytup</div>
            <p>Listing ${deletedBy === 'admin' ? 'Removed' : 'Deleted'}</p>
          </div>

          <div class="content">
            <h2>Hello ${host.firstName},</h2>

            <p>This email confirms that your listing "<strong>${listing.title}</strong>" has been ${deletedBy === 'admin' ? 'removed from Baytup' : 'successfully deleted'}.</p>

            ${deletedBy === 'admin' && reason ? `
              <div class="warning-box">
                <strong>⚠️ Reason for Removal:</strong>
                <p style="margin-bottom: 0;">${reason}</p>
              </div>
            ` : ''}

            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h3>Listing Details:</h3>
              <p><strong>Title:</strong> ${listing.title}</p>
              <p><strong>Category:</strong> ${listing.category === 'stay' ? 'Property' : 'Vehicle'}</p>
              <p><strong>${deletedBy === 'admin' ? 'Removed' : 'Deleted'}:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            ${deletedBy === 'admin' ? `
              <h3>What This Means:</h3>
              <ul>
                <li>Your listing is no longer visible on Baytup</li>
                <li>Existing bookings may be affected</li>
                <li>You can contact support if you believe this was done in error</li>
                <li>You may create a new listing if you address the concerns mentioned</li>
              </ul>

              <div style="text-align: center;">
                <a href="${process.env.CLIENT_URL}/support" class="button">Contact Support</a>
              </div>
            ` : `
              <h3>What's Next:</h3>
              <ul>
                <li>Your listing has been permanently removed</li>
                <li>All booking requests for this listing have been cancelled</li>
                <li>You can create a new listing anytime from your dashboard</li>
              </ul>

              <div style="text-align: center;">
                <a href="${process.env.CLIENT_URL}/host/listings/new" class="button">Create New Listing</a>
              </div>
            `}

            <p>If you have any questions, our support team is here to help.</p>

            <p>Best regards,</p>
            <p><strong>The Baytup ${deletedBy === 'admin' ? 'Admin' : 'Host'} Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending listing deleted email:', error);
    throw error;
  }
};

// Send password changed confirmation email
const sendPasswordChangedEmail = async (user) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Password Changed Successfully - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Changed - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .success-box {
              background: #d4edda;
              border: 1px solid #c3e6cb;
              color: #155724;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
              text-align: center;
            }
            .warning-box {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🔒 Baytup</div>
            <p>Security Alert</p>
          </div>

          <div class="content">
            <h2>Hello ${user.firstName},</h2>

            <div class="success-box">
              <h3 style="margin-top: 0;">✅ Password Changed Successfully</h3>
              <p style="margin-bottom: 0;">Your Baytup account password has been updated.</p>
            </div>

            <p>This email confirms that your password was changed on <strong>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>.</p>

            <div class="warning-box">
              <h3 style="margin-top: 0;">⚠️ Didn't Make This Change?</h3>
              <p>If you did not change your password, your account may be compromised. Please take immediate action:</p>
              <ul>
                <li>Reset your password immediately</li>
                <li>Review your account activity</li>
                <li>Contact our support team right away</li>
              </ul>
            </div>

            <h3>Security Tips:</h3>
            <ul>
              <li>Use a strong, unique password for your Baytup account</li>
              <li>Never share your password with anyone</li>
              <li>Enable two-factor authentication if available</li>
              <li>Be cautious of phishing emails asking for your credentials</li>
            </ul>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/dashboard/settings/security" class="button">Review Security Settings</a>
            </div>

            <p>If you have any concerns about your account security, please contact us immediately.</p>

            <p>Best regards,</p>
            <p><strong>The Baytup Security Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending password changed email:', error);
    throw error;
  }
};

// Send email changed confirmation (to both old and new email)
const sendEmailChangedEmail = async (user, oldEmail, newEmail, sendToOld = true) => {
  try {
    const transporter = createTransporter();

    const recipientEmail = sendToOld ? oldEmail : newEmail;

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: recipientEmail,
      subject: 'Email Address Changed - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Address Changed - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .success-box {
              background: #d4edda;
              border: 1px solid #c3e6cb;
              color: #155724;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .warning-box {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">📧 Baytup</div>
            <p>Security Alert</p>
          </div>

          <div class="content">
            <h2>Hello ${user.firstName},</h2>

            ${sendToOld ? `
              <div class="warning-box">
                <h3 style="margin-top: 0;">⚠️ Your Email Address Has Been Changed</h3>
                <p>The email address associated with your Baytup account has been changed from:</p>
                <p><strong>Old Email:</strong> ${oldEmail}</p>
                <p><strong>New Email:</strong> ${newEmail}</p>
                <p><strong>Changed On:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>

              <h3>Didn't Make This Change?</h3>
              <p>If you did not authorize this email change, your account may be compromised. Please take immediate action:</p>
              <ul>
                <li>Contact our support team immediately</li>
                <li>Try to reset your password</li>
                <li>Review all recent account activity</li>
              </ul>

              <div style="text-align: center;">
                <a href="${process.env.CLIENT_URL}/support" class="button">Contact Support Immediately</a>
              </div>

              <p><strong>Note:</strong> You will no longer receive notifications at this email address. All future communications will be sent to ${newEmail}.</p>
            ` : `
              <div class="success-box">
                <h3 style="margin-top: 0;">✅ Email Address Updated Successfully</h3>
                <p>Your Baytup account email has been changed to this address.</p>
              </div>

              <p>This email confirms that your account email address has been successfully updated to:</p>
              <p style="background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; font-size: 18px;"><strong>${newEmail}</strong></p>

              <p><strong>Changed On:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>

              <p>All future communications from Baytup will be sent to this email address.</p>

              <div style="text-align: center;">
                <a href="${process.env.CLIENT_URL}/dashboard/settings/account" class="button">View Account Settings</a>
              </div>

              <h3>Security Tips:</h3>
              <ul>
                <li>Keep your contact information up to date</li>
                <li>Never share your account credentials</li>
                <li>Report any suspicious activity immediately</li>
              </ul>
            `}

            <p>If you have any questions or concerns, please contact our support team.</p>

            <p>Best regards,</p>
            <p><strong>The Baytup Security Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending email changed notification:', error);
    throw error;
  }
};

// Send booking cancelled email
const sendBookingCancelledEmail = async (user, booking, userType = 'guest', cancelledBy = 'guest') => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Booking Cancelled - Baytup',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Cancelled - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .warning-box {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .info-box {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">❌ Baytup</div>
            <p>Booking Cancelled</p>
          </div>

          <div class="content">
            <h2>Hello ${user.firstName},</h2>

            <div class="warning-box">
              <h3 style="margin-top: 0;">Booking Cancelled</h3>
              <p style="margin-bottom: 0;">
                ${userType === 'guest' && cancelledBy === 'guest' ? 'Your booking has been cancelled as requested.' : ''}
                ${userType === 'host' && cancelledBy === 'guest' ? 'The guest has cancelled their booking.' : ''}
                ${userType === 'guest' && cancelledBy === 'host' ? 'The host has cancelled your booking.' : ''}
                ${userType === 'host' && cancelledBy === 'host' ? 'Your booking cancellation has been processed.' : ''}
                ${cancelledBy === 'admin' ? 'This booking has been cancelled by Baytup administration.' : ''}
              </p>
            </div>

            <div class="info-box">
              <h3>Cancelled Booking Details</h3>
              <p><strong>Listing:</strong> ${booking.listing?.title || 'N/A'}</p>
              <p><strong>Check-in:</strong> ${new Date(booking.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Check-out:</strong> ${new Date(booking.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Total Amount:</strong> ${booking.pricing?.totalAmount?.toLocaleString() || 0} ${booking.pricing?.currency || 'DZD'}</p>
              <p><strong>Cancelled On:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              ${booking.cancellation?.reason ? `<p><strong>Reason:</strong> ${booking.cancellation.reason}</p>` : ''}
            </div>

            ${userType === 'guest' && booking.pricing?.refundAmount ? `
              <div style="background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin-top: 0;">💰 Refund Information</h3>
                <p><strong>Refund Amount:</strong> ${booking.pricing.refundAmount.toLocaleString()} ${booking.pricing.currency || 'DZD'}</p>
                <p>Your refund will be processed according to our cancellation policy and should arrive within 5-10 business days.</p>
              </div>
            ` : ''}

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/dashboard/${userType === 'host' ? 'host/' : ''}bookings" class="button">View All Bookings</a>
            </div>

            ${userType === 'guest' ? `
              <p>We're sorry this didn't work out. We hope you'll find another great listing on Baytup!</p>
            ` : `
              <p>Thank you for using Baytup. We hope to facilitate more successful bookings for you in the future.</p>
            `}

            <p>Best regards,</p>
            <p><strong>The Baytup Team</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. All rights reserved.</p>
            <p>Algeria's Premier Rental Marketplace</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending booking cancelled email:', error);
    throw error;
  }
};

// ✅ NEW: Pre-arrival reminder email (J-7, J-3, J-1)
const sendPreArrivalReminderEmail = async (guest, booking, daysUntilCheckIn) => {
  try {
    const transporter = createTransporter();

    const checkInDate = new Date(booking.startDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const checkOutDate = new Date(booking.endDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Dynamic content based on days
    let subjectText, headerText, urgencyClass, reminderText;

    if (daysUntilCheckIn === 7) {
      subjectText = 'Votre séjour approche ! (J-7)';
      headerText = 'Plus que 7 jours avant votre arrivée !';
      urgencyClass = '#4CAF50'; // Green
      reminderText = 'C\'est le moment idéal pour préparer votre voyage et contacter votre hôte si vous avez des questions.';
    } else if (daysUntilCheckIn === 3) {
      subjectText = 'Préparez-vous ! Arrivée dans 3 jours';
      headerText = 'Plus que 3 jours avant votre arrivée !';
      urgencyClass = '#FF9800'; // Orange
      reminderText = 'N\'oubliez pas de confirmer votre heure d\'arrivée avec votre hôte.';
    } else if (daysUntilCheckIn === 1) {
      subjectText = 'C\'est demain ! Derniers préparatifs';
      headerText = 'C\'est demain ! Préparez-vous !';
      urgencyClass = '#FF6B35'; // Red-orange
      reminderText = 'Vérifiez que vous avez toutes les informations nécessaires pour votre arrivée.';
    }

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: guest.email,
      subject: `${subjectText} - ${booking.listing?.title || 'Votre réservation'}`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Rappel de réservation - Baytup</title>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, ${urgencyClass}, #F7931E); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .countdown { font-size: 48px; font-weight: bold; margin: 20px 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px; }
            .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e5e5; }
            .info-row:last-child { border-bottom: none; }
            .info-label { color: #666; }
            .info-value { font-weight: 600; color: #333; }
            .button { display: inline-block; background: linear-gradient(135deg, #FF6B35, #F7931E); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .checklist { background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .checklist-item { padding: 8px 0; display: flex; align-items: center; }
            .checklist-item::before { content: "☐"; margin-right: 10px; font-size: 18px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Baytup</div>
            <div class="countdown">J-${daysUntilCheckIn}</div>
            <h2 style="margin: 0;">${headerText}</h2>
          </div>
          <div class="content">
            <p>Bonjour ${guest.firstName || 'Voyageur'},</p>
            <p>${reminderText}</p>

            <div class="info-box">
              <h3 style="margin-top: 0;">📍 Détails de votre réservation</h3>
              <div class="info-row">
                <span class="info-label">Logement</span>
                <span class="info-value">${booking.listing?.title || 'Votre hébergement'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Arrivée</span>
                <span class="info-value">${checkInDate} à ${booking.checkInTime || '15:00'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Départ</span>
                <span class="info-value">${checkOutDate} à ${booking.checkOutTime || '11:00'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Voyageurs</span>
                <span class="info-value">${booking.guestCount?.adults || 1} adulte(s)${booking.guestCount?.children ? `, ${booking.guestCount.children} enfant(s)` : ''}</span>
              </div>
            </div>

            <div class="checklist">
              <h3 style="margin-top: 0;">✅ Checklist avant le départ</h3>
              <div class="checklist-item">Confirmer l'heure d'arrivée avec l'hôte</div>
              <div class="checklist-item">Vérifier les instructions d'accès</div>
              <div class="checklist-item">Préparer les documents d'identité</div>
              <div class="checklist-item">Sauvegarder le contact de l'hôte</div>
              ${daysUntilCheckIn === 1 ? '<div class="checklist-item">Charger votre téléphone</div>' : ''}
            </div>

            <p style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/dashboard/bookings/${booking._id}" class="button">
                Voir ma réservation
              </a>
            </p>

            <p style="text-align: center; color: #666;">
              <a href="${process.env.CLIENT_URL}/dashboard/messages" style="color: #FF6B35;">
                💬 Contacter l'hôte
              </a>
            </p>
          </div>
          <div class="footer">
            <p>Besoin d'aide ? Contactez-nous à <a href="mailto:support@baytup.fr" style="color: #FF6B35;">support@baytup.fr</a></p>
            <p style="color: #999;">© ${new Date().getFullYear()} Baytup. Tous droits réservés.</p>
          </div>
        </body>
        </html>
      `,
      text: `
Bonjour ${guest.firstName || 'Voyageur'},

${headerText}

${reminderText}

Détails de votre réservation:
- Logement: ${booking.listing?.title || 'Votre hébergement'}
- Arrivée: ${checkInDate} à ${booking.checkInTime || '15:00'}
- Départ: ${checkOutDate} à ${booking.checkOutTime || '11:00'}

Voir votre réservation: ${process.env.CLIENT_URL}/dashboard/bookings/${booking._id}

Bon voyage !
L'équipe Baytup
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Pre-arrival email (J-${daysUntilCheckIn}) sent to ${guest.email}`);
    return { success: true };
  } catch (error) {
    console.error(`Error sending pre-arrival email (J-${daysUntilCheckIn}):`, error);
    throw error;
  }
};

// Generic notification email - used for ALL notifications that don't have a dedicated email template
const sendNotificationEmail = async (recipientEmail, recipientName, notification) => {
  try {
    const transporter = createTransporter();

    const clientUrl = process.env.CLIENT_URL || 'https://baytup.fr';
    const linkUrl = notification.link ? `${clientUrl}${notification.link}` : clientUrl;

    // Clean title (remove emojis for email subject)
    const cleanTitle = (notification.title || 'Notification Baytup').replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu, '').trim();

    // Priority-based styling
    const priorityColors = {
      urgent: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B', label: 'URGENT' },
      high: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', label: 'IMPORTANT' },
      normal: { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF', label: '' },
      low: { bg: '#F0FDF4', border: '#22C55E', text: '#166534', label: '' }
    };
    const priority = priorityColors[notification.priority] || priorityColors.normal;

    const priorityBanner = (notification.priority === 'urgent' || notification.priority === 'high')
      ? `<div style="background: ${priority.bg}; border: 1px solid ${priority.border}; color: ${priority.text}; padding: 10px 15px; border-radius: 6px; margin-bottom: 20px; font-weight: 600; text-align: center;">${priority.label}</div>`
      : '';

    const mailOptions = {
      from: `"Baytup" <${process.env.EMAIL_FROM}>`,
      to: recipientEmail,
      subject: `${cleanTitle} - Baytup`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${cleanTitle} - Baytup</title>
          <style>
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e5e5;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF6B35, #F7931E);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Baytup</div>
            <p>${notification.title || 'Notification'}</p>
          </div>

          <div class="content">
            <h2>Bonjour ${recipientName || 'Utilisateur'},</h2>

            ${priorityBanner}

            <p>${notification.message || ''}</p>

            ${notification.link ? `
            <div style="text-align: center;">
              <a href="${linkUrl}" class="button">Voir les détails</a>
            </div>
            ` : ''}

            <p>Cordialement,</p>
            <p><strong>L'équipe Baytup</strong></p>
          </div>

          <div class="footer">
            <p>&copy; 2025 Baytup. Tous droits réservés.</p>
            <p>La marketplace de location en Algérie</p>
          </div>
        </body>
        </html>
      `,
      text: `
Bonjour ${recipientName || 'Utilisateur'},

${notification.title || 'Notification'}

${notification.message || ''}

${notification.link ? `Voir les détails: ${linkUrl}` : ''}

Cordialement,
L'équipe Baytup
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending notification email:', error);
    // Don't throw - email failure should not block notification creation
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmailVerification,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendHostApplicationSubmitted,
  sendHostApplicationApproved,
  sendHostApplicationRejected,
  sendHostApplicationResubmission,
  sendPayoutRequestEmail,
  sendPayoutCompletedEmail,
  sendPayoutRejectedEmail,
  sendBookingCreatedEmail,
  sendBookingUpdatedEmail,
  sendBookingApprovedEmail,
  sendBookingRejectedEmail,
  sendReviewReceivedEmail,
  sendBookingUpdatedByGuestEmail,
  sendBookingUpdatedByAdminEmail,
  sendPaymentConfirmedByHostEmail,
  sendListingApprovedEmail,
  sendListingRejectedEmail,
  sendListingDeletedEmail,
  sendPasswordChangedEmail,
  sendEmailChangedEmail,
  sendBookingCancelledEmail,
  sendPreArrivalReminderEmail,
  sendNotificationEmail
};