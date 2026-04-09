const { createSocketServer } = require("./socket.server");
const orderSocket = require("./order.socket");
const notifier = require("./notifier");

module.exports = {
  createSocketServer,
  ...orderSocket,
  ...notifier,
};
