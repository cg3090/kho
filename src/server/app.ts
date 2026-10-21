function hasD1Binding(env?: CloudflareEnv): boolean {
  if (!env || typeof env !== 'object') return false;

  return Object.values(env).some((value: any) => {
    return value && typeof value === 'object' && typeof value.prepare === 'function';
  });
}

function getConfiguredDatabaseUrl(): string {
  return (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim();
}

function shouldPreferSupabase(env?: CloudflareEnv, explicitEngine?: string): boolean {
  if (explicitEngine === 'd1') return false;
  if (explicitEngine === 'supabase') return true;

  const configuredUrl = getConfiguredDatabaseUrl();
  return Boolean(configuredUrl) && !hasD1Binding(env);
}
