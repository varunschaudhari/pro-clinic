import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import patientReducer from '../features/patients/patientSlice';
import clinicReducer from '../features/clinic/clinicSlice';

export const store = configureStore({
  reducer: {
    auth:    authReducer,
    patient: patientReducer,
    clinic:  clinicReducer,
    // appointments: appointmentsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these paths for non-serializable Date objects in state
        ignoredPaths: ['auth.user.lastLoginAt'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
