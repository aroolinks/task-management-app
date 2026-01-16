const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const equalIndex = line.indexOf('=');
        if (equalIndex > 0) {
          const key = line.substring(0, equalIndex).trim();
          let value = line.substring(equalIndex + 1).trim();
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'taskmanagement';

// Parse CSV line (handles quoted fields with commas)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Parse date in various formats
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Try different date formats
  // Format: DD/MM/YYYY
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Month is 0-indexed
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
  }
  
  // Format: YYYY-MM-DD
  if (dateStr.includes('-')) {
    return new Date(dateStr);
  }
  
  // Try parsing as-is
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

async function importHostingData() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  // Check if CSV file exists
  const csvPath = path.join(__dirname, 'hosting_data.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found: scripts/hosting_data.csv');
    console.log('\n📝 Please create a CSV file with the following format:');
    console.log('Name,Email,Start Date,End Date,Duration (Years),Yearly Price (£),Total Cost (£),Type,Status,Days Until Expiry');
    console.log('Example:');
    console.log('Metalogics,info@metalogics.io,2024-01-01,2025-01-01,1,100,100,Client,Active,365');
    console.log('\nNotes:');
    console.log('- Date format: YYYY-MM-DD or DD/MM/YYYY');
    console.log('- Type: Client or Free');
    console.log('- Yearly Price: numeric value in £');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const collection = db.collection('hostingservices');

    // Read CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.log('❌ CSV file is empty');
      return;
    }

    // Parse header
    const headers = parseCSVLine(lines[0]);
    console.log('📋 CSV Headers:', headers);
    console.log(`📊 Found ${lines.length - 1} records to import\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Process each line (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const values = parseCSVLine(line);
        
        // Map CSV columns: Name,Email,Start Date,End Date,Duration (Years),Yearly Price (£),Total Cost (£),Type,Status,Days Until Expiry
        const companyName = values[0] || '';
        const email = values[1] || '';
        const startDateStr = values[2] || '';
        const endDateStr = values[3] || '';
        const yearlyPrice = values[5] || '0';
        const type = (values[7] || '').toLowerCase();
        const isClientWebsite = type === 'client';
        const isFreeHosting = type === 'free';

        // Validate required fields
        if (!companyName) {
          console.log(`⚠️  Row ${i}: Skipping - missing company name`);
          skipped++;
          continue;
        }

        if (!startDateStr || !endDateStr) {
          console.log(`⚠️  Row ${i}: Skipping ${companyName} - missing dates`);
          skipped++;
          continue;
        }

        if (!email) {
          console.log(`⚠️  Row ${i}: Skipping ${companyName} - missing email`);
          skipped++;
          continue;
        }

        // Parse dates
        const startDate = parseDate(startDateStr);
        const endDate = parseDate(endDateStr);

        if (!startDate || !endDate) {
          console.log(`⚠️  Row ${i}: Skipping ${companyName} - invalid date format`);
          skipped++;
          continue;
        }

        // Calculate status
        const now = new Date();
        const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let status = 'active';
        if (daysUntilExpiry < 0) {
          status = 'expired';
        } else if (daysUntilExpiry <= 30) {
          status = 'expiring_soon';
        }

        // Create hosting service document
        const hostingService = {
          clientName: companyName,
          websiteName: companyName,
          websiteUrl: `https://${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
          hostingProvider: 'Various',
          packageType: isClientWebsite ? 'Client Website' : 'Standard',
          cost: isFreeHosting ? 0 : parseFloat(yearlyPrice) || 0,
          currency: 'GBP',
          billingCycle: 'yearly',
          startDate: startDate,
          endDate: endDate,
          autoRenew: false,
          status: status,
          contactEmail: email,
          notes: isFreeHosting ? 'Free Hosting (No charges)' : '',
          createdBy: 'import_script',
          updatedBy: 'import_script',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Insert into database
        await collection.insertOne(hostingService);
        console.log(`✅ Row ${i}: Imported ${companyName} (${status})`);
        imported++;

      } catch (error) {
        console.error(`❌ Row ${i}: Error -`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`✅ Successfully imported: ${imported}`);
    console.log(`⚠️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📋 Total processed: ${lines.length - 1}`);

    // Show current count
    const totalCount = await collection.countDocuments();
    console.log(`\n📦 Total hosting services in database: ${totalCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the import
console.log('🚀 Starting hosting data import...\n');
importHostingData();
