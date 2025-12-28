const bcrypt = require("bcrypt");

const MakeUserModel = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "user",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      username: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      restaurantName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "restaurant_name",
      },
      ownerName: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "owner_name",
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      openingTime: {
        type: DataTypes.TIME,
        allowNull: true,
        field: "opening_time",
      },
      closingTime: {
        type: DataTypes.TIME,
        allowNull: true,
        field: "closing_time",
      },
      logo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM("vendor", "staff", "admin"),
        defaultValue: "vendor",
        allowNull: false,
        comment:
          "User role: vendor (restaurant owner), staff (employee), admin (system admin)",
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "vendor_id",
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        comment: "For staff users: references the vendor they work for",
      },
      isStaff: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_staff",
      },
      isSuperuser: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_superuser",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_active",
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "last_login",
      },
      dateJoined: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "date_joined",
      },
    },
    {
      tableName: "users",
      timestamps: true,
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed("password")) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },
      },
    }
  );

  User.prototype.validatePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
  };

  User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  // Helper methods for role checking
  User.prototype.isVendor = function () {
    return this.role === "vendor";
  };

  User.prototype.isStaffMember = function () {
    return this.role === "staff";
  };

  User.prototype.isAdmin = function () {
    return this.role === "admin";
  };

  // Get the effective vendor ID (for staff, return their vendorId; for vendors, return their own id)
  User.prototype.getVendorId = function () {
    return this.role === "staff" ? this.vendorId : this.id;
  };

  return User;
};

module.exports = MakeUserModel;
