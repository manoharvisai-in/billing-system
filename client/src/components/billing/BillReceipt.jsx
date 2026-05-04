import { forwardRef } from 'react';

const BillReceipt = forwardRef(({ order, storeName = 'SwiftBill Store' }, ref) => {
  if (!order) return null;

  return (
    <div ref={ref} className="print-receipt bg-white text-black p-6 max-w-sm mx-auto font-mono text-sm">
      {/* Store header */}
      <div className="text-center mb-4 pb-4 border-b border-dashed border-gray-400">
        <h1 className="text-xl font-bold">{storeName}</h1>
        <p className="text-xs text-gray-600">Fast & Reliable Billing</p>
      </div>

      {/* Token - BIG DISPLAY */}
      <div className="text-center mb-4 p-4 border-2 border-black rounded">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Token Number</p>
        <p className="text-6xl font-black leading-none mt-1">#{order.tokenNumber}</p>
        <p className="text-xs text-gray-500 mt-1">{order.tokenDate}</p>
      </div>

      {/* Bill details */}
      <div className="space-y-1 mb-4 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Bill ID:</span>
          <span className="font-bold">{order.billId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Date:</span>
          <span>{new Date(order.createdAt || Date.now()).toLocaleString('en-IN')}</span>
        </div>
        {order.customerName && (
          <div className="flex justify-between">
            <span className="text-gray-500">Customer:</span>
            <span>{order.customerName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Payment:</span>
          <span className="capitalize">{order.paymentMethod}</span>
        </div>
      </div>

      {/* Items */}
      <div className="border-t border-dashed border-gray-400 pt-3 mb-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left pb-1">Item</th>
              <th className="text-center pb-1">Qty</th>
              <th className="text-right pb-1">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1 pr-2 leading-tight">{item.productName}</td>
                <td className="text-center py-1">
                  {item.quantity} × ₹{item.productPrice}
                </td>
                <td className="text-right py-1 font-medium">₹{item.subtotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="border-t border-dashed border-gray-400 pt-3 space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{order.subtotal}</span>
        </div>
        {order.tax > 0 && (
          <div className="flex justify-between">
            <span>Tax</span>
            <span>₹{order.tax}</span>
          </div>
        )}
        {order.discount > 0 && (
          <div className="flex justify-between text-green-700">
            <span>Discount</span>
            <span>-₹{order.discount}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-black border-t border-black pt-2 mt-2">
          <span>TOTAL</span>
          <span>₹{order.total}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-4 pt-3 border-t border-dashed border-gray-400 text-xs text-gray-500">
        <p>Thank you for your business!</p>
        <p className="mt-1">Powered by SwiftBill ⚡</p>
      </div>
    </div>
  );
});

BillReceipt.displayName = 'BillReceipt';
export default BillReceipt;
