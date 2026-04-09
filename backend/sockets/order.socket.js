const { SOCKET_EVENTS } = require("./events");
const { emitToVendor, emitToTable } = require("./notifier");

function emitOrderCreated(vendorId, payload) {
	return emitToVendor(vendorId, SOCKET_EVENTS.ORDER_CREATED, payload);
}

function emitOrderStatusChanged(vendorId, payload) {
	return emitToVendor(vendorId, SOCKET_EVENTS.ORDER_STATUS_CHANGED, payload);
}

function emitOrderStatusUpdate(vendorId, tableIdentifier, payload) {
	return emitToTable(
		vendorId,
		tableIdentifier,
		SOCKET_EVENTS.ORDER_STATUS_UPDATE,
		payload,
	);
}

function emitDeliveryIssue(vendorId, payload) {
	return emitToVendor(vendorId, SOCKET_EVENTS.DELIVERY_ISSUE, payload);
}

function emitOrderVerified(vendorId, payload) {
	return emitToVendor(vendorId, SOCKET_EVENTS.ORDER_VERIFIED, payload);
}

function emitVendorNotification(vendorId, payload) {
	return emitToVendor(vendorId, SOCKET_EVENTS.NOTIFICATION, payload);
}

module.exports = {
	emitOrderCreated,
	emitOrderStatusChanged,
	emitOrderStatusUpdate,
	emitDeliveryIssue,
	emitOrderVerified,
	emitVendorNotification,
};