const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');

const prisma = new PrismaClient();

// Function to generate 4 random numbers
function generateRandomNumbers() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Function to create users from a list
async function createUsersFromList(usersList, outputFileName = 'new_users_credentials.csv') {
  try {
    console.log('🔍 Creating users from provided list...');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const createdUsers = [];

    console.log(`📊 Processing ${usersList.length} users...`);

    for (const userData of usersList) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: userData.email }
        });

        if (existingUser) {
          console.log(`⚠️ User already exists: ${userData.email}`);
          skipCount++;
          continue;
        }

        // Generate password using first name + 4 random numbers
        const firstName = userData.name.split(' ')[0];
        const randomNumbers = generateRandomNumbers();
        const password = `${firstName}${randomNumbers}`;

        console.log(`🔐 Creating user: ${userData.email} with password: ${password}`);

        // Hash password with bcrypt
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const user = await prisma.user.create({
          data: {
            email: userData.email,
            passwordHash,
            role: userData.role || 'USER',
            status: 'ACTIVE'
          }
        });

        console.log(`✅ Created user: ${user.email} - ID: ${user.id}`);
        successCount++;

        // Store credentials for output
        createdUsers.push({
          name: userData.name,
          email: userData.email,
          password: password,
          role: userData.role || 'USER'
        });

        // Test password verification
        const isValid = await bcrypt.compare(password, passwordHash);
        if (!isValid) {
          console.log(`❌ Password verification failed for ${userData.email}`);
        }

      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n🎉 User Creation Summary:');
    console.log(`✅ Successfully created: ${successCount} users`);
    console.log(`⚠️ Already existed: ${skipCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log(`📊 Total processed: ${usersList.length} users`);

    if (successCount > 0) {
      console.log('\n📝 Login credentials for newly created users:');
      createdUsers.forEach(user => {
        console.log(`${user.name}: ${user.email} / ${user.password}`);
      });

      // Save credentials to CSV file
      const csvContent = 'Name,Email,Password,Role,Status,Action\n' + 
        createdUsers.map(user => 
          `${user.name},${user.email},${user.password},${user.role},ACTIVE,NEW`
        ).join('\n');
      
      const filePath = `backend/${outputFileName}`;
      fs.writeFileSync(filePath, csvContent);
      console.log(`\n📄 Credentials saved to: ${filePath}`);
    }

    return {
      successCount,
      skipCount,
      errorCount,
      createdUsers
    };

  } catch (error) {
    console.error('❌ Error creating users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export the function for use in other scripts
module.exports = { createUsersFromList, generateRandomNumbers };

// If this script is run directly, you can define users here
if (require.main === module) {
  // Example usage - replace with your actual user list
  const exampleUsers = [
    { name: 'John Doe', email: 'john.doe@example.com', role: 'USER' },
    { name: 'Jane Smith', email: 'jane.smith@example.com', role: 'USER' }
  ];

  console.log('ℹ️ This is a utility script. To use it:');
  console.log('1. Import the createUsersFromList function');
  console.log('2. Pass your user list as an array of objects with name, email, and optional role');
  console.log('3. The script will automatically avoid duplicates and generate secure passwords');
  console.log('\nExample:');
  console.log('const { createUsersFromList } = require("./create-users-from-list");');
  console.log('await createUsersFromList(yourUsersList, "output_filename.csv");');
}