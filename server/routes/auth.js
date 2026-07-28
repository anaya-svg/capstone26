const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const SESSION_DURATION_SECONDS = 1800;

const generateSessionToken = () => crypto.randomBytes(32).toString('hex');
const getSessionExpiry = () => {
  const d = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const tempUsers = new Map();

const generateVerificationCode = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

router.post('/register', (req, res) => {
  const { full_name, email, password, role, unique_code } = req.body;
  const db = req.app.locals.db;

  if (role === 'admin' && unique_code !== 'ITADMINREGISTERATION789') {
    return res.status(400).json({
      success: false,
      message: 'Invalid company unique code'
    });
  }

  const checkQuery = `
    SELECT id, is_verified FROM users WHERE email = ?
  `;

  db.query(checkQuery, [email], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error checking email'
      });
    }

    if (results.length > 0 && results[0].is_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error hashing password'
        });
      }

      const verificationCode = generateVerificationCode();

      tempUsers.set(email, {
        full_name,
        email,
        hashedPassword,
        role,
        verificationCode,
        timestamp: Date.now()
      });

      const transporter = req.app.locals.transporter;
      const mailOptions = {
        from: 'snapfunstudio@gmail.com',
        to: email,
        subject: 'SnapFunERP - Email Verification',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Hi, SnapFun Team!</h2>
            <p>Dear ${full_name},</p>
            <p>Thank you for registering to SnapFun Resource System. Please use the following verification code to complete your registration:</p>
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="color: #2563eb; font-size: 32px; margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you did not request this verification, please ignore this email.</p>
            <p>Best regards,<br>SnapFun Resource System Team</p>
          </div>
        `
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          return res.status(500).json({
            success: false,
            message: 'Error sending verification email'
          });
        }

        res.status(201).json({
          success: true,
          message: 'Registration successful. Please check your email for verification code.'
        });
      });
    });
  });
});

router.post('/resend-verification', (req, res) => {
  const { email } = req.body;

  const tempUser = tempUsers.get(email);

  if (!tempUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found or registration expired. Please register again.'
    });
  }

  const newVerificationCode = generateVerificationCode();

  tempUsers.set(email, {
    ...tempUser,
    verificationCode: newVerificationCode,
    timestamp: Date.now()
  });

  const transporter = req.app.locals.transporter;
  const mailOptions = {
    from: 'snapfunstudio@gmail.com',
    to: email,
    subject: 'SnapFun Resource System - Email Verification Code Resend',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Hi, SnapFun Team!</h2>
        <p>Dear ${tempUser.full_name},</p>
        <p>Here is your new verification code for SnapFun Resource System:</p>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #2563eb; font-size: 32px; margin: 0; letter-spacing: 5px;">${newVerificationCode}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this verification, please ignore this email.</p>
        <p>Best regards,<br>SnapFun Resource System Team</p>
      </div>
    `
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({
        success: false,
        message: 'Error sending verification email'
      });
    }

    res.json({
      success: true,
      message: 'New verification code sent to your email'
    });
  });
});

router.post('/verify-email', (req, res) => {
  const { email, verification_code } = req.body;
  const db = req.app.locals.db;

  const tempUser = tempUsers.get(email);

  if (!tempUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found or registration expired. Please register again.'
    });
  }

  if (tempUser.verificationCode !== verification_code) {
    return res.status(400).json({
      success: false,
      message: 'Invalid verification code'
    });
  }

  const expirationTime = 24 * 60 * 60 * 1000;
  if (Date.now() - tempUser.timestamp > expirationTime) {
    tempUsers.delete(email);
    return res.status(400).json({
      success: false,
      message: 'Verification code expired. Please register again.'
    });
  }

  const query = `
    INSERT INTO users (full_name, email, password, role, is_verified)
    VALUES (?, ?, ?, ?, TRUE)
  `;

  db.query(query, [tempUser.full_name, tempUser.email, tempUser.hashedPassword, tempUser.role], (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error saving user to database'
      });
    }

    tempUsers.delete(email);

    res.json({
      success: true,
      message: 'Your email has been successfully registered. Please log in using your registered email and password.'
    });
  });
});

const createSessionPayload = (user, token, expiresAt) => ({
  id: user.id,
  full_name: user.full_name,
  email: user.email,
  role: user.role,
  session_token: token,
  session_expires_at: expiresAt
});

const attemptLogin = (req, res, { email, password, role, force = false }) => {
  const db = req.app.locals.db;

  const query = `
    SELECT id, full_name, email, password, role, is_verified, status, session_token, session_expires_at
    FROM users
    WHERE email = ? AND role = ? AND status = 'active'
  `;

  db.query(query, [email, role], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error logging in'
      });
    }

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = results[0];

    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error comparing password'
        });
      }

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const now = new Date();
      const hasActiveSession = user.session_token && user.session_expires_at && new Date(user.session_expires_at) > now;

      if (hasActiveSession && !force) {
        return res.status(409).json({
          success: false,
          active_session: true,
          message: 'This account is already logged in on another device. Please log out from the other device or use a different account.'
        });
      }

      const token = generateSessionToken();
      const expiresAt = getSessionExpiry();

      const updateQuery = `
        UPDATE users
        SET last_login = CURRENT_TIMESTAMP, session_token = ?, session_expires_at = ?
        WHERE id = ?
      `;
      db.query(updateQuery, [token, expiresAt, user.id], (err) => {
        if (err) {
          console.error('Error updating session:', err);
          return res.status(500).json({
            success: false,
            message: 'Error creating session'
          });
        }

        res.json({
          success: true,
          message: 'Login successful',
          user: createSessionPayload(user, token, expiresAt)
        });
      });
    });
  });
};

