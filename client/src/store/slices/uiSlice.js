import { createSlice } from '@reduxjs/toolkit';

const isDark = localStorage.getItem('darkMode') === 'true';
if (isDark) document.documentElement.classList.add('dark');

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    darkMode: isDark,
    notifications: [],
    isOnline: navigator.onLine,
  },
  reducers: {
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
      localStorage.setItem('darkMode', state.darkMode);
      document.documentElement.classList.toggle('dark', state.darkMode);
    },
    addNotification(state, action) {
      state.notifications.push({
        id: Date.now(),
        type: 'info',
        ...action.payload,
      });
    },
    removeNotification(state, action) {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    setOnlineStatus(state, action) {
      state.isOnline = action.payload;
    },
  },
});

export const { toggleDarkMode, addNotification, removeNotification, setOnlineStatus } = uiSlice.actions;
export default uiSlice.reducer;
