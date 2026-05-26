/**
 * Demo seed — City Multi-Specialty Clinic
 * Run:  npm run seed   (from the backend directory)
 * Idempotent: wipes and re-seeds the demo clinic on every run.
 *
 * Credentials (all staff use password: Demo@1234)
 *   Admin       Meera Kapoor      9800000001
 *   Doctor (GM) Dr. Rajesh Sharma 9800000002
 *   Doctor (Gy) Dr. Priya Nair    9800000003
 *   Reception   Sunita Patil      9800000004
 *   Pharmacist  Anil Kumar        9800000005
 */
import { Types } from 'mongoose';
import { connectDB, disconnectDB } from '../config/database';
import { Clinic }            from '../models/Clinic.model';
import { User }              from '../models/User.model';
import { Patient }           from '../models/Patient.model';
import { Appointment }       from '../models/Appointment.model';
import { VitalSigns }        from '../models/VitalSigns.model';
import { Prescription }      from '../models/Prescription.model';
import { Invoice }           from '../models/Invoice.model';
import { PharmacyItem }      from '../models/PharmacyItem.model';
import { LabReport }         from '../models/LabReport.model';
import { Counter, nextSeq }  from '../models/Counter.model';
import { DoctorSchedule }    from '../models/DoctorSchedule.model';

// ─── tiny helpers ──────────────────────────────────────────────────────────────
const pad3 = (n: number) => String(n).padStart(3, '0');
const r2   = (n: number) => Math.round(n * 100) / 100;

