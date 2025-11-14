const { Sequelize, DataTypes } = require("sequelize");
const dbConfig = require("../config/dbConfig");

// Initialize Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.user,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    port: dbConfig.port,
    logging: false, // Disable Sequelize logging (optional)
  }
);

// Test database connection
(async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit(1); // Exit process if database connection fails
  }
})();

// Models initialization
const MakeUserModel = require("./UserModel");
const MakeMenuItemModel = require("./MenuItemModel");
const MakeTableModel = require("./TableModel");
const MakeOrderModel = require("./OrderModel");
const MakeOrderItemModel = require("./OrderItemModel");

const db = {
  Sequelize,
  sequelize,
  users: MakeUserModel(sequelize, DataTypes),
  menuItems: MakeMenuItemModel(sequelize, DataTypes),
  tables: MakeTableModel(sequelize, DataTypes),
  orders: MakeOrderModel(sequelize, DataTypes),
  orderItems: MakeOrderItemModel(sequelize, DataTypes),
};

// Define associations here
// User (Vendor) has many Menu Items
db.users.hasMany(db.menuItems, {
  foreignKey: "vendorId",
  as: "menuItems",
  onDelete: "CASCADE",
});
db.menuItems.belongsTo(db.users, {
  foreignKey: "vendorId",
  as: "vendor",
});

// User (Vendor) has many Tables
db.users.hasMany(db.tables, {
  foreignKey: "vendorId",
  as: "tables",
  onDelete: "CASCADE",
});
db.tables.belongsTo(db.users, {
  foreignKey: "vendorId",
  as: "vendor",
});

// User (Vendor) has many Orders
db.users.hasMany(db.orders, {
  foreignKey: "vendorId",
  as: "orders",
  onDelete: "CASCADE",
});
db.orders.belongsTo(db.users, {
  foreignKey: "vendorId",
  as: "vendor",
});

// Table has many Orders
db.tables.hasMany(db.orders, {
  foreignKey: "tableId",
  as: "orders",
  onDelete: "SET NULL",
});
db.orders.belongsTo(db.tables, {
  foreignKey: "tableId",
  as: "table",
});

// Order has many Order Items
db.orders.hasMany(db.orderItems, {
  foreignKey: "orderId",
  as: "items",
  onDelete: "CASCADE",
});
db.orderItems.belongsTo(db.orders, {
  foreignKey: "orderId",
  as: "order",
});

// MenuItem has many Order Items
db.menuItems.hasMany(db.orderItems, {
  foreignKey: "menuItemId",
  as: "orderItems",
  onDelete: "SET NULL",
});
db.orderItems.belongsTo(db.menuItems, {
  foreignKey: "menuItemId",
  as: "menuItem",
});

// Sync database models
(async () => {
  try {
    await sequelize.sync({ force: false });
    console.log("Database synchronized.");
  } catch (error) {
    console.error("Error during synchronization:", error);
  }
})();

module.exports = db;
