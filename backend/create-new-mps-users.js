const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Function to generate 4 random numbers
function generateRandomNumbers() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function createNewMPSUsers() {
  try {
    console.log('🔍 Creating new MPS users...');

    // Define the new MPS users from the provided list
    const newMPSUsers = [
      { name: 'Sakshi Jha', email: 'sakshi.jha@mpslimited.com' },
      { name: 'Sulekha Rani', email: 'sulekha.rani@mpslimited.com' },
      { name: 'Nandhini K', email: 'nandhini.k@mpslimited.com' },
      { name: 'Monika B', email: 'davidson.sp@mpslimited.com' }, // Note: email seems mismatched with name
      { name: 'Raghavi T R', email: 'raghavi.r@mpslimited.com' },
      { name: 'Hariharan Subramaniam', email: 'Harihara.Subramaniam@mpslimited.com' },
      { name: 'Bernice Shiney', email: 'bernice.shiny@mpslimited.com' },
      { name: 'Rajarathinam A', email: 'rajarathinam.a@mpslimited.com' },
      { name: 'Gayathri R', email: 'gayathri.rajan@mpslimited.com' },
      { name: 'Divya Dharshini T', email: 'divyadharshini.t@mpslimited.com' },
      { name: 'Pooja S', email: 'pooja.s@mpslimited.com' },
      { name: 'Gomathi Manickavelu', email: 'gomathi.manickavelu@mpslimited.com' },
      { name: 'Thaseena Begum', email: 'thaseenabegum@mpslimited.com' },
      { name: 'Tejashree A D', email: 'Tejashree.AD@mpslimited.com' },
      { name: 'Aishwarya', email: 'aishwarya.j@mps-in.com' },
      { name: 'Amritii', email: 'k.amritii@mpslimited.com' },
      { name: 'Catherine', email: 'angelin.catherinej@mpslimited.com' },
      { name: 'Deepika', email: 'deepika.sukumaran@mpslimited.com' },
      { name: 'Dhanushkanna', email: 'dhanushkanna@mpslimited.com' },
      { name: 'Evanjaline', email: 'evanjaline.j@mps-in.com' },
      { name: 'Gnanaprasuna', email: 'gnanaprasuna.s@mpslimited.com' },
      { name: 'Jayapriya', email: 'jayapriya.s@mpslimited.com' },
      { name: 'Jerryvin', email: 'jerryvin.p@mpslimited.com' },
      { name: 'Jessica', email: 'arockia.jessica@mpslimited.com' },
      { name: 'Johannah', email: 'JohannahNitisha@mpslimited.com' },
      { name: 'Jothiswaroobini', email: 'jothiswaroobini@mpslimited.com' },
      { name: 'Krishna Priya', email: 'krishnapriya.m@mpslimited.com' },
      { name: 'Lavanya', email: 'lavanya.r@mpslimited.com' },
      { name: 'Liyansi', email: 'liyansilucy@mpslimited.com' },
      { name: 'Malarvizhi', email: 'malarvizhi.r@mpslimited.com' },
      { name: 'Malini', email: 'malini.g@mpslimited.com' },
      { name: 'Menarine', email: 'menarine.r@mpslimited.com' },
      { name: 'Meshila', email: 'ma.meshila@mpslimited.com' },
      { name: 'Mohanapriya', email: 'mohanapriya.d@mpslimited.com' },
      { name: 'Nandhini S', email: 'nandhini.sathiyamurthy@mpslimited.com' },
      { name: 'Niranjana', email: 'niranjana.v@mpslimited.com' },
      { name: 'Poojitha', email: 'kami.poojitha@mpslimited.com' },
      { name: 'Sakthivel', email: 'sakthivel.m@mpslimited.com' },
      { name: 'Saritha', email: 'saritha.m@mpslimited.com' },
      { name: 'Srimaghi', email: 'srimaghi.c@mpslimited.com' },
      { name: 'Surya', email: 'surya.radhakrishnan@mpslimited.com' },
      { name: 'Tamil Bharathi', email: 'tamilbharathi.p@mpslimited.com' },
      { name: 'Vijayalakshmi', email: 'vijayalakshmi.r@mpslimited.com' }
    ];

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const createdUsers = [];

    console.log(`📊 Processing ${newMPSUsers.length} new MPS users...`);

    for (const userData of newMPSUsers) {
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
            role: 'USER',
            status: 'ACTIVE'
          }
        });

        console.log(`✅ Created user: ${user.email} - ID: ${user.id}`);
        successCount++;

        // Store credentials for output
        createdUsers.push({
          name: userData.name,
          email: userData.email,
          password: password
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

    console.log('\n🎉 New MPS Users Creation Summary:');
    console.log(`✅ Successfully created: ${successCount} users`);
    console.log(`⚠️ Already existed: ${skipCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log(`📊 Total processed: ${newMPSUsers.length} users`);

    if (successCount > 0) {
      console.log('\n📝 Login credentials for newly created users:');
      createdUsers.forEach(user => {
        console.log(`${user.name}: ${user.email} / ${user.password}`);
      });

      // Save credentials to CSV file
      const fs = require('fs');
      const csvContent = 'Name,Email,Password,Role,Status,Action\n' + 
        createdUsers.map(user => 
          `${user.name},${user.email},${user.password},USER,ACTIVE,NEW`
        ).join('\n');
      
      fs.writeFileSync('backend/new_mps_users_credentials.csv', csvContent);
      console.log('\n📄 Credentials saved to: backend/new_mps_users_credentials.csv');
    }

  } catch (error) {
    console.error('❌ Error creating new MPS users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createNewMPSUsers();