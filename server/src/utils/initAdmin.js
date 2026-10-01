const User = require('../models/User');

/**
 * Idempotently provisions and syncs the production Admin account on server startup
 * using ADMIN_EMAIL and ADMIN_PASSWORD environment variables.
 */
const initAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.log('[Admin Init] ADMIN_EMAIL or ADMIN_PASSWORD environment variable not set.');
      return;
    }

    const normalizedEmail = adminEmail.toLowerCase().trim();

    // Check if admin user with ADMIN_EMAIL already exists
    let admin = await User.findOne({ email: normalizedEmail }).select('+password');

    if (admin) {
      // Verify if password matches configured ADMIN_PASSWORD
      const isMatch = await admin.matchPassword(adminPassword);
      if (!isMatch) {
        admin.password = adminPassword; // Triggers pre('save') bcrypt hash
        admin.role = 'admin';
        await admin.save();
        console.log(`[Admin Init] Updated admin password for ${normalizedEmail} to match environment variable`);
      } else {
        console.log(`[Admin Init] Admin account already exists and verified for ${normalizedEmail}`);
      }
    } else {
      // Check if there is an existing admin role user under an old email
      const existingRoleAdmin = await User.findOne({ role: 'admin' }).select('+password');
      if (existingRoleAdmin) {
        existingRoleAdmin.email = normalizedEmail;
        existingRoleAdmin.password = adminPassword; // Triggers pre('save') bcrypt hash
        await existingRoleAdmin.save();
        console.log(`[Admin Init] Updated existing admin account email to ${normalizedEmail}`);
      } else {
        await User.create({
          name: 'System Admin',
          email: normalizedEmail,
          password: adminPassword, // Triggers pre('save') bcrypt hash
          role: 'admin',
          phone: '',
          businessName: 'Bizora Admin HQ',
          businessAddress: '',
          businessPhone: '',
          businessEmail: normalizedEmail
        });
        console.log(`[Admin Init] Production Admin account created successfully for ${normalizedEmail}`);
      }
    }
  } catch (err) {
    console.error(`[Admin Init Error]:`, err.message);
  }
};

module.exports = initAdmin;
