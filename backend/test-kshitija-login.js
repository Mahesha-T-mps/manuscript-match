const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function testLogin() {
  try {
    console.log('🧪 Testing login for kshitija.bhosekar@aje.com...');
    
    const email = 'kshitija.bhosekar@aje.com';
    const password = 'Kshitija@9283';
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found in database');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Status:', user.status);
    console.log('Role:', user.role);
    
    // Test password verification
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (isPasswordValid) {
      console.log('✅ Password verification: PASS');
      console.log('🎉 Login should work successfully!');
    } else {
      console.log('❌ Password verification: FAIL');
      console.log('🔍 Checking password hash...');
      console.log('Stored hash length:', user.passwordHash.length);
      console.log('Hash starts with:', user.passwordHash.substring(0, 10));
    }
    
  } catch (error) {
    console.error('❌ Error testing login:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();