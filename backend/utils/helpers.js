const bcrypt = require("bcrypt");

// Helper functions for authentication, authorization, and other common tasks
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

async function comparePassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

function sanitizeUser(user) {
  if (!user) return null;

  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

function hasRole(user, role) {
  return user && user.role === role;
}

function getEffectiveVendorId(user) {
  if (!user) return null;
  return user.role === "staff" ? user.vendorId : user.id;
}

function canAccessVendor(user, vendorId) {
  if (!user) return false;
  if (user.role === "admin") return true;

  const effectiveVendorId = getEffectiveVendorId(user);
  return effectiveVendorId === parseInt(vendorId);
}

function generateInvoiceNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `INV-${dateStr}-${random}`;
}

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
