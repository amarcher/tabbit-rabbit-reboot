export interface ReceiptResult {
  items: { description: string; price: number }[];
  subtotal?: number;
  tax?: number;
  total?: number;
}
