import { z } from 'zod';

const optNum = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().min(min).max(max).optional()
  );

export const createVitalsSchema = z.object({
  appointmentId:   z.string().min(1, 'Appointment ID required'),
  patientId:       z.string().min(1, 'Patient ID required'),

  bloodPressure: z.object({
    systolic:  z.coerce.number().min(50).max(300),
    diastolic: z.coerce.number().min(20).max(200),
  }).optional(),

  pulseRate:       optNum(0, 300),
  temperature:     optNum(25, 45),
  weight:          optNum(0.5, 500),
  height:          optNum(10, 300),
  spo2:            optNum(0, 100),
  respiratoryRate: optNum(0, 100),

  bloodSugar: z.object({
    value: z.coerce.number().min(0),
    unit:  z.enum(['mg/dL', 'mmol/L']).default('mg/dL'),
    type:  z.enum(['fasting', 'postprandial', 'random', 'hba1c']),
  }).optional(),

  painScale: optNum(0, 10),
  notes:     z.string().max(500).optional(),
});

export const updateVitalsSchema = createVitalsSchema
  .omit({ appointmentId: true, patientId: true })
  .partial();
