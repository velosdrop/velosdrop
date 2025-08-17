// scripts/migrate-passwords.ts
import { db } from '@/src/db';
import { driversTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { hashSync } from 'bcryptjs';

async function migratePasswords() {
  console.log('Starting password migration...');
  
  const drivers = await db.query.driversTable.findMany();
  
  console.log(`Found ${drivers.length} drivers to process`);
  
  for (const driver of drivers) {
    // Skip if already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    if (driver.password.startsWith('$2a$') || 
        driver.password.startsWith('$2b$') || 
        driver.password.startsWith('$2y$')) {
      console.log(`Driver ${driver.id} already has hashed password - skipping`);
      continue;
    }
    
    console.log(`Migrating password for driver ${driver.id}`);
    
    const hashedPassword = hashSync(driver.password, 10);
    await db.update(driversTable)
      .set({ password: hashedPassword })
      .where(eq(driversTable.id, driver.id));
    
    console.log(`Successfully migrated password for driver ${driver.id}`);
  }
}

migratePasswords()
  .then(() => {
    console.log('Password migration completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });