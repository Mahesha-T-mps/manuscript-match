/**
 * Database Backup Script
 * Creates a timestamped backup of the SQLite database
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'prisma', 'dev.db');
const BACKUP_DIR = path.join(__dirname, 'prisma', 'backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_PATH = path.join(BACKUP_DIR, `dev.db.backup-${timestamp}.db`);

try {
  // Create backups directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log('✓ Created backups directory');
  }

  // Check if source database exists
  if (!fs.existsSync(DB_PATH)) {
    console.error('✗ Source database not found at:', DB_PATH);
    process.exit(1);
  }

  // Copy database file
  fs.copyFileSync(DB_PATH, BACKUP_PATH);
  console.log('✓ Database backup created successfully!');
  console.log('  Source:', DB_PATH);
  console.log('  Backup:', BACKUP_PATH);
  
  // Get file sizes
  const sourceSize = fs.statSync(DB_PATH).size;
  const backupSize = fs.statSync(BACKUP_PATH).size;
  
  console.log(`  Size: ${(sourceSize / 1024).toFixed(2)} KB`);
  
  if (sourceSize !== backupSize) {
    console.error('✗ WARNING: Backup size does not match source!');
    process.exit(1);
  }
  
  console.log('\n✓ Backup verified successfully!');
} catch (error) {
  console.error('✗ Error creating backup:', error.message);
  process.exit(1);
}
