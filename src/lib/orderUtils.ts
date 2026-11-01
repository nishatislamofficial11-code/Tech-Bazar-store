export function getPremiumOrderId(order: any): string {
  if (!order) return '';

  if (order.tracking_id) {
    return order.tracking_id;
  }
  
  // Try to extract TID from shipping address
  if (order.shipping_address) {
    const match = order.shipping_address.match(/\[TID:(.*?)\]/);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // Fallback to first 8 characters of UUID formatted
  if (order.id) {
    return `ORD-${order.id.split('-')[0].toUpperCase()}`;
  }
  
  return '';
}

export function cleanShippingAddress(address: string): string {
  if (!address) return '';
  // Remove the TID token completely from the display address
  return address.replace(/\n?\[TID:.*?\]/g, '').trim();
}
