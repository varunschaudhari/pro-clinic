import { Schema, model, Document, Types } from 'mongoose';

export interface ICounter extends Document {
  clinicId: Types.ObjectId;
  entity: string; // 'patient' | 'invoice' | 'prescription' | 'lab'
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', required: true },
  entity: { type: String, required: true, trim: true },
  seq: { type: Number, default: 0 },
});

CounterSchema.index({ clinicId: 1, entity: 1 }, { unique: true });

export const Counter = model<ICounter>('Counter', CounterSchema);

/**
 * Atomically increments the sequence counter for a given clinic+entity
 * and returns the new value. Safe under concurrent writes.
 */
export async function nextSeq(clinicId: Types.ObjectId, entity: string): Promise<number> {
  const doc = await Counter.findOneAndUpdate(
    { clinicId, entity },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return doc.seq;
}
