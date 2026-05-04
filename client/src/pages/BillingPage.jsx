import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import api from '../services/api';
import Navbar from '../components/common/Navbar';
import BillReceipt from '../components/billing/BillReceipt';
import {
  addItem, removeItem, updateQuantity, clearCart, setDiscount,
  selectCartItems, selectCartSubtotal, selectCartTotal,
  addToOfflineQueue,
} from '../store/slices/cartSlice';
import { addNotification } from '../store/slices/uiSlice';

export default function BillingPage() {
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartSubtotal);
  const total = useSelector(selectCartTotal);
  const discount = useSelector((s) => s.cart.discount);
  const isOnline = useSelector((s) => s.ui.isOnline);
  const { user } = useSelector((s) => s.auth);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [showBarcodeHint, setShowBarcodeHint] = useState(false);

  const receiptRef = useRef(null);
  const searchRef = useRef(null);
  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef(null);

  const handlePrint = useReactToPrint({ content: () => receiptRef.current });

  // Fetch products
  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products?isActive=true');
      setProducts(data.products);
      setCategories(['all', ...data.categories]);
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: 'Failed to load products' }));
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // Barcode scanner listener
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && barcodeBuffer.current.length > 3) {
        const barcode = barcodeBuffer.current;
        const product = products.find(p => p.barcode === barcode);
        if (product) {
          dispatch(addItem(product));
          dispatch(addNotification({ type: 'success', message: `Added: ${product.name}`, duration: 1500 }));
        }
        barcodeBuffer.current = '';
        return;
      }
      if (e.key.length === 1 && document.activeElement.tagName !== 'INPUT') {
        barcodeBuffer.current += e.key;
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = ''; }, 100);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [products]);

  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search);
    return matchCat && matchSearch;
  });

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setLoading(true);

    const orderData = {
      items: cartItems,
      subtotal,
      tax: 0,
      discount,
      total,
      customerName,
      paymentMethod,
    };

    if (!isOnline) {
      dispatch(addToOfflineQueue({ ...orderData, queuedAt: Date.now() }));
      dispatch(addNotification({ type: 'warning', title: 'Saved Offline', message: 'Bill saved and will sync when online.' }));
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.post('/orders', orderData);
      setLastOrder(data.order);
      dispatch(clearCart());
      setShowCart(false);
      setShowReceipt(true);
      setCustomerName('');
      dispatch(addNotification({ type: 'success', title: `Token #${data.order.tokenNumber}`, message: 'Bill generated!' }));
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to create bill' }));
    } finally {
      setLoading(false);
    }
  };

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar title="Billing" />

      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-center py-2 text-xs font-medium">
          ⚠️ You're offline — bills will auto-sync when connection returns
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm card overflow-hidden animate-slide-in">
            {/* Token highlight */}
            <div className="text-center py-6 text-white" style={{ background: 'linear-gradient(135deg, var(--brand), #0369a1)' }}>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">YOUR TOKEN</p>
              <div className="token-display">{lastOrder.tokenNumber}</div>
              <p className="text-xs opacity-70 mt-2">Bill ID: {lastOrder.billId}</p>
            </div>

            {/* Print preview */}
            <div className="max-h-64 overflow-y-auto border-b" style={{ borderColor: 'var(--border)' }}>
              <BillReceipt ref={receiptRef} order={lastOrder} />
            </div>

            <div className="p-4 grid grid-cols-2 gap-2 no-print">
              <button onClick={handlePrint} className="btn-primary">🖨️ Print</button>
              <button onClick={() => setShowReceipt(false)} className="btn-secondary">✓ Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Cart drawer (mobile) */}
      {showCart && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="w-full max-w-sm h-full flex flex-col animate-slide-in" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-bold">Cart ({cartCount} items)</h2>
              <button onClick={() => setShowCart(false)} className="text-2xl leading-none opacity-60">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartItems.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  <p className="text-4xl mb-2">🛒</p>
                  <p className="text-sm">Cart is empty</p>
                </div>
              ) : cartItems.map(item => (
                <div key={item.product} className="flex items-center gap-3 card p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.productName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>₹{item.productPrice} each</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => dispatch(updateQuantity({ productId: item.product, quantity: item.quantity - 1 }))}
                      className="h-8 w-8 rounded-full border flex items-center justify-center font-bold text-lg transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                      style={{ borderColor: 'var(--border)' }}>−
                    </button>
                    <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                    <button onClick={() => dispatch(updateQuantity({ productId: item.product, quantity: item.quantity + 1 }))}
                      className="h-8 w-8 rounded-full border flex items-center justify-center font-bold text-lg transition-colors hover:bg-green-50 dark:hover:bg-green-900/20"
                      style={{ borderColor: 'var(--border)' }}>+
                    </button>
                  </div>
                  <span className="font-bold text-sm w-16 text-right">₹{item.subtotal}</span>
                </div>
              ))}
            </div>

            {cartItems.length > 0 && (
              <div className="p-4 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
                <input className="input text-sm" placeholder="Customer name (optional)" value={customerName}
                  onChange={e => setCustomerName(e.target.value)} />

                <div className="flex gap-2">
                  {['cash', 'upi', 'card'].map(m => (
                    <button key={m} onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize border transition-colors ${paymentMethod === m ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-600' : ''}`}
                      style={paymentMethod !== m ? { borderColor: 'var(--border)', color: 'var(--text-muted)' } : {}}>
                      {m === 'cash' ? '💵' : m === 'upi' ? '📱' : '💳'} {m}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Discount ₹</label>
                  <input className="input text-sm" type="number" min="0" value={discount}
                    onChange={e => dispatch(setDiscount(e.target.value))} />
                </div>

                <div className="rounded-lg p-3 space-y-1" style={{ background: 'var(--bg)' }}>
                  <div className="flex justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
                    <span>Subtotal</span><span>₹{subtotal}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span><span>-₹{discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-1 mt-1" style={{ borderColor: 'var(--border)' }}>
                    <span>TOTAL</span><span>₹{total}</span>
                  </div>
                </div>

                <button onClick={handleCheckout} disabled={loading}
                  className="btn-primary w-full py-4 text-base font-bold">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </span>
                  ) : `Generate Bill • ₹${total}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="max-w-7xl mx-auto">
        {/* Search + filters */}
        <div className="sticky top-14 z-20 p-3 border-b gap-2 flex flex-col" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <input
            ref={searchRef}
            className="input"
            placeholder="🔍 Search products or scan barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  selectedCategory === cat
                    ? 'text-white'
                    : 'border'
                }`}
                style={selectedCategory === cat
                  ? { background: 'var(--brand)' }
                  : { borderColor: 'var(--border)', color: 'var(--text-muted)' }
                }>
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products grid */}
        <div className="p-3 pb-28">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
              <p className="text-4xl mb-2">📦</p>
              <p>No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {filteredProducts.map((product) => {
                const inCart = cartItems.find((i) => i.product === product._id);
                return (
                  <button
                    key={product._id}
                    onClick={() => {
                      dispatch(addItem(product));
                      // Haptic feedback on mobile
                      if (navigator.vibrate) navigator.vibrate(30);
                    }}
                    className={`card p-3 text-left transition-all active:scale-95 hover:shadow-md relative ${
                      inCart ? 'ring-2 ring-sky-500' : ''
                    } ${product.stock === 0 ? 'opacity-50' : ''}`}
                    disabled={product.stock === 0}
                  >
                    {inCart && (
                      <span className="absolute top-2 right-2 h-5 w-5 rounded-full text-xs flex items-center justify-center text-white font-bold"
                        style={{ background: 'var(--brand)' }}>
                        {inCart.quantity}
                      </span>
                    )}
                    <p className="text-xs font-semibold leading-tight mb-1 pr-4"
                      style={{ color: 'var(--text-muted)' }}>{product.category}</p>
                    <p className="font-semibold text-sm leading-tight mb-2">{product.name}</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--brand)' }}>₹{product.price}</p>
                    {product.stock < 10 && product.stock > 0 && (
                      <p className="text-xs text-amber-500 mt-1">Only {product.stock} left</p>
                    )}
                    {product.stock === 0 && (
                      <p className="text-xs text-red-500 mt-1">Out of stock</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating cart button */}
      <div className="fixed bottom-4 right-4 left-4 max-w-sm mx-auto z-30 no-print">
        <button
          onClick={() => setShowCart(true)}
          className="btn-primary w-full py-4 text-base font-bold shadow-lg relative"
          style={{ boxShadow: '0 8px 24px rgba(14,165,233,0.4)' }}
        >
          <span className="flex items-center justify-between">
            <span>🛒 View Cart</span>
            <span className="flex items-center gap-2">
              <span className="bg-white/20 rounded-full px-2 py-0.5 text-sm">{cartCount} items</span>
              <span className="font-black">₹{total}</span>
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
