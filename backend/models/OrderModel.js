const MakeOrderModel = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    "order",
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
      tableId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "table_id",
        references: {
          model: "tables",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      status: {
        type: DataTypes.ENUM(
          "pending",
          "accepted",
          "confirmed",
          "rejected",
          "preparing",
          "ready",
          "delivered",
          "completed",
          "cancelled"
        ),
        defaultValue: "pending",
        allowNull: false,
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false,
        field: "total_amount",
      },
      tableIdentifier: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "table_identifier",
        comment: "Keep for backward compatibility",
      },
      invoiceNo: {
        type: DataTypes.STRING(100),
        unique: true,
        defaultValue: "INV-000000",
        allowNull: false,
        field: "invoice_no",
      },
      transactionId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "transaction_id",
      },
      paymentStatus: {
        type: DataTypes.ENUM("pending", "paid", "failed"),
        defaultValue: "pending",
        allowNull: false,
        field: "payment_status",
      },
      paymentMethod: {
        type: DataTypes.ENUM("esewa", "cash"),
        defaultValue: "cash",
        allowNull: false,
        field: "payment_method",
      },
      // Customer verification fields
      customerVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "customer_verified",
        comment: "Whether customer has verified receiving the order",
      },
      verificationTimestamp: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "verification_timestamp",
        comment: "When customer verified the order",
      },
      deliveryIssueReported: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "delivery_issue_reported",
        comment: "Whether customer reported not receiving the order",
      },
      issueReportTimestamp: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "issue_report_timestamp",
        comment: "When the delivery issue was reported",
      },
      issueDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "issue_description",
        comment: "Description of the delivery issue",
      },
      // Issue resolution fields
      issueResolved: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "issue_resolved",
        comment: "Whether vendor has resolved the delivery issue",
      },
      issueResolutionTimestamp: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "issue_resolution_timestamp",
        comment: "When the delivery issue was resolved",
      },
      resolutionMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "resolution_message",
        comment: "Vendor's message about how the issue was resolved",
      },
    },
    {
      tableName: "orders",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Order;
};

module.exports = MakeOrderModel;
