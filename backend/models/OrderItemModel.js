const MakeOrderItemModel = (sequelize, DataTypes) => {
  const OrderItem = sequelize.define(
    "orderItem",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "order_id",
        references: {
          model: "orders",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      menuItemId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "menu_item_id",
        references: {
          model: "menu_items",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: 1,
        },
      },
      price: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        comment: "Item price at time of order",
      },
    },
    {
      tableName: "order_items",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return OrderItem;
};

module.exports = MakeOrderItemModel;
