const bcrypt = require("bcrypt");

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

/**
 * Compare a plain text password with a hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} - True if passwords match
 */
async function comparePassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

/**
 * Remove sensitive fields from user object
 * @param {Object} user - User object from database
 * @returns {Object} - User object without password
 */
function sanitizeUser(user) {
  if (!user) return null;

  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Check if user has a specific role
 * @param {Object} user - User object
 * @param {string} role - Role to check (vendor, staff, admin)
 * @returns {boolean}
 */
function hasRole(user, role) {
  return user && user.role === role;
}

/**
 * Get effective vendor ID for multi-tenant access
 * Staff users return their vendorId, vendors return their own id
 * @param {Object} user - User object
 * @returns {number} - Effective vendor ID
 */
function getEffectiveVendorId(user) {
  if (!user) return null;
  return user.role === "staff" ? user.vendorId : user.id;
}

/**
 * Check if user can access vendor's data
 * @param {Object} user - User object
 * @param {number} vendorId - Target vendor ID
 * @returns {boolean}
 */
function canAccessVendor(user, vendorId) {
  if (!user) return false;
  if (user.role === "admin") return true;

  const effectiveVendorId = getEffectiveVendorId(user);
  return effectiveVendorId === parseInt(vendorId);
}

/**
 * Generate a unique invoice number
 * @returns {string} - Invoice number in format INV-YYYYMMDD-XXXXX
 */
function generateInvoiceNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `INV-${dateStr}-${random}`;
}

/**
 * Generate a random delivery verification code
 * @returns {string} - 6-digit verification code
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
  hashPassword,
  comparePassword,
  sanitizeUser,
  hasRole,
  getEffectiveVendorId,
  canAccessVendor,
  generateInvoiceNumber,
  generateVerificationCode,
};
