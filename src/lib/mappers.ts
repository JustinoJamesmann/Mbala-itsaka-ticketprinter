import { Order } from "../app/types";

export function mapOrder(row: any): Order {
  return {
    id: row.receipt_number || row.id,
    customer: row.customer,
    phone: row.phone || undefined,
    address: row.address || undefined,
    items: (row.order_items || []).map((item: any) => ({
      productId: item.product_id,
      productName: item.product_name,
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
      total: Number(item.total || 0),
    })),
    subtotal: Number(row.subtotal || 0),
    deliveryCost: Number(row.delivery_cost || 0),
    remise: Number(row.remise || 0),
    total: Number(row.total || 0),
    status: row.status,
    date: row.order_date,
  };
}
