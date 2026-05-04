import { createSlice } from '@reduxjs/toolkit';

// Load cart from localStorage (offline persistence)
const loadCart = () => {
  try {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  } catch {
    return [];
  }
};

const saveCart = (items) => {
  localStorage.setItem('cart', JSON.stringify(items));
};

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: loadCart(),
    discount: 0,
    taxRate: 0,
    offlineQueue: [], // Bills saved offline
  },
  reducers: {
    addItem(state, action) {
      const product = action.payload;
      const existing = state.items.find((i) => i.product === product._id);
      if (existing) {
        existing.quantity += 1;
        existing.subtotal = existing.productPrice * existing.quantity;
      } else {
        state.items.push({
          product: product._id,
          productName: product.name,
          productPrice: product.price,
          quantity: 1,
          subtotal: product.price,
        });
      }
      saveCart(state.items);
    },
    removeItem(state, action) {
      state.items = state.items.filter((i) => i.product !== action.payload);
      saveCart(state.items);
    },
    updateQuantity(state, action) {
      const { productId, quantity } = action.payload;
      const item = state.items.find((i) => i.product === productId);
      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter((i) => i.product !== productId);
        } else {
          item.quantity = quantity;
          item.subtotal = item.productPrice * quantity;
        }
      }
      saveCart(state.items);
    },
    clearCart(state) {
      state.items = [];
      state.discount = 0;
      localStorage.removeItem('cart');
    },
    setDiscount(state, action) {
      state.discount = Math.max(0, Number(action.payload) || 0);
    },
    addToOfflineQueue(state, action) {
      state.offlineQueue.push(action.payload);
    },
    removeFromOfflineQueue(state, action) {
      state.offlineQueue = state.offlineQueue.filter((_, i) => i !== action.payload);
    },
  },
});

// Selectors
export const selectCartItems = (state) => state.cart.items;
export const selectCartSubtotal = (state) =>
  state.cart.items.reduce((sum, item) => sum + item.subtotal, 0);
export const selectCartTotal = (state) => {
  const subtotal = selectCartSubtotal(state);
  const tax = subtotal * (state.cart.taxRate / 100);
  return subtotal + tax - state.cart.discount;
};

export const { addItem, removeItem, updateQuantity, clearCart, setDiscount, addToOfflineQueue, removeFromOfflineQueue } = cartSlice.actions;
export default cartSlice.reducer;
