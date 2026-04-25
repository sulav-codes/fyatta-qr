function hasValue(value) {
  return value !== undefined && value !== null && `${value}`.trim() !== "";
}

function vendorRoom(vendorId) {
  if (!hasValue(vendorId)) {
    return null;
  }

  return `vendor-${vendorId}`;
}

function tableRoom(vendorId, tableIdentifier) {
  if (!hasValue(vendorId) || !hasValue(tableIdentifier)) {
    return null;
  }

  return `table-${vendorId}-${tableIdentifier}`;
}

export { vendorRoom, tableRoom };
