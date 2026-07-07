const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const USER_TYPES = ['SPRINGER', 'WILEY', 'F1000', 'DMP', 'AJE RQE', 'T&F'];
const DATABASES = ['PubMed', 'TandFonline', 'ScienceDirect', 'WileyLibrary', 'AJE'];

async function initializeDatabasePermissions() {
  try {
    console.log('🔧 Initializing database permissions...\n');

    let created = 0;
    let existing = 0;

    for (const userType of USER_TYPES) {
      for (const database of DATABASES) {
        // AJE database only accessible to AJE RQE by default
        const hasAccess = database === 'AJE' ? userType === 'AJE RQE' : true;

        const permission = await prisma.databasePermission.upsert({
          where: {
            userType_database: {
              userType,
              database
            }
          },
          update: {},
          create: {
            userType,
            database,
            hasAccess
          }
        });

        const action = permission.createdAt.getTime() === permission.updatedAt.getTime() ? 'created' : 'existing';
        if (action === 'created') {
          created++;
          console.log(`✅ Created: ${userType} → ${database} (${hasAccess ? 'Access Granted' : 'Access Denied'})`);
        } else {
          existing++;
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${created} permissions`);
    console.log(`   Existing: ${existing} permissions`);
    console.log(`   Total: ${created + existing} permissions`);

    console.log('\n✨ Database permissions initialized successfully!');
    console.log('\n📋 Default configuration:');
    console.log('   - All user types have access to: PubMed, TandFonline, ScienceDirect, WileyLibrary');
    console.log('   - Only AJE RQE users have access to: AJE database');
    console.log('   - Admins can access all databases (handled in code)');

  } catch (error) {
    console.error('❌ Error initializing database permissions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initializeDatabasePermissions();