router.post('/login', (req, res) => {
  attemptLogin(req, res, req.body);
});

router.post('/force-login', (req, res) => {
  attemptLogin(req, res, { ...req.body, force: true });
});

router.post('/verify-session', (req, res) => {
  const { session_token } = req.body;
  const db = req.app.locals.db;

  if (!session_token) {
    return res.status(401).json({
      success: false,
      message: 'Session token is required'
    });
  }

  const query = `SELECT id, session_token, session_expires_at FROM users WHERE session_token = ?`;
  db.query(query, [session_token], (err, results) => {
    if (err) {
      console.error('Error verifying session:', err);
      return res.status(500).json({
        success: false,
        message: 'Error verifying session'
      });
    }

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session'
      });
    }

    const user = results[0];
    const now = new Date();
    const expiresAt = new Date(user.session_expires_at);

    if (expiresAt <= now) {
      return res.status(401).json({
        success: false,
        message: 'Session expired'
      });
    }

    const newExpiresAt = getSessionExpiry();
    const extendQuery = `UPDATE users SET session_expires_at = ? WHERE id = ?`;
    db.query(extendQuery, [newExpiresAt, user.id], (err) => {
      if (err) {
        console.error('Error extending session:', err);
      }
    });

    res.json({
      success: true,
      message: 'Session valid',
      expires_at: newExpiresAt
    });
  });
});

router.post('/logout', (req, res) => {
  const { session_token } = req.body;
  const db = req.app.locals.db;

  if (!session_token) {
    return res.status(400).json({
      success: false,
      message: 'Session token is required'
    });
  }

  const query = `UPDATE users SET session_token = NULL, session_expires_at = NULL WHERE session_token = ?`;
  db.query(query, [session_token], (err) => {
    if (err) {
      console.error('Error logging out:', err);
      return res.status(500).json({
        success: false,
        message: 'Error logging out'
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

module.exports = router;

router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  const db = req.app.locals.db;

  const checkQuery = `SELECT id, full_name, email, role FROM users WHERE email = ? AND status = 'active'`;
  
  db.query(checkQuery, [email], (err, results) => {
    if (err) {
      console.error('Error checking email:', err);
      return res.status(500).json({
        success: false,
        message: 'Error checking email'
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Email not found or account is inactive'
      });
    }

    const user = results[0];
    const verificationCode = generateVerificationCode();

    const updateQuery = `UPDATE users SET verification_code = ? WHERE email = ?`;
    
    db.query(updateQuery, [verificationCode, email], (err) => {
      if (err) {
        console.error('Error updating verification code:', err);
        return res.status(500).json({
          success: false,
          message: 'Error updating verification code'
        });
      }

      const mailOptions = {
        from: 'snapfunstudio@gmail.com',
        to: email,
        subject: 'SnapFun Resource System - Password Reset Verification',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Hi, SnapFun Team!</h2>
            <p>Dear ${user.full_name},</p>
            <p>We received a request to reset your password for SnapFun Resource System. Please use the following verification code to complete your password reset:</p>
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="color: #2563eb; font-size: 32px; margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
            </div>
            <p>This code will expire in 15 minutes.</p>
            <p>If you did not request this password reset, please ignore this email.</p>
            <p>Best regards,<br>SnapFun Resource System Team</p>
          </div>
        `
      };

      req.app.locals.transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          return res.status(500).json({
            success: false,
            message: 'Error sending email'
          });
        }
        res.json({
          success: true,
          message: 'Verification code sent to email'
        });
      });
    });
  });
});

router.post('/verify-code', (req, res) => {
  const { email, verification_code } = req.body;
  const db = req.app.locals.db;

  const query = `SELECT id, verification_code FROM users WHERE email = ? AND status = 'active'`;
  
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error('Error verifying code:', err);
      return res.status(500).json({
        success: false,
        message: 'Error verifying code'
      });
    }

    if (results.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Email not found or account is inactive'
      });
    }

    if (results[0].verification_code !== verification_code) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    res.json({
      success: true,
      message: 'Code verified successfully'
    });
  });
});

router.post('/reset-password', (req, res) => {
  const { email, code, new_password } = req.body;
  const db = req.app.locals.db;

  const verifyQuery = `SELECT id FROM users WHERE email = ? AND verification_code = ? AND status = 'active'`;
  
  db.query(verifyQuery, [email, code], (err, results) => {
    if (err) {
      console.error('Error verifying code:', err);
      return res.status(500).json({
        success: false,
        message: 'Error verifying code'
      });
    }

    if (results.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    bcrypt.hash(new_password, 10, (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing password:', err);
        return res.status(500).json({
          success: false,
          message: 'Error hashing password'
        });
      }

      const updateQuery = `UPDATE users SET password = ?, verification_code = NULL WHERE email = ?`;
      
      db.query(updateQuery, [hashedPassword, email], (err) => {
        if (err) {
          console.error('Error updating password:', err);
          return res.status(500).json({
            success: false,
            message: 'Error updating password'
          });
        }

        res.json({
          success: true,
          message: 'Password reset successfully'
        });
      });
    });
  });
});
