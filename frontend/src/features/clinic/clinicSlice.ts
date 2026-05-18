import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { clinicApi } from '@/services/clinic.service';
import type { ClinicDoc } from '@/services/clinic.service';

interface ClinicState {
  clinic: ClinicDoc | null;
  loading: boolean;
}

const initialState: ClinicState = {
  clinic:  null,
  loading: false,
};

export const fetchClinic = createAsyncThunk(
  'clinic/fetch',
  async () => {
    const res = await clinicApi.get();
    return res.data.data;
  }
);

const clinicSlice = createSlice({
  name: 'clinic',
  initialState,
  reducers: {
    setClinic(state, action: PayloadAction<ClinicDoc>) {
      state.clinic = action.payload;
    },
    clearClinic(state) {
      state.clinic = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClinic.pending,   (state) => { state.loading = true; })
      .addCase(fetchClinic.fulfilled, (state, action) => {
        state.clinic  = action.payload;
        state.loading = false;
      })
      .addCase(fetchClinic.rejected,  (state) => { state.loading = false; });
  },
});

export const { setClinic, clearClinic } = clinicSlice.actions;
export default clinicSlice.reducer;
