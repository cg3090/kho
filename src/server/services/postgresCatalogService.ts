import { Prisma, type PrismaClient } from '@prisma/client';

type CatalogKey = 'categories' | 'uoms' | 'warehouses' | 'suppliers' | 'customers';
const catalogKeys = new Set<CatalogKey>(['categories', 'uoms', 'warehouses', 'suppliers', 'customers']);

const validText = (value: unknown, max = 255) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;

export class CatalogValidationError extends Error {}

/**
 * Safely apply a catalog snapshot. Existing records cannot be implicitly deleted.
 * Updates are serialized; the JSON mirror is committed in the same transaction.
 */
export async function savePostgresCatalog(db: PrismaClient, key: string, value: unknown) {
  if (!catalogKeys.has(key as CatalogKey)) {
    throw new CatalogValidationError('Collection chưa được hỗ trợ ghi bằng PostgreSQL');
  }
  if (!Array.isArray(value) || value.length > 10000) {
    throw new CatalogValidationError('Collection phải là danh sách hợp lệ');
  }
  const records = value as Array<Record<string, unknown>>;
  const identifiers = records.map(x => x?.id);
  if (identifiers.some(x => !validText(x, 50)) ||
      new Set(identifiers).size !== identifiers.length ||
      records.some(x => !validText(x.name, key === 'uoms' ? 50 : 255))) {
    throw new CatalogValidationError('Thiếu ID/Tên hoặc ID bị trùng lặp');
  }
  if (key === 'suppliers' || key === 'customers') {
    if (records.some(x => x.taxCode !== undefined && typeof x.taxCode !== 'string')) {
      throw new CatalogValidationError('Mã số thuế không hợp lệ');
    }
  }
  return db.$transaction(async tx => {
    const existing =
      key === 'categories' ? await tx.category.findMany({ select: { id: true } }) :
      key === 'uoms' ? await tx.uom.findMany({ select: { id: true } }) :
      key === 'warehouses' ? await tx.warehouse.findMany({ select: { id: true } }) :
      key === 'suppliers' ? await tx.supplier.findMany({ select: { id: true } }) :
      await tx.customer.findMany({ select: { id: true } });
    const incoming = new Set(identifiers);
    if (existing.some(x => !incoming.has(x.id))) {
      throw new CatalogValidationError('Xóa danh mục qua đồng bộ toàn bộ chưa được hỗ trợ; không xóa dữ liệu hiện có');
    }
    for (const row of records) {
      const id = String(row.id), name = String(row.name);
      if (key === 'categories') {
        const data = { name, description: typeof row.description === 'string' ? row.description : null };
        await tx.category.upsert({ where: { id }, update: data, create: { id, ...data } });
      } else if (key === 'uoms') {
        await tx.uom.upsert({ where: { id }, update: { name }, create: { id, name } });
      } else if (key === 'warehouses') {
        const data = { name, location: typeof row.location === 'string' ? row.location : null };
        await tx.warehouse.upsert({ where: { id }, update: data, create: { id, ...data } });
      } else if (key === 'suppliers') {
        const data = {
          name, taxCode: typeof row.taxCode === 'string' ? row.taxCode : '',
          phone: typeof row.phone === 'string' ? row.phone : null,
          address: typeof row.address === 'string' ? row.address : null,
        };
        await tx.supplier.upsert({ where: { id }, update: data, create: { id, ...data } });
      } else {
        const data = {
          name, taxCode: typeof row.taxCode === 'string' ? row.taxCode : '',
          phone: typeof row.phone === 'string' ? row.phone : null,
          address: typeof row.address === 'string' ? row.address : null,
        };
        await tx.customer.upsert({ where: { id }, update: data, create: { id, ...data } });
      }
    }
    await tx.erpCollection.upsert({
      where: { key },
      create: { key, data: value as Prisma.InputJsonValue, payload: value as Prisma.InputJsonValue },
      update: { data: value as Prisma.InputJsonValue, payload: value as Prisma.InputJsonValue, updatedAt: new Date() },
    });
    return { success: true, engine: 'supabase', key, count: records.length };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 20000 });
}
