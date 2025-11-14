const { v4: uuidv4 } = require("uuid");

const MakeTableModel = (sequelize, DataTypes) => {
  const Table = sequelize.define(
    "table",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "vendor_id",
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "Name or number of the table (e.g., 'Table 1', 'Patio 3')",
      },
      qrCode: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false,
        field: "qr_code",
        comment: "Unique identifier for the QR code",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_active",
        comment: "Whether this table is active and its QR code can be used",
      },
    },
    {
      tableName: "tables",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          unique: true,
          fields: ["vendor_id", "name"],
        },
      ],
    }
  );

  Table.prototype.regenerateQrCode = async function () {
    this.qrCode = uuidv4();
    await this.save();
    return this.qrCode;
  };

  Table.prototype.getQrString = function () {
    return this.qrCode.toString();
  };

  return Table;
};

module.exports = MakeTableModel;
