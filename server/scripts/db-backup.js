/**
 * Database Backup Script
 * Run with: node scripts/db-backup.js
 *
 * Creates a backup of the MongoDB database.
 * Backups are stored in /backups directory with timestamp.
 *
 * For automated backups, add to crontab:
 * 0 2 * * * cd /var/www/html/server && node scripts/db-backup.js >> /var/log/baytup-backup.log 2>&1
 */

require('dotenv').config();
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/baytup';
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const MAX_BACKUPS = 7; // Keep last 7 backups (1 week)

// Parse MongoDB URI to get database name
function parseMongoURI(uri) {
  const match = uri.match(/mongodb:\/\/([^/]+)\/([^?]+)/);
  if (match) {
    return {
      host: match[1],
      database: match[2]
    };
  }
  return { host: 'localhost:27017', database: 'baytup' };
}

// Create backup directory if it doesn't exist
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 Created backup directory: ${BACKUP_DIR}`);
  }
}

// Get timestamp for backup filename
function getTimestamp() {
  const now = new Date();
  return now.toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\..+/, '');
}

// Clean old backups, keeping only MAX_BACKUPS most recent
function cleanOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('baytup_backup_') && f.endsWith('.gz'))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(MAX_BACKUPS);
    for (const file of toDelete) {
      fs.unlinkSync(file.path);
      console.log(`🗑️  Deleted old backup: ${file.name}`);
    }
  }
}

// Create backup using mongodump
async function createBackup() {
  const { host, database } = parseMongoURI(MONGODB_URI);
  const timestamp = getTimestamp();
  const backupName = `baytup_backup_${timestamp}`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  console.log('🔧 BAYTUP DATABASE BACKUP');
  console.log('='.repeat(50));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Database: ${database}`);
  console.log(`Host: ${host}`);
  console.log(`Backup path: ${backupPath}`);
  console.log('');

  ensureBackupDir();

  try {
    // Check if mongodump is available
    try {
      execSync('mongodump --version', { stdio: 'pipe' });
    } catch (e) {
      console.error('❌ mongodump not found. Please install MongoDB Database Tools.');
      console.log('   Ubuntu/Debian: sudo apt install mongodb-database-tools');
      console.log('   macOS: brew install mongodb-database-tools');
      console.log('   Windows: Download from https://www.mongodb.com/try/download/database-tools');
      process.exit(1);
    }

    // Create mongodump command
    const dumpCmd = `mongodump --uri="${MONGODB_URI}" --out="${backupPath}" --gzip`;

    console.log('📦 Creating backup...');
    execSync(dumpCmd, { stdio: 'inherit' });

    // Calculate backup size
    const getDirectorySize = (dir) => {
      let size = 0;
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
          size += getDirectorySize(filePath);
        } else {
          size += fs.statSync(filePath).size;
        }
      }
      return size;
    };

    const backupSize = getDirectorySize(backupPath);
    const sizeKB = Math.round(backupSize / 1024);
    const sizeMB = Math.round(sizeKB / 1024 * 10) / 10;

    console.log('');
    console.log(`✅ Backup completed successfully!`);
    console.log(`   Location: ${backupPath}`);
    console.log(`   Size: ${sizeMB > 1 ? sizeMB + ' MB' : sizeKB + ' KB'}`);

    // Clean old backups
    console.log('');
    cleanOldBackups();

    // List current backups
    console.log('');
    console.log('📋 Current backups:');
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('baytup_backup_'))
      .sort()
      .reverse();

    for (const backup of backups) {
      const stat = fs.statSync(path.join(BACKUP_DIR, backup));
      const size = stat.isDirectory()
        ? Math.round(getDirectorySize(path.join(BACKUP_DIR, backup)) / 1024) + ' KB'
        : Math.round(stat.size / 1024) + ' KB';
      console.log(`   - ${backup} (${size})`);
    }

    console.log('');
    console.log('='.repeat(50));
    console.log('✅ BACKUP COMPLETE');

    return backupPath;

  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

// Restore from backup (utility function)
async function restoreBackup(backupPath) {
  const { host, database } = parseMongoURI(MONGODB_URI);

  console.log('⚠️  WARNING: This will overwrite the current database!');
  console.log(`   Database: ${database}`);
  console.log(`   Backup: ${backupPath}`);
  console.log('');

  try {
    const restoreCmd = `mongorestore --uri="${MONGODB_URI}" --drop --gzip "${backupPath}/${database}"`;

    console.log('🔄 Restoring backup...');
    execSync(restoreCmd, { stdio: 'inherit' });

    console.log('');
    console.log('✅ Restore completed successfully!');

  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args[0] === 'restore' && args[1]) {
  restoreBackup(args[1]);
} else if (args[0] === 'list') {
  ensureBackupDir();
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('baytup_backup_'))
    .sort()
    .reverse();

  console.log('📋 Available backups:');
  for (const backup of backups) {
    console.log(`   - ${backup}`);
  }
} else {
  createBackup();
}
