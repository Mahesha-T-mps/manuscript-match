const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const testUsers = [
  {
    name: 'Springer Test User',
    email: 'springer.test@example.com',
    password: 'password123',
    role: 'USER',
    userType: 'SPRINGER'
  },
  {
    name: 'Wiley Test User',
    email: 'wiley.test@example.com',
    password: 'password123',
    role: 'USER',
    userType: 'WILEY'
  },
  {
    name: 'F1000 Test User',
    email: 'f1000.test@example.com',
    password: 'password123',
    role: 'USER',
    userType: 'F1000'
  },
  {
    name: 'DMP Test User',
    email: 'dmp.test@example.com',
    password: 'password123',
    role: 'USER',
    userType: 'DMP'
  },
  {
    name: 'Springer Admin',
    email: 'springer.admin@example.com',
    password: 'admin123',
    role: 'ADMIN',
    userType: 'SPRINGER'
  }
];

async function createTestUsers() {
  try {
    console.log('Creating test users with user types...');
    
    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      
      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
        continue;
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          passwordHash: hashedPassword,
          role: userData.role,
          userType: userData.userType
        }
      });
      
      console.log(`✓ Created user: ${user.email} (${user.userType})`);
    }
    
    console.log('\n🎉 All test users created successfully!');
    console.log('\nTest User Credentials:');
    console.log('======================');
    testUsers.forEach(user => {
      console.log(`${user.userType}: ${user.email} / ${user.password}`);
    });
    
  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();