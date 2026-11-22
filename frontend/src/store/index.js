import { configureStore } from '@reduxjs/toolkit';
import { tuneForgeApi } from './apiSlice.js';

export const store = configureStore({
  reducer: {
    [tuneForgeApi.reducerPath]: tuneForgeApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(tuneForgeApi.middleware),
});