function setTime(base: Date, h: number, m = 0): Date {
  const d = new Date(base); d.setHours(h, m, 0, 0); return d;
}
function addMin(d: Date, min: number): Date {
  return new Date(d.getTime() + min * 60_000);
}
function workingDaysBack(calDays: number): Date[] {
  const out: Date[] = [];
  const t = new Date(); t.setHours(0, 0, 0, 0);
  for (let i = calDays; i >= 1; i--) {
    const d = new Date(t); d.setDate(t.getDate() - i);
    if (d.getDay() !== 0) out.push(d);
  }
  return out;
}
function workingDaysAhead(calDays: number): Date[] {
  const out: Date[] = [];
  const t = new Date(); t.setHours(0, 0, 0, 0);
  for (let i = 1; i <= calDays; i++) {
    const d = new Date(t); d.setDate(t.getDate() + i);
    if (d.getDay() !== 0) out.push(d);
  }
  return out;
}
function today0(): Date { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

// ─── static patient data ───────────────────────────────────────────────────────
const PATIENTS = [
  { name: 'Ramesh Kumar',    mobile: '9811111101', gender: 'male',   age: 45, dob: '1979-03-12', bg: 'B+',  city: 'Pune',      state: 'Maharashtra', slot: 'gm' },
  { name: 'Priya Singh',     mobile: '9811111102', gender: 'female', age: 32, dob: '1992-07-18', bg: 'A+',  city: 'Pune',      state: 'Maharashtra', slot: 'gy' },
  { name: 'Suresh Patel',    mobile: '9811111103', gender: 'male',   age: 58, dob: '1966-11-05', bg: 'O+',  city: 'Nashik',    state: 'Maharashtra', slot: 'gm' },
  { name: 'Anjali Sharma',   mobile: '9811111104', gender: 'female', age: 27, dob: '1997-04-22', bg: 'B+',  city: 'Mumbai',    state: 'Maharashtra', slot: 'gm' },
  { name: 'Vikram Nair',     mobile: '9811111105', gender: 'male',   age: 40, dob: '1984-08-30', bg: 'AB+', city: 'Pune',      state: 'Maharashtra', slot: 'gm' },
  { name: 'Meena Gupta',     mobile: '9811111106', gender: 'female', age: 52, dob: '1972-02-14', bg: 'A-',  city: 'Nagpur',    state: 'Maharashtra', slot: 'gy' },
  { name: 'Arjun Reddy',     mobile: '9811111107', gender: 'male',   age: 25, dob: '1999-09-10', bg: 'O+',  city: 'Pune',      state: 'Maharashtra', slot: 'gm' },
  { name: 'Kavitha Rao',     mobile: '9811111108', gender: 'female', age: 38, dob: '1986-05-25', bg: 'B+',  city: 'Hyderabad', state: 'Telangana',   slot: 'gy' },
  { name: 'Mohan Joshi',     mobile: '9811111109', gender: 'male',   age: 62, dob: '1962-12-01', bg: 'A+',  city: 'Pune',      state: 'Maharashtra', slot: 'gm' },
  { name: 'Sunita Desai',    mobile: '9811111110', gender: 'female', age: 43, dob: '1981-06-17', bg: 'O-',  city: 'Pune',      state: 'Maharashtra', slot: 'gm' },
  { name: 'Deepak Verma',    mobile: '9811111111', gender: 'male',   age: 33, dob: '1991-01-28', bg: 'B+',  city: 'Mumbai',    state: 'Maharashtra', slot: 'gm' },
  { name: 'Rekha Iyer',      mobile: '9811111112', gender: 'female', age: 29, dob: '1995-10-08', bg: 'A+',  city: 'Chennai',   state: 'Tamil Nadu',  slot: 'gy' },
  { name: 'Sanjay Malhotra', mobile: '9811111113', gender: 'male',   age: 50, dob: '1974-03-19', bg: 'O+',  city: 'Pune',      state: 'Maharashtra', slot: 'gm' },
  { name: 'Pooja Krishnan',  mobile: '9811111114', gender: 'female', age: 24, dob: '2000-07-14', bg: 'B-',  city: 'Bangalore', state: 'Karnataka',   slot: 'gy' },
  { name: 'Ravi Mehta',      mobile: '9811111115', gender: 'male',   age: 67, dob: '1957-11-22', bg: 'A+',  city: 'Pune',      state: 'Maharashtra', slot: 'gm' },
  { name: 'Sudha Pillai',    mobile: '9811111116', gender: 'female', age: 55, dob: '1969-04-30', bg: 'AB+', city: 'Pune',      state: 'Maharashtra', slot: 'gy' },
  { name: 'Aakash Jain',     mobile: '9811111117', gender: 'male',   age: 30, dob: '1994-08-15', bg: 'O+',  city: 'Mumbai',    state: 'Maharashtra', slot: 'gm' },
  { name: 'Nandita Bose',    mobile: '9811111118', gender: 'female', age: 47, dob: '1977-02-09', bg: 'B+',  city: 'Kolkata',   state: 'West Bengal', slot: 'gm' },
  { name: 'Girish Yadav',    mobile: '9811111119', gender: 'male',   age: 72, dob: '1952-06-03', bg: 'A+',  city: 'Pune',      state: 'Maharashtra', slot: 'gm' },
  { name: 'Lakshmi Venkat',  mobile: '9811111120', gender: 'female', age: 35, dob: '1989-09-21', bg: 'O+',  city: 'Pune',      state: 'Maharashtra', slot: 'gm' },
] as const;

// ─── pharmacy catalog ──────────────────────────────────────────────────────────
const DRUGS = [
  { key: 'METFORMIN',     name: 'Metformin 500mg',          generic: 'Metformin HCl',               unit: 'tablet',  mrp: 35,  sell: 32,  stock: 150, reorder: 20 },
  { key: 'AMLODIPINE',    name: 'Amlodipine 5mg',           generic: 'Amlodipine Besylate',         unit: 'tablet',  mrp: 42,  sell: 38,  stock: 120, reorder: 20 },
  { key: 'PARACETAMOL',   name: 'Paracetamol 500mg',        generic: 'Paracetamol',                 unit: 'tablet',  mrp: 18,  sell: 15,  stock: 300, reorder: 50 },
  { key: 'PANTOPRAZOLE',  name: 'Pantoprazole 40mg',        generic: 'Pantoprazole Sodium',         unit: 'tablet',  mrp: 55,  sell: 48,  stock: 100, reorder: 20 },
  { key: 'AZITHROMYCIN',  name: 'Azithromycin 500mg',       generic: 'Azithromycin',                unit: 'tablet',  mrp: 65,  sell: 58,  stock: 80,  reorder: 15 },
  { key: 'CETIRIZINE',    name: 'Cetirizine 10mg',          generic: 'Cetirizine HCl',              unit: 'tablet',  mrp: 20,  sell: 18,  stock: 120, reorder: 20 },
  { key: 'ATORVASTATIN',  name: 'Atorvastatin 10mg',        generic: 'Atorvastatin Calcium',        unit: 'tablet',  mrp: 45,  sell: 40,  stock: 90,  reorder: 15 },
  { key: 'CALCIUM_D3',    name: 'Calcium Carbonate + D3',   generic: 'Calcium + Vitamin D3',        unit: 'tablet',  mrp: 30,  sell: 27,  stock: 100, reorder: 20 },
  { key: 'IRON_FOLATE',   name: 'Iron + Folic Acid',        generic: 'Ferrous Sulfate + Folic Acid',unit: 'tablet',  mrp: 22,  sell: 20,  stock: 150, reorder: 25 },
  { key: 'AMOXICILLIN',   name: 'Amoxicillin 500mg',        generic: 'Amoxicillin Trihydrate',      unit: 'capsule', mrp: 55,  sell: 50,  stock: 60,  reorder: 15 },
  { key: 'DICLOFENAC',    name: 'Diclofenac Sodium 50mg',   generic: 'Diclofenac Sodium',           unit: 'tablet',  mrp: 28,  sell: 25,  stock: 100, reorder: 20 },
  { key: 'ONDANSETRON',   name: 'Ondansetron 4mg',          generic: 'Ondansetron HCl',             unit: 'tablet',  mrp: 38,  sell: 34,  stock: 80,  reorder: 15 },
  { key: 'LEVOTHYROXINE', name: 'Levothyroxine 50mcg',      generic: 'Levothyroxine Sodium',        unit: 'tablet',  mrp: 48,  sell: 44,  stock: 60,  reorder: 10 },
  { key: 'SALBUTAMOL',    name: 'Salbutamol Inhaler 100mcg',generic: 'Salbutamol Sulfate',          unit: 'inhaler', mrp: 120, sell: 110, stock: 30,  reorder: 5  },
  { key: 'MULTIVIT',      name: 'Multivitamin Tablets',     generic: 'Multivitamin Complex',        unit: 'tablet',  mrp: 25,  sell: 22,  stock: 100, reorder: 15 },
];

// ─── visit scenario types ──────────────────────────────────────────────────────
type MedLine = {
  key?: string; name: string; generic?: string;
  dosage: string; freq: string; dur: string; durDays: number;
  unit: string; instr?: string; qty: number;
};
type Vitals = {
  bpSys: number; bpDia: number; pulse: number; temp: number;
  weight: number; spo2: number;
  sugar?: { value: number; type: 'fasting' | 'postprandial' | 'random' };
};
type Scenario = {
  diagnoses: string[]; complaint: string;
  meds: MedLine[]; advice: string; vitals: Vitals; fee: number;
};

// ─── GM scenarios ──────────────────────────────────────────────────────────────
const GM: Scenario[] = [
  {
    diagnoses: ['Essential Hypertension', 'Type 2 Diabetes Mellitus'],
    complaint: 'High BP and elevated blood sugar on monitoring',
    meds: [
      { key: 'METFORMIN',   name: 'Metformin 500mg',  generic: 'Metformin HCl',   dosage: '1 tab', freq: 'BD',  dur: '30 days', durDays: 30, unit: 'tablet',  instr: 'After meals',             qty: 60 },
      { key: 'AMLODIPINE',  name: 'Amlodipine 5mg',   generic: 'Amlodipine',      dosage: '1 tab', freq: 'OD',  dur: '30 days', durDays: 30, unit: 'tablet',  instr: 'Morning after breakfast', qty: 30 },
      { key: 'ATORVASTATIN',name: 'Atorvastatin 10mg',generic: 'Atorvastatin',    dosage: '1 tab', freq: 'HS',  dur: '30 days', durDays: 30, unit: 'tablet',  instr: 'At bedtime',              qty: 30 },
    ],
    advice: 'Low-salt, low-sugar diet. Walk 30 min daily. Monitor BP & fasting sugar weekly.',
    vitals: { bpSys: 148, bpDia: 92, pulse: 82, temp: 37.0, weight: 78, spo2: 97, sugar: { value: 182, type: 'fasting' } },
    fee: 400,
  },
  {
    diagnoses: ['Acute Upper Respiratory Tract Infection', 'Pharyngitis'],
    complaint: 'Sore throat, running nose, mild fever for 3 days',
    meds: [
      { key: 'AZITHROMYCIN',name: 'Azithromycin 500mg',generic: 'Azithromycin',   dosage: '1 tab', freq: 'OD',  dur: '5 days',  durDays: 5,  unit: 'tablet',  instr: 'After food',              qty: 5  },
      { key: 'PARACETAMOL', name: 'Paracetamol 500mg', generic: 'Paracetamol',    dosage: '1 tab', freq: 'TDS', dur: '5 days',  durDays: 5,  unit: 'tablet',  instr: 'SOS for fever/pain',      qty: 15 },
      { key: 'CETIRIZINE',  name: 'Cetirizine 10mg',   generic: 'Cetirizine HCl', dosage: '1 tab', freq: 'OD',  dur: '5 days',  durDays: 5,  unit: 'tablet',  instr: 'At night',                qty: 5  },
    ],
    advice: 'Warm fluids, rest. Avoid cold drinks. Steam inhalation twice daily. Come back if no improvement in 3 days.',
    vitals: { bpSys: 115, bpDia: 74, pulse: 96, temp: 38.5, weight: 68, spo2: 97 },
    fee: 400,
  },
  {
    diagnoses: ['Acute Gastritis', 'Dyspepsia'],
    complaint: 'Burning sensation in stomach, nausea, loss of appetite',
    meds: [
      { key: 'PANTOPRAZOLE',name: 'Pantoprazole 40mg', generic: 'Pantoprazole',   dosage: '1 tab', freq: 'OD',  dur: '14 days', durDays: 14, unit: 'tablet',  instr: '30 min before breakfast', qty: 14 },
      { key: 'ONDANSETRON', name: 'Ondansetron 4mg',   generic: 'Ondansetron HCl',dosage: '1 tab', freq: 'SOS', dur: '5 days',  durDays: 5,  unit: 'tablet',  instr: 'For nausea SOS',          qty: 5  },
    ],
    advice: 'Avoid spicy, oily food. Small frequent meals. No NSAIDs. Avoid alcohol. Return if vomiting persists.',
    vitals: { bpSys: 118, bpDia: 76, pulse: 78, temp: 37.1, weight: 65, spo2: 98 },
    fee: 400,
  },
  {
    diagnoses: ['Lumbago', 'Musculoskeletal Pain'],
    complaint: 'Lower back pain radiating to left leg, difficulty standing',
    meds: [
      { key: 'DICLOFENAC',  name: 'Diclofenac Sodium 50mg', generic: 'Diclofenac', dosage: '1 tab', freq: 'BD',  dur: '5 days',  durDays: 5,  unit: 'tablet',  instr: 'After meals',             qty: 10 },
      { key: 'PANTOPRAZOLE',name: 'Pantoprazole 40mg',       generic: 'Pantoprazole',dosage: '1 tab',freq: 'OD', dur: '5 days',  durDays: 5,  unit: 'tablet',  instr: 'Before breakfast',        qty: 5  },
    ],
    advice: 'Hot fermentation. Avoid forward bending. Light walking. Physiotherapy referral given.',
    vitals: { bpSys: 122, bpDia: 80, pulse: 74, temp: 37.0, weight: 80, spo2: 98 },
    fee: 400,
  },
  {
    diagnoses: ['Hypothyroidism'],
    complaint: 'Fatigue, weight gain, cold intolerance, constipation',
    meds: [
      { key: 'LEVOTHYROXINE',name: 'Levothyroxine 50mcg', generic: 'Levothyroxine', dosage: '1 tab', freq: 'OD',  dur: '90 days', durDays: 90, unit: 'tablet',  instr: 'Empty stomach, 30 min before breakfast', qty: 90 },
      { key: 'CALCIUM_D3',   name: 'Calcium Carbonate + D3', generic: 'Calcium + Vit D3', dosage: '1 tab', freq: 'OD', dur: '90 days', durDays: 90, unit: 'tablet', instr: 'With meals', qty: 90 },
    ],
    advice: 'Do not take thyroid tablets with milk or calcium. TSH repeat after 6 weeks.',
    vitals: { bpSys: 115, bpDia: 72, pulse: 62, temp: 36.7, weight: 72, spo2: 99 },
    fee: 400,
  },
  {
    diagnoses: ['Bronchial Asthma', 'Allergic Rhinitis'],
    complaint: 'Breathlessness, wheezing, nasal congestion since morning',
    meds: [
      { key: 'SALBUTAMOL',  name: 'Salbutamol Inhaler 100mcg', generic: 'Salbutamol', dosage: '2 puffs', freq: 'SOS', dur: 'As needed', durDays: 30, unit: 'inhaler', instr: '2 puffs during attack, max 4x/day', qty: 1 },
      { key: 'CETIRIZINE',  name: 'Cetirizine 10mg',            generic: 'Cetirizine HCl', dosage: '1 tab', freq: 'OD', dur: '14 days', durDays: 14, unit: 'tablet', instr: 'At night', qty: 14 },
    ],
    advice: 'Avoid dust and cold air. Keep rescue inhaler handy. Avoid known allergens. Spirometry follow-up.',
    vitals: { bpSys: 120, bpDia: 78, pulse: 92, temp: 37.2, weight: 63, spo2: 94 },
    fee: 400,
  },
  {
    diagnoses: ['Viral Fever', 'Myalgia'],
    complaint: 'High fever 101°F, body aches, headache for 2 days',
    meds: [
      { key: 'PARACETAMOL', name: 'Paracetamol 500mg', generic: 'Paracetamol', dosage: '1 tab', freq: 'TDS', dur: '5 days', durDays: 5, unit: 'tablet', instr: 'After meals', qty: 15 },
      { key: 'CETIRIZINE',  name: 'Cetirizine 10mg',   generic: 'Cetirizine HCl', dosage: '1 tab', freq: 'OD', dur: '5 days', durDays: 5, unit: 'tablet', instr: 'At night', qty: 5 },
    ],
    advice: 'Plenty of fluids. Complete bed rest. Tepid sponging for fever. Dengue NS1 test done.',
    vitals: { bpSys: 112, bpDia: 70, pulse: 100, temp: 38.8, weight: 70, spo2: 96 },
    fee: 400,
  },
  {
    diagnoses: ['Tension Headache', 'Migraine without Aura'],
    complaint: 'Severe headache right sided, photophobia, nausea',
    meds: [
      { key: 'PARACETAMOL', name: 'Paracetamol 500mg',  generic: 'Paracetamol',    dosage: '2 tabs', freq: 'SOS', dur: '5 days', durDays: 5, unit: 'tablet', instr: 'At onset of headache', qty: 10 },
      { key: 'ONDANSETRON', name: 'Ondansetron 4mg',    generic: 'Ondansetron HCl',dosage: '1 tab',  freq: 'SOS', dur: '5 days', durDays: 5, unit: 'tablet', instr: 'For associated nausea', qty: 5  },
    ],
    advice: 'Avoid triggers: bright light, loud noise, strong smells. Maintain sleep schedule. Headache diary advised.',
    vitals: { bpSys: 130, bpDia: 84, pulse: 80, temp: 37.0, weight: 60, spo2: 99 },
    fee: 400,
  },
  {
    diagnoses: ['Routine Health Checkup', 'Dyslipidemia'],
    complaint: 'Annual health checkup, no specific complaints',
    meds: [
      { key: 'ATORVASTATIN',name: 'Atorvastatin 10mg',    generic: 'Atorvastatin', dosage: '1 tab', freq: 'HS',  dur: '90 days', durDays: 90, unit: 'tablet', instr: 'At bedtime', qty: 90 },
      { key: 'MULTIVIT',    name: 'Multivitamin Tablets',  generic: 'Multivitamin', dosage: '1 tab', freq: 'OD',  dur: '30 days', durDays: 30, unit: 'tablet', instr: 'After breakfast', qty: 30 },
    ],
    advice: 'Lipid profile repeat after 3 months. Regular exercise. Avoid processed food.',
    vitals: { bpSys: 125, bpDia: 82, pulse: 72, temp: 37.0, weight: 82, spo2: 98 },
    fee: 400,
  },
  {
    diagnoses: ['Type 2 Diabetes Mellitus - Follow Up'],
    complaint: 'Follow-up, blood sugar not well controlled',
    meds: [
      { key: 'METFORMIN',   name: 'Metformin 500mg',  generic: 'Metformin HCl', dosage: '1 tab', freq: 'TDS', dur: '30 days', durDays: 30, unit: 'tablet',  instr: 'With meals',    qty: 90 },
      { key: 'ATORVASTATIN',name: 'Atorvastatin 10mg',generic: 'Atorvastatin',  dosage: '1 tab', freq: 'HS',  dur: '30 days', durDays: 30, unit: 'tablet',  instr: 'At bedtime',    qty: 30 },
    ],
    advice: 'Strict diabetic diet. HbA1c test recommended. Foot examination done. Return after 1 month.',
    vitals: { bpSys: 132, bpDia: 84, pulse: 78, temp: 37.1, weight: 85, spo2: 97, sugar: { value: 214, type: 'postprandial' } },
    fee: 400,
  },
];

// ─── Gynae scenarios ───────────────────────────────────────────────────────────
const GY: Scenario[] = [
  {
    diagnoses: ['Pregnancy - 8 Weeks', 'Hyperemesis Gravidarum'],
    complaint: 'Confirmed pregnancy, severe nausea and vomiting',
    meds: [
      { key: 'IRON_FOLATE',  name: 'Iron + Folic Acid',    generic: 'Ferrous Sulfate + Folic Acid', dosage: '1 tab', freq: 'OD',  dur: '90 days', durDays: 90, unit: 'tablet', instr: 'After dinner', qty: 90 },
      { key: 'ONDANSETRON',  name: 'Ondansetron 4mg',      generic: 'Ondansetron HCl', dosage: '1 tab', freq: 'TDS', dur: '7 days',  durDays: 7,  unit: 'tablet', instr: 'Before meals', qty: 21 },
    ],
    advice: 'Small frequent meals. Avoid strong smells. Ginger tea helps. Rest adequately. Anomaly scan at 18-20 weeks.',
    vitals: { bpSys: 108, bpDia: 68, pulse: 88, temp: 36.9, weight: 57, spo2: 99 },
    fee: 600,
  },
  {
    diagnoses: ['Antenatal Checkup - 20 Weeks', 'Normal Pregnancy'],
    complaint: 'Routine antenatal visit, mild leg swelling',
    meds: [
      { key: 'IRON_FOLATE',  name: 'Iron + Folic Acid',    generic: 'Ferrous Sulfate + Folic Acid', dosage: '1 tab', freq: 'OD',  dur: '90 days', durDays: 90, unit: 'tablet', instr: 'After dinner', qty: 90 },
      { key: 'CALCIUM_D3',   name: 'Calcium Carbonate + D3', generic: 'Calcium + Vit D3', dosage: '1 tab', freq: 'BD',  dur: '90 days', durDays: 90, unit: 'tablet', instr: 'After meals', qty: 180 },
    ],
    advice: 'Anomaly scan normal. FHR 148 bpm. Elevate feet when sitting. Reduce salt intake. Next visit 4 weeks.',
    vitals: { bpSys: 112, bpDia: 72, pulse: 86, temp: 36.8, weight: 63, spo2: 99 },
    fee: 600,
  },
  {
    diagnoses: ['Polycystic Ovarian Syndrome (PCOS)', 'Oligomenorrhea'],
    complaint: 'Irregular periods, weight gain, excessive facial hair',
    meds: [
      { key: 'METFORMIN',    name: 'Metformin 500mg',      generic: 'Metformin HCl',  dosage: '1 tab', freq: 'BD',  dur: '90 days', durDays: 90, unit: 'tablet', instr: 'After meals',     qty: 180 },
      { key: 'CALCIUM_D3',   name: 'Calcium Carbonate + D3', generic: 'Calcium + Vit D3', dosage: '1 tab', freq: 'OD', dur: '90 days', durDays: 90, unit: 'tablet', instr: 'With meals', qty: 90  },
    ],
    advice: 'Weight loss target 5kg. Exercise 45 min daily. Repeat USG abdomen after 3 months. Hormone profile ordered.',
    vitals: { bpSys: 118, bpDia: 76, pulse: 80, temp: 37.0, weight: 74, spo2: 98 },
    fee: 600,
  },
  {
    diagnoses: ['Perimenopausal Syndrome', 'Osteopenia'],
    complaint: 'Hot flashes, night sweats, mood swings, joint pain',
    meds: [
      { key: 'CALCIUM_D3',   name: 'Calcium Carbonate + D3', generic: 'Calcium + Vit D3', dosage: '1 tab', freq: 'BD',  dur: '90 days', durDays: 90, unit: 'tablet', instr: 'After meals', qty: 180 },
      { key: 'MULTIVIT',     name: 'Multivitamin Tablets',    generic: 'Multivitamin',     dosage: '1 tab', freq: 'OD',  dur: '30 days', durDays: 30, unit: 'tablet', instr: 'After breakfast', qty: 30 },
    ],
    advice: 'DEXA scan recommended. Soy-rich diet. Pelvic floor exercises. Hormone replacement therapy discussed.',
    vitals: { bpSys: 128, bpDia: 82, pulse: 76, temp: 37.0, weight: 68, spo2: 98 },
    fee: 600,
  },
  {
    diagnoses: ['Dysmenorrhea', 'Iron Deficiency Anemia'],
    complaint: 'Painful periods, heavy bleeding, fatigue and weakness',
    meds: [
      { key: 'DICLOFENAC',   name: 'Diclofenac Sodium 50mg', generic: 'Diclofenac', dosage: '1 tab', freq: 'BD',  dur: '3 days',  durDays: 3,  unit: 'tablet', instr: 'During periods', qty: 6   },
      { key: 'IRON_FOLATE',  name: 'Iron + Folic Acid',       generic: 'Ferrous Sulfate + Folic Acid', dosage: '1 tab', freq: 'OD', dur: '60 days', durDays: 60, unit: 'tablet', instr: 'After dinner', qty: 60 },
    ],
    advice: 'Iron-rich diet (spinach, dates, jaggery). Avoid NSAIDs on empty stomach. Haemogram after 6 weeks.',
    vitals: { bpSys: 108, bpDia: 68, pulse: 90, temp: 37.0, weight: 52, spo2: 98 },
    fee: 600,
  },
];

// ─── invoice calculator ────────────────────────────────────────────────────────
function buildInvoiceItems(fee: number, meds: Array<{ name: string; qty: number; price: number }>) {
  const items: Array<{
    type: string; description: string; quantity: number; unitPrice: number;
    discount: number; taxableAmount: number; gstRate: number;
    cgstAmount: number; sgstAmount: number; igstAmount: number; totalAmount: number;
  }> = [];

  // Consultation line (GST exempt)
  items.push({
    type: 'consultation', description: 'Consultation Charges', quantity: 1,
    unitPrice: fee, discount: 0, taxableAmount: fee,
    gstRate: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalAmount: fee,
  });

  // Medicine lines (5% GST)
  for (const m of meds) {
    const taxable   = r2(m.qty * m.price);
    const cgst      = r2(taxable * 0.025);
    const sgst      = r2(taxable * 0.025);
    const total     = r2(taxable + cgst + sgst);
    items.push({
      type: 'medicine', description: m.name, quantity: m.qty, unitPrice: m.price,
      discount: 0, taxableAmount: taxable, gstRate: 5,
      cgstAmount: cgst, sgstAmount: sgst, igstAmount: 0, totalAmount: total,
    });
  }
  return items;
}

function calcInvoiceTotals(items: ReturnType<typeof buildInvoiceItems>) {
  const subtotal          = r2(items.reduce((a, i) => a + i.unitPrice * i.quantity, 0));
  const totalDiscount     = 0;
  const totalTaxable      = r2(items.reduce((a, i) => a + i.taxableAmount, 0));
  const totalCGST         = r2(items.reduce((a, i) => a + i.cgstAmount, 0));
  const totalSGST         = r2(items.reduce((a, i) => a + i.sgstAmount, 0));
  const rawTotal          = r2(totalTaxable + totalCGST + totalSGST);
  const rounded           = Math.ceil(rawTotal);
  const roundOff          = r2(rounded - rawTotal);
  return { subtotal, totalDiscount, totalTaxable, totalCGST, totalSGST, rawTotal: rounded, roundOff };
}

// ─── main ──────────────────────────────────────────────────────────────────────
async function main() {
  await connectDB();
  console.log('\n🌱  Starting demo seed…\n');

  // ── 0. Recreate SuperAdmin every seed run ────────────────────────────────────
  // Delete first, then new User().save() so the pre-save hook hashes the password.
  // (findOneAndUpdate/upsert skips hooks and stores plaintext — never use that here.)
  await User.deleteOne({ mobile: '9800000009', role: 'SuperAdmin' });
  await new User({
    name:             'Super Admin',
    mobile:           '9800000009',
    email:            'superadmin@proclinic.in',
    password:         'Super@1234',
    role:             'SuperAdmin',
    clinicId:         null,
    isActive:         true,
    isInviteAccepted: true,
  }).save();
  console.log('✅  SuperAdmin ready: 9800000009 / Super@1234');

  // ── 1. Wipe existing demo data ─────────────────────────────────────────────
  const existing = await Clinic.findOne({ slug: 'demo-city-multispecialty' });
  if (existing) {
    const cId = existing._id as Types.ObjectId;
    await Promise.all([
      User.deleteMany({ clinicId: cId }),
      Patient.deleteMany({ clinicId: cId }),
      Appointment.deleteMany({ clinicId: cId }),
      VitalSigns.deleteMany({ clinicId: cId }),
      Prescription.deleteMany({ clinicId: cId }),
      Invoice.deleteMany({ clinicId: cId }),
      PharmacyItem.deleteMany({ clinicId: cId }),
      LabReport.deleteMany({ clinicId: cId }),
      Counter.deleteMany({ clinicId: cId }),
      DoctorSchedule.deleteMany({ clinicId: cId }),
    ]);
    await Clinic.deleteOne({ _id: cId });
    console.log('🗑   Wiped existing demo clinic data.');
  }

  // ── 2. Create Clinic ───────────────────────────────────────────────────────
  const clinic = await Clinic.create({
    name: 'City Multi-Specialty Clinic',
    slug: 'demo-city-multispecialty',
    type: 'Multi-Specialty',
    mobile: '9800000000',
    email: 'admin@cityclinic-demo.com',
    address: {
      line1: '42, MG Road, Koregaon Park',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
    },
    subscription: {
      plan: 'professional',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      maxDoctors: 10,
      maxPatients: 5000,
    },
    settings: {
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      tokenPrefix: 'T',
      invoicePrefix: 'INV',
      patientIdPrefix: 'CX',
      workingDays: [1, 2, 3, 4, 5, 6],
      workingHours: { start: '09:00', end: '20:00' },
      appointmentDuration: 15,
    },
    isActive: true,
  });
  const clinicId = clinic._id as Types.ObjectId;
  console.log(`✅  Clinic created: ${clinic.name} (${clinic.slug})`);

  // ── 3. Create Users ────────────────────────────────────────────────────────
  const [admin, doctorGM, doctorGY, receptionist, pharmacist] = await Promise.all([
    User.create({ clinicId, name: 'Meera Kapoor',      mobile: '9800000001', email: 'meera@cityclinic-demo.com',      password: 'Demo@1234', role: 'ClinicAdmin',   isInviteAccepted: true }),
    User.create({ clinicId, name: 'Dr. Rajesh Sharma', mobile: '9800000002', email: 'rajesh@cityclinic-demo.com',     password: 'Demo@1234', role: 'Doctor',        isInviteAccepted: true, specialization: 'General Medicine', licenseNumber: 'MH-12345', experience: 15, consultationFee: 400, qualifications: ['MBBS', 'MD (Internal Medicine)'], bio: 'Senior physician with 15 years of experience in general and internal medicine.' }),
    User.create({ clinicId, name: 'Dr. Priya Nair',    mobile: '9800000003', email: 'priya@cityclinic-demo.com',      password: 'Demo@1234', role: 'Doctor',        isInviteAccepted: true, specialization: 'Gynaecology',      licenseNumber: 'MH-67890', experience: 10, consultationFee: 600, qualifications: ['MBBS', 'MS (Obstetrics & Gynaecology)'], bio: 'Expert gynaecologist specializing in antenatal care and hormonal disorders.' }),
    User.create({ clinicId, name: 'Sunita Patil',      mobile: '9800000004', email: 'sunita@cityclinic-demo.com',     password: 'Demo@1234', role: 'Receptionist',  isInviteAccepted: true }),
    User.create({ clinicId, name: 'Anil Kumar',        mobile: '9800000005', email: 'anil@cityclinic-demo.com',       password: 'Demo@1234', role: 'Pharmacist',    isInviteAccepted: true }),
  ]);
  console.log(`✅  Users created: ${[admin, doctorGM, doctorGY, receptionist, pharmacist].map(u => u.name).join(', ')}`);

  // ── 4. Doctor Schedules ────────────────────────────────────────────────────
  const schedDays = [1, 2, 3, 4, 5, 6]; // Mon–Sat
  await DoctorSchedule.insertMany(schedDays.flatMap(day => [
    { clinicId, doctorId: doctorGM._id, dayOfWeek: day, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 15, maxPatientsPerSlot: 1, isActive: true },
    { clinicId, doctorId: doctorGY._id, dayOfWeek: day, startTime: '10:00', endTime: '14:00', slotDurationMinutes: 20, maxPatientsPerSlot: 1, isActive: true },
  ]));
  console.log(`✅  Doctor schedules created.`);

  // ── 5. Pharmacy Items ──────────────────────────────────────────────────────
  const drugDocs = await PharmacyItem.insertMany(DRUGS.map(d => ({
    clinicId,
    name: d.name,
    genericName: d.generic,
    category: d.unit === 'inhaler' ? 'medicine' : 'medicine',
    unit: d.unit,
    mrp: d.mrp,
    sellingPrice: d.sell,
    purchasePrice: Math.round(d.sell * 0.7),
    currentStock: d.stock,
    reorderLevel: d.reorder,
    maxStock: d.stock * 3,
    gstRate: 5,
    requiresPrescription: ['AZITHROMYCIN', 'AMOXICILLIN', 'LEVOTHYROXINE'].includes(d.key),
    schedule: ['AZITHROMYCIN', 'AMOXICILLIN'].includes(d.key) ? 'H' : 'G',
    packSize: 10,
    batches: [{
      batchNumber: `BATCH-${d.key.slice(0, 4)}-001`,
      expiryDate: new Date(Date.now() + 18 * 30 * 24 * 60 * 60 * 1000),
      purchasePrice: Math.round(d.sell * 0.7),
      mrp: d.mrp,
      sellingPrice: d.sell,
      quantity: d.stock,
      purchasedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    }],
    isActive: true,
  })));
  const drugMap = new Map<string, Types.ObjectId>(
    DRUGS.map((d, i) => [d.key, drugDocs[i]!._id as Types.ObjectId])
  );
  console.log(`✅  ${drugDocs.length} pharmacy items created.`);

  // ── 6. Patients ────────────────────────────────────────────────────────────
  const patientDocs = await Promise.all(PATIENTS.map(async p => {
    const seq = await nextSeq(clinicId, 'patient');
    return Patient.create({
      clinicId,
      patientId: `CX-${pad3(seq)}`,
      name: p.name,
      mobile: p.mobile,
      gender: p.gender,
      dob: new Date(p.dob),
      age: p.age,
      ageUnit: 'years',
      bloodGroup: p.bg,
      address: { line1: '123, Sample Road', city: p.city, state: p.state, pincode: '411001' },
      source: 'walkin',
      isActive: true,
    });
  }));
  console.log(`✅  ${patientDocs.length} patients created.`);

  // Helper: maps patient doc to its doctor (gm/gy) and scenario pool
  const gmPatients = patientDocs.filter((_, i) => PATIENTS[i]!.slot === 'gm');
  const gyPatients = patientDocs.filter((_, i) => PATIENTS[i]!.slot === 'gy');

  let gmScenIdx = 0;
  let gyScenIdx = 0;

  // ── 7. Appointments ────────────────────────────────────────────────────────
  // day token counters: Map<dateStr, tokenNum>
  const tokenCount = new Map<string, number>();

  function nextToken(date: Date): { num: number; display: string } {
    const key = date.toISOString().slice(0, 10);
    const n   = (tokenCount.get(key) ?? 0) + 1;
    tokenCount.set(key, n);
    return { num: n, display: `T-${pad3(n)}` };
  }

  async function createVisit(
    patient: (typeof patientDocs)[number],
    doctor: typeof doctorGM,
    scenario: Scenario,
    date: Date,
    startHour: number,
    startMin: number,
    status: 'completed' | 'no_show' | 'scheduled' | 'in_progress',
    visitType: 'new' | 'followup',
    createdBy: Types.ObjectId,
  ) {
    const { num: tokenNum, display: tokenDisplay } = nextToken(date);
    const slotStart = setTime(date, startHour, startMin);
    const slotEnd   = addMin(slotStart, doctor.role === 'Doctor' && doctor.specialization === 'Gynaecology' ? 20 : 15);

    const appt = await Appointment.create({
      clinicId,
      patientId:   patient._id,
      doctorId:    doctor._id,
      createdBy,
      appointmentDate: date,
      slotStart: `${String(startHour).padStart(2,'0')}:${String(startMin).padStart(2,'0')}`,
      slotEnd:   `${String(slotEnd.getHours()).padStart(2,'0')}:${String(slotEnd.getMinutes()).padStart(2,'0')}`,
      tokenNumber: tokenNum,
      tokenDisplay,
      mode: 'walkin',
      visitType,
      status,
      chiefComplaint: scenario.complaint,
      ...(status === 'completed' || status === 'in_progress' ? {
        checkedInAt:         addMin(slotStart, -5),
        consultationStartAt: slotStart,
        consultationEndAt:   status === 'completed' ? addMin(slotStart, 12) : undefined,
      } : {}),
    });

    if (status !== 'completed') return;

    // Vitals
    const v = scenario.vitals;
    const vitals = await VitalSigns.create({
      clinicId,
      patientId:     patient._id,
      appointmentId: appt._id,
      recordedBy:    receptionist._id,
      bloodPressure: { systolic: v.bpSys + Math.floor(Math.random() * 6 - 3), diastolic: v.bpDia + Math.floor(Math.random() * 4 - 2) },
      pulseRate:     v.pulse + Math.floor(Math.random() * 6 - 3),
      temperature:   parseFloat((v.temp + (Math.random() * 0.4 - 0.2)).toFixed(1)),
      weight:        v.weight + Math.floor(Math.random() * 4 - 2),
      spo2:          v.spo2,
      ...(v.sugar ? { bloodSugar: { value: v.sugar.value + Math.floor(Math.random() * 20 - 10), unit: 'mg/dL', type: v.sugar.type } } : {}),
    });

    // Prescription
    const rxSeq = await nextSeq(clinicId, 'prescription');
    const meds = scenario.meds.map(m => ({
      medicineId: m.key ? drugMap.get(m.key) : undefined,
      name:       m.name,
      genericName: m.generic,
      dosage:     m.dosage,
      frequency:  m.freq,
      duration:   m.dur,
      durationDays: m.durDays,
      unit:       m.unit,
      instructions: m.instr,
      quantity:   m.qty,
      isDispensed: true,
    }));
    const rx = await Prescription.create({
      clinicId,
      patientId:          patient._id,
      appointmentId:      appt._id,
      doctorId:           doctor._id,
      prescriptionNumber: `RX-${pad3(rxSeq)}`,
      diagnosis:          scenario.diagnoses,
      medicines:          meds,
      advice:             scenario.advice,
      followUpDate:       addMin(date, 30 * 24 * 60),
    });

    // Invoice
    const invSeq = await nextSeq(clinicId, 'invoice');
    const medItems = scenario.meds.map(m => {
      const drug = DRUGS.find(d => d.key === m.key);
      return { name: m.name, qty: Math.ceil(m.qty / 10), price: drug?.sell ?? 30 };
    });
    const items = buildInvoiceItems(scenario.fee, medItems);
    const totals = calcInvoiceTotals(items);
    const payMode = ['cash', 'upi', 'card'][Math.floor(Math.random() * 3)] as string;
    const inv = await Invoice.create({
      clinicId,
      patientId:          patient._id,
      appointmentId:      appt._id,
      invoiceNumber:      `INV-${pad3(invSeq)}`,
      invoiceDate:        date,
      items,
      subtotal:           totals.subtotal,
      totalDiscount:      totals.totalDiscount,
      totalTaxableAmount: totals.totalTaxable,
      totalCGST:          totals.totalCGST,
      totalSGST:          totals.totalSGST,
      totalIGST:          0,
      roundOff:           totals.roundOff,
      totalAmount:        totals.rawTotal,
      paidAmount:         totals.rawTotal,
      balanceAmount:      0,
      paymentStatus:      'paid',
      payments: [{
        amount:     totals.rawTotal,
        mode:       payMode,
        paidAt:     addMin(date, 20),
        receivedBy: receptionist._id,
      }],
      createdBy: receptionist._id,
    });

    // Update appointment with linked IDs
    await Appointment.findByIdAndUpdate(appt._id, {
      vitalSignsId:  vitals._id,
      prescriptionId: rx._id,
      invoiceId:      inv._id,
    });
  }

  // ── Past 30 days ────────────────────────────────────────────────────────────
  const pastDays = workingDaysBack(42); // ~30 working days in 42 calendar days
  let apptCount = 0;

  for (const day of pastDays) {
    // GM doctor: 1-2 patients
    const gmCount = Math.random() > 0.3 ? 2 : 1;
    for (let t = 0; t < gmCount; t++) {
      const patient   = gmPatients[apptCount % gmPatients.length]!;
      const scenario  = GM[gmScenIdx % GM.length]!;
      const isNoShow  = Math.random() < 0.08;
      gmScenIdx++;
      await createVisit(
        patient, doctorGM, scenario, day,
        9 + t, t * 15 % 60,
        isNoShow ? 'no_show' : 'completed',
        apptCount < gmPatients.length ? 'new' : 'followup',
        receptionist._id as Types.ObjectId,
      );
      apptCount++;
    }

    // GY doctor: 1 patient most days
    if (Math.random() > 0.25) {
      const patient   = gyPatients[apptCount % gyPatients.length]!;
      const scenario  = GY[gyScenIdx % GY.length]!;
      gyScenIdx++;
      await createVisit(
        patient, doctorGY, scenario, day,
        10, 0,
        Math.random() < 0.06 ? 'no_show' : 'completed',
        apptCount < gyPatients.length ? 'new' : 'followup',
        receptionist._id as Types.ObjectId,
      );
      apptCount++;
    }
  }

  // ── Today ──────────────────────────────────────────────────────────────────
  const todayDate = today0();
  await createVisit(gmPatients[0]!, doctorGM, GM[0]!, todayDate, 9,  0,  'completed',   'followup', receptionist._id as Types.ObjectId);
  await createVisit(gmPatients[1]!, doctorGM, GM[1]!, todayDate, 9,  15, 'in_progress', 'new',      receptionist._id as Types.ObjectId);
  await createVisit(gmPatients[2]!, doctorGM, GM[2]!, todayDate, 9,  30, 'scheduled',   'new',      receptionist._id as Types.ObjectId);
  await createVisit(gyPatients[0]!, doctorGY, GY[0]!, todayDate, 10, 0,  'completed',   'followup', receptionist._id as Types.ObjectId);
  await createVisit(gyPatients[1]!, doctorGY, GY[1]!, todayDate, 10, 20, 'scheduled',   'new',      receptionist._id as Types.ObjectId);

  // ── Upcoming (next 7 days) ─────────────────────────────────────────────────
  const futureDays = workingDaysAhead(10).slice(0, 6);
  for (const day of futureDays) {
    const patient  = gmPatients[(apptCount + futureDays.indexOf(day)) % gmPatients.length]!;
    const scenario = GM[gmScenIdx % GM.length]!;
    gmScenIdx++;
    await createVisit(patient, doctorGM, scenario, day, 9, 0, 'scheduled', 'new', receptionist._id as Types.ObjectId);
  }

  console.log(`✅  Appointments created.`);

  // ── 8. Lab Reports (5 reports for demo) ────────────────────────────────────
  const labData = [
    {
      patient: patientDocs[0]!, // Ramesh Kumar
      testName: 'Complete Blood Count (CBC)',
      category: 'Haematology',
      results: [
        { parameter: 'Haemoglobin',  value: '12.8',  unit: 'g/dL',   referenceRange: '13-17', isAbnormal: true,  flags: 'L' },
        { parameter: 'WBC Count',    value: '8400',  unit: '/µL',    referenceRange: '4000-11000', isAbnormal: false },
        { parameter: 'Platelet',     value: '2.1',   unit: 'Lakh/µL',referenceRange: '1.5-4.0', isAbnormal: false },
        { parameter: 'RBC Count',    value: '4.2',   unit: 'mill/µL',referenceRange: '4.5-5.5', isAbnormal: true, flags: 'L' },
      ],
    },
    {
      patient: patientDocs[0]!, // Ramesh Kumar - Lipid profile
      testName: 'Lipid Profile',
      category: 'Biochemistry',
      results: [
        { parameter: 'Total Cholesterol', value: '228', unit: 'mg/dL', referenceRange: '<200', isAbnormal: true,  flags: 'H' },
        { parameter: 'LDL',               value: '145', unit: 'mg/dL', referenceRange: '<100', isAbnormal: true,  flags: 'H' },
        { parameter: 'HDL',               value: '38',  unit: 'mg/dL', referenceRange: '>40',  isAbnormal: true,  flags: 'L' },
        { parameter: 'Triglycerides',     value: '195', unit: 'mg/dL', referenceRange: '<150', isAbnormal: true,  flags: 'H' },
      ],
    },
    {
      patient: patientDocs[9]!, // Sunita Desai - Thyroid
      testName: 'Thyroid Function Test (TSH)',
      category: 'Endocrinology',
      results: [
        { parameter: 'TSH',   value: '8.2',  unit: 'µIU/mL', referenceRange: '0.4-4.0', isAbnormal: true,  flags: 'H' },
        { parameter: 'Free T4', value: '0.7', unit: 'ng/dL',  referenceRange: '0.8-1.8', isAbnormal: true,  flags: 'L' },
        { parameter: 'Free T3', value: '2.8', unit: 'pg/mL',  referenceRange: '2.3-4.2', isAbnormal: false },
      ],
    },
    {
      patient: patientDocs[1]!, // Priya Singh - Pregnancy
      testName: 'Anomaly Scan Report',
      category: 'Radiology',
      results: [
        { parameter: 'Gestational Age',   value: '20w 3d', unit: '', referenceRange: '',  isAbnormal: false },
        { parameter: 'Foetal Heart Rate', value: '148',    unit: 'bpm', referenceRange: '110-160', isAbnormal: false },
        { parameter: 'Amniotic Fluid',    value: 'Normal', unit: '', referenceRange: 'Normal', isAbnormal: false },
        { parameter: 'Placenta',          value: 'Posterior, grade 0', unit: '', referenceRange: '', isAbnormal: false },
      ],
    },
    {
      patient: patientDocs[14]!, // Ravi Mehta - Diabetes
      testName: 'HbA1c',
      category: 'Biochemistry',
      results: [
        { parameter: 'HbA1c',           value: '8.4',  unit: '%',     referenceRange: '<7.0', isAbnormal: true, flags: 'H' },
        { parameter: 'Fasting Glucose', value: '192',  unit: 'mg/dL', referenceRange: '70-100', isAbnormal: true, flags: 'H' },
        { parameter: 'Post Meal Glucose', value: '285', unit: 'mg/dL', referenceRange: '<140', isAbnormal: true, flags: 'HH' },
      ],
    },
  ];

  const labReports = await Promise.all(labData.map(async (ld, i) => {
    const labSeq = await nextSeq(clinicId, 'lab');
    const rptDate = new Date(Date.now() - (10 - i * 2) * 24 * 60 * 60 * 1000);
    return LabReport.create({
      clinicId,
      patientId:    ld.patient._id,
      orderedBy:    i < 2 || i === 4 ? doctorGM._id : doctorGY._id,
      reportNumber: `LAB-${pad3(labSeq)}`,
      testName:     ld.testName,
      testCategory: ld.category,
      labName:      'PathCare Diagnostics',
      labAddress:   'Shivaji Nagar, Pune',
      reportDate:   rptDate,
      results:      ld.results,
      status:       'completed',
      interpretation: ld.results.some(r => r.isAbnormal) ? 'Abnormal values noted. Review clinically.' : 'All parameters within normal limits.',
    });
  }));
  console.log(`✅  ${labReports.length} lab reports created.`);

  // ── 9. Summary ─────────────────────────────────────────────────────────────
  const [totalAppts, totalPats, totalInv, totalRx] = await Promise.all([
    Appointment.countDocuments({ clinicId }),
    Patient.countDocuments({ clinicId }),
    Invoice.countDocuments({ clinicId }),
    Prescription.countDocuments({ clinicId }),
  ]);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅  Demo seed complete!\n');
  console.log('📊  Summary');
  console.log(`    Patients:      ${totalPats}`);
  console.log(`    Appointments:  ${totalAppts}`);
  console.log(`    Prescriptions: ${totalRx}`);
  console.log(`    Invoices:      ${totalInv}`);
  console.log(`    Lab Reports:   ${labReports.length}`);
  console.log(`    Pharmacy:      ${drugDocs.length} items`);
  console.log('\n🔐  Login credentials');
  console.log('    Role           Name               Mobile       Password');
  console.log('    ───────────────────────────────────────────────────────────');
  console.log('    SuperAdmin     Super Admin        9800000009   Super@1234');
  console.log('    ClinicAdmin    Meera Kapoor       9800000001   Demo@1234');
  console.log('    Doctor (GM)    Dr. Rajesh Sharma  9800000002   Demo@1234');
  console.log('    Doctor (Gy)    Dr. Priya Nair     9800000003   Demo@1234');
  console.log('    Receptionist   Sunita Patil       9800000004   Demo@1234');
  console.log('    Pharmacist     Anil Kumar         9800000005   Demo@1234');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await disconnectDB();
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
