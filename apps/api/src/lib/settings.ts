import { Setting, AuditLog } from '@buyla/db';

const settingsCache = new Map<string, string>();

export async function getSetting(key: string): Promise<string> {
  if (settingsCache.has(key)) return settingsCache.get(key)!;
  const setting = await Setting.findOne({ where: { key } });
  const value = setting?.value ?? '';
  settingsCache.set(key, value);
  return value;
}

export async function getSettingNumber(key: string): Promise<number> {
  return Number(await getSetting(key));
}

export async function getSettingBoolean(key: string): Promise<boolean> {
  const val = await getSetting(key);
  return val === 'true' || val === '1';
}

export async function updateSetting(key: string, value: string, adminId: string): Promise<void> {
  const old = await getSetting(key);
  await Setting.update({ value, updated_by: adminId }, { where: { key } });
  settingsCache.delete(key);
  await AuditLog.create({
    admin_id: adminId,
    action: 'update',
    entity_type: 'setting',
    entity_id: key,
    old_values: { [key]: old },
    new_values: { [key]: value },
  });
}

export function invalidateSettingsCache(): void {
  settingsCache.clear();
}
