import { Types } from 'mongoose';
import { PharmacyItem } from '../models/PharmacyItem.model';
import { StockTransaction } from '../models/StockTransaction.model';
import { ApiError } from '../utils/ApiError';
import type { IPaginatedResponse } from '../types';
import type {
  CreateDrugInput,
  UpdateDrugInput,
  StockInInput,
  StockOutInput,
  DispenseInput,
  ListDrugsInput,
} from '../utils/validators/pharmacy.validator';

export class PharmacyService {
  // ── List ──────────────────────────────────────────────────────────────────

  static async listDrugs(
    clinicId: string,
    params: ListDrugsInput
  ): Promise<IPaginatedResponse<any>> {
    const { search, category, lowStock, page, limit } = params;

    const filter: Record<string, any> = { clinicId: new Types.ObjectId(clinicId), isActive: true };

    if (search) {
      filter.$text = { $search: search };
    }
    if (category) {
      filter.category = category;
    }
    if (lowStock) {
      filter.$expr = { $lte: ['$currentStock', '$reorderLevel'] };
    }

    const [data, total] = await Promise.all([
      PharmacyItem.find(filter)
        .sort(search ? { score: { $meta: 'textScore' } } : { name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean({ virtuals: true }),
      PharmacyItem.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  static async getStats(clinicId: string) {
    const cid = new Types.ObjectId(clinicId);
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [agg] = await PharmacyItem.aggregate([
      { $match: { clinicId: cid, isActive: true, isDeleted: false } },
      {
        $group: {
          _id: null,
          totalDrugs:         { $sum: 1 },
          lowStockCount:      { $sum: { $cond: [{ $lte: ['$currentStock', '$reorderLevel'] }, 1, 0] } },
          outOfStockCount:    { $sum: { $cond: [{ $eq: ['$currentStock', 0] }, 1, 0] } },
          totalInventoryValue:{ $sum: { $multiply: ['$currentStock', '$purchasePrice'] } },
          nearExpiryCount: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: '$batches',
                          as: 'b',
                          cond: { $and: [
                            { $lte: ['$$b.expiryDate', thirtyDaysLater] },
                            { $gt: ['$$b.quantity', 0] },
                          ]},
                        },
                      },
                    },
                    0,
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    return agg ?? {
      totalDrugs: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      totalInventoryValue: 0,
      nearExpiryCount: 0,
    };
  }

  // ── Create ────────────────────────────────────────────────────────────────

  static async createDrug(clinicId: string, input: CreateDrugInput, userId: string) {
    const { initialQuantity, initialBatchNumber, initialExpiryDate, ...fields } = input;

    const drug = new PharmacyItem({
      clinicId: new Types.ObjectId(clinicId),
      ...fields,
      currentStock: initialQuantity ?? 0,
      batches: initialQuantity
        ? [
            {
              batchNumber:   initialBatchNumber ?? 'OPENING',
              expiryDate:    initialExpiryDate ? new Date(initialExpiryDate) : new Date('2099-12-31'),
              purchasePrice: fields.purchasePrice ?? 0,
              mrp:           fields.mrp,
              sellingPrice:  fields.sellingPrice,
              quantity:      initialQuantity,
              purchasedAt:   new Date(),
            },
          ]
        : [],
    });

    await drug.save();

    if (initialQuantity && initialQuantity > 0) {
      await StockTransaction.create({
        clinicId:      new Types.ObjectId(clinicId),
        drugId:        drug._id,
        type:          'purchase',
        quantity:      initialQuantity,
        quantityBefore:0,
        quantityAfter: initialQuantity,
        unitPrice:     fields.purchasePrice,
        batchNumber:   initialBatchNumber,
        expiryDate:    initialExpiryDate ? new Date(initialExpiryDate) : undefined,
        notes:         'Opening stock',
        createdBy:     new Types.ObjectId(userId),
      });
    }

    return drug;
  }

  // ── Get ───────────────────────────────────────────────────────────────────

  static async getDrugById(clinicId: string, id: string): Promise<any> {
    const drug = await PharmacyItem.findOne({
      _id: new Types.ObjectId(id),
      clinicId: new Types.ObjectId(clinicId),
    }).lean({ virtuals: true });

    if (!drug) throw new ApiError(404, 'Drug not found');

    const recentTransactions = await StockTransaction.find({
      clinicId: new Types.ObjectId(clinicId),
      drugId:   new Types.ObjectId(id),
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('createdBy', 'name')
      .lean();

    return { ...drug, recentTransactions };
  }

  // ── Update ────────────────────────────────────────────────────────────────

  static async updateDrug(clinicId: string, id: string, input: UpdateDrugInput) {
    const drug = await PharmacyItem.findOneAndUpdate(
      { _id: new Types.ObjectId(id), clinicId: new Types.ObjectId(clinicId) },
      { $set: input },
      { new: true, runValidators: true }
    );
    if (!drug) throw new ApiError(404, 'Drug not found');
    return drug;
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  static async deleteDrug(clinicId: string, id: string, userId: string) {
    const drug = await PharmacyItem.findOneAndUpdate(
      { _id: new Types.ObjectId(id), clinicId: new Types.ObjectId(clinicId) },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: new Types.ObjectId(userId) } },
      { new: true }
    );
    if (!drug) throw new ApiError(404, 'Drug not found');
  }

  // ── Stock In (purchase / adjustment) ──────────────────────────────────────

  static async stockIn(
    clinicId: string,
    drugId: string,
    input: StockInInput,
    userId: string,
    type: 'purchase' | 'adjustment' | 'return' = 'purchase'
  ) {
    const drug = await PharmacyItem.findOne({
      _id: new Types.ObjectId(drugId),
      clinicId: new Types.ObjectId(clinicId),
    });
    if (!drug) throw new ApiError(404, 'Drug not found');

    const stockBefore = drug.currentStock;
    const stockAfter  = stockBefore + input.quantity;

    // Update fields
    drug.currentStock = stockAfter;
    if (input.sellingPrice != null)  drug.sellingPrice  = input.sellingPrice;
    if (input.mrp != null)           drug.mrp           = input.mrp;
    if (input.purchasePrice != null) drug.purchasePrice = input.purchasePrice;

    // Add batch entry
    if (input.batchNumber) {
      const existingBatch = drug.batches.find((b) => b.batchNumber === input.batchNumber);
      if (existingBatch) {
        existingBatch.quantity += input.quantity;
      } else {
        drug.batches.push({
          batchNumber:   input.batchNumber,
          expiryDate:    input.expiryDate ? new Date(input.expiryDate) : new Date('2099-12-31'),
          purchasePrice: input.purchasePrice ?? drug.purchasePrice,
          mrp:           input.mrp ?? drug.mrp,
          sellingPrice:  input.sellingPrice ?? drug.sellingPrice,
          quantity:      input.quantity,
          purchasedAt:   new Date(),
        } as any);
      }
    }

    await drug.save();

    await StockTransaction.create({
      clinicId:       new Types.ObjectId(clinicId),
      drugId:         new Types.ObjectId(drugId),
      type,
      quantity:       input.quantity,
      quantityBefore: stockBefore,
      quantityAfter:  stockAfter,
      unitPrice:      input.purchasePrice,
      batchNumber:    input.batchNumber,
      expiryDate:     input.expiryDate ? new Date(input.expiryDate) : undefined,
      notes:          input.notes,
      createdBy:      new Types.ObjectId(userId),
    });

    return drug;
  }

  // ── Dispense ──────────────────────────────────────────────────────────────

  static async dispense(clinicId: string, input: DispenseInput, userId: string) {
    const cid = new Types.ObjectId(clinicId);

    // Validate all drugs exist and have sufficient stock
    const drugs = await PharmacyItem.find({
      clinicId: cid,
      _id: { $in: input.items.map((i) => new Types.ObjectId(i.drugId)) },
    });

    const drugMap = new Map(drugs.map((d) => [d._id.toString(), d]));

    for (const item of input.items) {
      const drug = drugMap.get(item.drugId);
      if (!drug) throw new ApiError(404, `Drug ${item.drugId} not found`);
      if (drug.currentStock < item.quantity) {
        throw new ApiError(400, `Insufficient stock for "${drug.name}". Available: ${drug.currentStock}`);
      }
    }

    const transactions = [];

    for (const item of input.items) {
      const drug         = drugMap.get(item.drugId)!;
      const stockBefore  = drug.currentStock;
      const stockAfter   = stockBefore - item.quantity;

      await PharmacyItem.updateOne(
        { _id: drug._id },
        { $inc: { currentStock: -item.quantity } }
      );

      transactions.push({
        clinicId:       cid,
        drugId:         drug._id,
        type:           'dispense',
        quantity:       item.quantity,
        quantityBefore: stockBefore,
        quantityAfter:  stockAfter,
        prescriptionId: input.prescriptionId ? new Types.ObjectId(input.prescriptionId) : undefined,
        patientId:      input.patientId      ? new Types.ObjectId(input.patientId)      : undefined,
        notes:          input.notes,
        createdBy:      new Types.ObjectId(userId),
      });
    }

    await StockTransaction.insertMany(transactions);

    return { dispensed: input.items.length };
  }

  // ── Stock Out (expired / write-off) ──────────────────────────────────────

  static async stockOut(
    clinicId: string,
    drugId: string,
    input: StockOutInput,
    userId: string
  ) {
    const drug = await PharmacyItem.findOne({
      _id: new Types.ObjectId(drugId),
      clinicId: new Types.ObjectId(clinicId),
    });
    if (!drug) throw new ApiError(404, 'Drug not found');

    if (input.quantity > drug.currentStock) {
      throw new ApiError(400, `Insufficient stock — only ${drug.currentStock} available`);
    }

    const stockBefore = drug.currentStock;
    const stockAfter  = stockBefore - input.quantity;

    drug.currentStock = stockAfter;

    // Decrement matching batch if batchNumber provided
    if (input.batchNumber) {
      const batch = drug.batches.find((b) => b.batchNumber === input.batchNumber);
      if (batch) {
        batch.quantity = Math.max(0, batch.quantity - input.quantity);
      }
    }

    await drug.save();

    await StockTransaction.create({
      clinicId:       new Types.ObjectId(clinicId),
      drugId:         new Types.ObjectId(drugId),
      type:           input.type,
      quantity:       input.quantity,
      quantityBefore: stockBefore,
      quantityAfter:  stockAfter,
      batchNumber:    input.batchNumber,
      notes:          input.notes,
      createdBy:      new Types.ObjectId(userId),
    });

    return drug;
  }

  // ── Transaction History (per drug) ───────────────────────────────────────

  static async getTransactions(
    clinicId: string,
    drugId: string,
    params: { page: number; limit: number; type?: string }
  ): Promise<IPaginatedResponse<any>> {
    const { page, limit } = params;
    const filter: Record<string, unknown> = {
      clinicId: new Types.ObjectId(clinicId),
      drugId:   new Types.ObjectId(drugId),
    };
    if (params.type) filter.type = params.type;

    const [data, total] = await Promise.all([
      StockTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'name')
        .lean(),
      StockTransaction.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }

  // ── Global Transaction Ledger (all drugs) ─────────────────────────────────

  static async getAllTransactions(
    clinicId: string,
    params: {
      page: number;
      limit: number;
      type?: string;
      drugId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<IPaginatedResponse<any>> {
    const { page, limit } = params;
    const filter: Record<string, unknown> = { clinicId: new Types.ObjectId(clinicId) };

    if (params.type)   filter.type   = params.type;
    if (params.drugId) filter.drugId = new Types.ObjectId(params.drugId);

    if (params.startDate || params.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (params.startDate) dateFilter.$gte = new Date(`${params.startDate}T00:00:00.000Z`);
      if (params.endDate)   dateFilter.$lte = new Date(`${params.endDate}T23:59:59.999Z`);
      filter.createdAt = dateFilter;
    }

    const [raw, total] = await Promise.all([
      StockTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('drugId', 'name unit')
        .populate('createdBy', 'name')
        .lean(),
      StockTransaction.countDocuments(filter),
    ]);

    const data = raw.map((t: any) => ({
      ...t,
      drug:   t.drugId,
      drugId: t.drugId?._id,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }
}
