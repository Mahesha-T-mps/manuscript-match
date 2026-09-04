/**
 * Complete diagnostic for Custom Reports feature
 * Run this to check all components
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function diagnose() {
  console.log('='.repeat(80));
  console.log('CUSTOM REPORTS - COMPLETE DIAGNOSTIC');
  console.log('='.repeat(80));
  console.log('');

  let issuesFound = 0;

  // 1. Check if routes file exists
  console.log('1. Checking if routes file exists...');
  const routesPath = path.join(__dirname, 'src', 'routes', 'reports.ts');
  if (fs.existsSync(routesPath)) {
    console.log('   ✓ routes/reports.ts exists');
  } else {
    console.log('   ✗ routes/reports.ts NOT FOUND');
    issuesFound++;
  }

  // 2. Check if service file exists
  console.log('2. Checking if service file exists...');
  const servicePath = path.join(__dirname, 'src', 'services', 'UserReportService.ts');
  if (fs.existsSync(servicePath)) {
    console.log('   ✓ services/UserReportService.ts exists');
  } else {
    console.log('   ✗ services/UserReportService.ts NOT FOUND');
    issuesFound++;
  }

  // 3. Check if app.ts registers routes
  console.log('3. Checking if routes are registered in app.ts...');
  const appPath = path.join(__dirname, 'src', 'app.ts');
  if (fs.existsSync(appPath)) {
    const appContent = fs.readFileSync(appPath, 'utf8');
    if (appContent.includes('reportRoutes') && appContent.includes('/api/reports')) {
      console.log('   ✓ Routes registered in app.ts');
    } else {
      console.log('   ✗ Routes NOT registered in app.ts');
      issuesFound++;
    }
  } else {
    console.log('   ✗ app.ts not found');
    issuesFound++;
  }

  // 4. Check database connection
  console.log('4. Checking database connection...');
  try {
    await prisma.$connect();
    console.log('   ✓ Database connected');
  } catch (error) {
    console.log('   ✗ Database connection failed:', error.message);
    issuesFound++;
  }

  // 5. Check if user_reports table exists
  console.log('5. Checking if user_reports table exists...');
  try {
    await prisma.userReport.findMany({ take: 1 });
    console.log('   ✓ user_reports table exists');
  } catch (error) {
    console.log('   ✗ user_reports table NOT FOUND');
    console.log('      Run: npx prisma migrate dev');
    issuesFound++;
  }

  // 6. Check for reports in database
  console.log('6. Checking for reports in database...');
  try {
    const reportCount = await prisma.userReport.count();
    if (reportCount > 0) {
      console.log(`   ✓ Found ${reportCount} report(s) in database`);
      
      const reports = await prisma.userReport.findMany();
      reports.forEach((report, i) => {
        console.log(`      Report ${i + 1}: ${report.processTitle}`);
        console.log(`        Recommendations: ${report.recommendationsCount}`);
        console.log(`        Shortlisted: ${report.shortlistedCount}`);
      });
    } else {
      console.log('   ⚠ No reports in database (expected if no shortlists created)');
      console.log('      Run: node add-test-report-data.js');
    }
  } catch (error) {
    console.log('   ✗ Error checking reports:', error.message);
    issuesFound++;
  }

  // 7. Check for processes with authors
  console.log('7. Checking for processes with authors...');
  try {
    const processes = await prisma.process.findMany({
      include: {
        processAuthors: true,
      },
    });

    const processesWithAuthors = processes.filter(p => p.processAuthors.length > 0);
    
    if (processesWithAuthors.length > 0) {
      console.log(`   ✓ Found ${processesWithAuthors.length} process(es) with authors`);
      
      processesWithAuthors.forEach((process, i) => {
        const candidates = process.processAuthors.filter(pa => pa.role === 'CANDIDATE').length;
        const shortlisted = process.processAuthors.filter(pa => pa.role === 'SHORTLISTED').length;
        
        console.log(`      Process ${i + 1}: ${process.title}`);
        console.log(`        CANDIDATE: ${candidates}`);
        console.log(`        SHORTLISTED: ${shortlisted}`);
      });
    } else {
      console.log('   ⚠ No processes with authors found');
      console.log('      Run: node add-test-report-data.js');
    }
  } catch (error) {
    console.log('   ✗ Error checking processes:', error.message);
    issuesFound++;
  }

  // Summary
  console.log('');
  console.log('='.repeat(80));
  console.log('DIAGNOSTIC SUMMARY');
  console.log('='.repeat(80));
  
  if (issuesFound === 0) {
    console.log('✓ All checks passed!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Make sure backend is running: npm run dev');
    console.log('  2. Hard refresh browser: Ctrl+Shift+R');
    console.log('  3. Check browser console (F12) for API errors');
    console.log('  4. Check Network tab for /api/reports/my-reports request');
  } else {
    console.log(`✗ Found ${issuesFound} issue(s)`);
    console.log('');
    console.log('Fix the issues above, then:');
    console.log('  1. Regenerate Prisma client: npx prisma generate');
    console.log('  2. Restart backend: npm run dev');
    console.log('  3. Refresh browser');
  }
  
  console.log('');
  await prisma.$disconnect();
}

diagnose().catch(console.error);
