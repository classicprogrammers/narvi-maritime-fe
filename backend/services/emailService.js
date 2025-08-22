const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  // Generate reset token
  generateResetToken() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    return { resetToken, hashedToken };
  }

  // Send password reset email
  async sendPasswordResetEmail(email, resetToken, userName) {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Password Reset Request - Narvi Maritime',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Narvi Maritime</h1>
            <p style="color: #666; margin: 10px 0;">Password Reset Request</p>
          </div>
          
          <div style="padding: 30px; background-color: #ffffff;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName},</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              You requested a password reset for your Narvi Maritime account. 
              Please click the button below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;
                        font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            
            <p style="color: #007bff; word-break: break-all; margin-bottom: 20px;">
              ${resetUrl}
            </p>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              This link will expire in 1 hour for security reasons.
            </p>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              If you didn't request this password reset, please ignore this email. 
              Your password will remain unchanged.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true, message: 'Password reset email sent successfully' };
    } catch (error) {
      console.error('❌ Email sending error:', error);
      return { success: false, message: 'Failed to send password reset email' };
    }
  }

  // Send OTP email
  async sendOTPEmail(email, otp, userName) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Password Reset OTP - Narvi Maritime',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Narvi Maritime</h1>
            <p style="color: #666; margin: 10px 0;">Password Reset OTP</p>
          </div>
          
          <div style="padding: 30px; background-color: #ffffff;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName},</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              You requested a password reset for your Narvi Maritime account. 
              Use the following OTP to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; 
                          border: 2px dashed #007bff; display: inline-block;">
                <h1 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 5px;">
                  ${otp}
                </h1>
              </div>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              This OTP will expire in 10 minutes for security reasons.
            </p>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              If you didn't request this password reset, please ignore this email. 
              Your password will remain unchanged.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true, message: 'OTP email sent successfully' };
    } catch (error) {
      console.error('❌ Email sending error:', error);
      return { success: false, message: 'Failed to send OTP email' };
    }
  }

  // Send welcome email
  async sendWelcomeEmail(email, userName) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Welcome to Narvi Maritime',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Narvi Maritime</h1>
            <p style="color: #666; margin: 10px 0;">Welcome aboard!</p>
          </div>
          
          <div style="padding: 30px; background-color: #ffffff;">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome ${userName}!</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              Thank you for registering with Narvi Maritime. Your account has been 
              successfully created and you can now access all our services.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/auth/sign-in" 
                 style="background-color: #28a745; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;
                        font-weight: bold;">
                Login to Your Account
              </a>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              If you have any questions or need assistance, please don't hesitate 
              to contact our support team.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center;">
              Welcome to the Narvi Maritime family!
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true, message: 'Welcome email sent successfully' };
    } catch (error) {
      console.error('❌ Email sending error:', error);
      return { success: false, message: 'Failed to send welcome email' };
    }
  }

  // Verify email configuration
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service configured successfully');
      return true;
    } catch (error) {
      console.error('❌ Email service configuration error:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
