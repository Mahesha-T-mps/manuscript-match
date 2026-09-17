/**
 * Quick database inspection script
 * Run with: node inspect-database.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  console.log('📊 Database Inspection\n');
  console.log('='.repeat(50));

  try {
    // Count records in each table
    const counts = {
      users: await prisma.user.count(),
      processes: await prisma.process.count(),
      authors: await prisma.author.count(),
      shortlists: await prisma.shortlist.count(),
      activityLogs: await prisma.activityLog.count(),
      userReports: await prisma.userReport.count(),
      databasePermissions: await prisma.databasePermission.count(),
      validationConditions: await prisma.userTypeValidationCondition.count(),
    };

    console.log('\n📈 Table Record Counts:');
    console.log('─'.repeat(50));
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  ${table.padEnd(25)}: ${count}`);
    });

    // Show validation conditions breakdown
    if (counts.validationConditions > 0) {
      console.log('\n🔍 Validation Conditions by User Type:');
      console.log('─'.repeat(50));
      
      const userTypes = ['SPRINGER', 'WILEY', 'F1000', 'DMP', 'AJE RQE', 'T&F'];
      for (const userType of userTypes) {
        const count = await prisma.userTypeValidationCondition.count({
          where: { userType }
        });
        const enabled = await prisma.userTypeValidationCondition.count({
          where: { userType, isEnabled: true }
        });
        console.log(`  ${userType.padEnd(12)}: ${enabled}/${count} enabled`);
      }
    }

    // Show user breakdown
    if (counts.users > 0) {
      console.log('\n👥 Users by Type:');
      console.log('─'.repeat(50));
      
      const userTypes = await prisma.$queryRaw`
        SELECT user_type, COUNT(*) as count 
        FROM users 
        GROUP BY user_type
      `;
      userTypes.forEach(({ user_type, count }) => {
        console.log(`  ${user_type.padEnd(12)}: ${count}`);
      });
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Inspection complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

inspect();
