import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PatientDetail } from '@/services/patient.service';

interface PatientState {
  current: PatientDetail | null;
  isLoading: boolean;
}

const initialState: PatientState = {
  current: null,
  isLoading: false,
};

const patientSlice = createSlice({
  name: 'patient',
  initialState,
  reducers: {
    setCurrentPatient(state, action: PayloadAction<PatientDetail>) {
      state.current = action.payload;
      state.isLoading = false;
    },
    clearCurrentPatient(state) {
      state.current = null;
    },
    setPatientLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    patchCurrentPatient(state, action: PayloadAction<Partial<PatientDetail>>) {
      if (state.current) {
        state.current = { ...state.current, ...action.payload };
      }
    },
  },
});

export const { setCurrentPatient, clearCurrentPatient, setPatientLoading, patchCurrentPatient } =
  patientSlice.actions;
export default patientSlice.reducer;
