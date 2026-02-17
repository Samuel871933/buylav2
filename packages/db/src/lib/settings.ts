import { Setting } from '../models/setting.model';

const settingsCache = new Map<string, string>();

export async function getSetting(key: string): Promise<string> {
  if (settingsCache.has(key)) {
    return settingsCache.get(key)!;
  }

  const setting = await Setting.findOne({ where: { key } });
  if (!setting) {
    throw new Error(`Setting "${key}" not found`);
  }

  settingsCache.set(key, setting.value);
  return setting.value;
}

export async function getSettingNumber(key: string): Promise<number> {
  return Number(await getSetting(key));
}

export async function getSettingBoolean(key: string): Promise<boolean> {
  return (await getSetting(key)) === 'true';
}

export async function updateSetting(
  key: string,
  value: string,
  adminId: string,
): Promise<void> {
  const setting = await Setting.findOne({ where: { key } });
  if (!setting) {
    throw new Error(`Setting "${key}" not found`);
  }

  await setting.update({ value, updated_by: adminId });
  settingsCache.delete(key);
}

export function invalidateSettingsCache(): void {
  settingsCache.clear();
}
