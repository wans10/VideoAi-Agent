const databaseUrl = process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error('DATABASE_URL_UNPOOLED or DATABASE_URL is required.');
}

process.env.DATABASE_URL = databaseUrl;

async function main() {
  const {
    ensureAssetSchema,
    ensureBillingSchema,
    ensureEmailSchema,
    ensureMcpSchema,
    ensureMediaLibrarySchema,
  } = await import('../../frontend/src/lib/schema.ts');
  const { getDb } = await import('../../frontend/src/lib/db.ts');

  try {
    await ensureBillingSchema();
    await ensureAssetSchema();
    await ensureMediaLibrarySchema();
    await ensureEmailSchema();
    await ensureMcpSchema();
    console.info('Application base schema is current.');
  } finally {
    await getDb().end();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
