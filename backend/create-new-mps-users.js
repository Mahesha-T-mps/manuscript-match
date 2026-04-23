const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createNewMPSUsers() {
  try {
    console.log('🔍 Creating new MPS users...');

    // Define the new MPS users with name, email, password, and role
    const newMPSUsers = [
      { name: 'Sakshi Jha', email: 'sakshi.jha@mpslimited.com', password: 'Sakshi@7429', role: 'USER' },
      { name: 'Sulekha Rani', email: 'sulekha.rani@mpslimited.com', password: 'Sulekha@3816', role: 'USER' },
      { name: 'Nandhini K', email: 'nandhini.k@mpslimited.com', password: 'Nandhini@9274', role: 'USER' },
      { name: 'Monika B', email: 'davidson.sp@mpslimited.com', password: 'Monika@5683', role: 'USER' },
      { name: 'Raghavi T R', email: 'raghavi.r@mpslimited.com', password: 'Raghavi@1947', role: 'USER' },
      { name: 'Hariharan Subramaniam', email: 'Harihara.Subramaniam@mpslimited.com', password: 'Hariharan@8352', role: 'USER' },
      { name: 'Bernice Shiney', email: 'bernice.shiny@mpslimited.com', password: 'Bernice@4761', role: 'USER' },
      { name: 'Rajarathinam A', email: 'rajarathinam.a@mpslimited.com', password: 'Rajarathinam@2895', role: 'USER' },
      { name: 'Gayathri R', email: 'gayathri.rajan@mpslimited.com', password: 'Gayathri@6174', role: 'USER' },
      { name: 'Divya Dharshini T', email: 'divyadharshini.t@mpslimited.com', password: 'Divya@3528', role: 'USER' },
      { name: 'Pooja S', email: 'pooja.s@mpslimited.com', password: 'Pooja@9146', role: 'USER' },
      { name: 'Gomathi Manickavelu', email: 'gomathi.manickavelu@mpslimited.com', password: 'Gomathi@7283', role: 'USER' },
      { name: 'Thaseena Begum', email: 'thaseenabegum@mpslimited.com', password: 'Thaseena@4957', role: 'USER' },
      { name: 'Tejashree A D', email: 'Tejashree.AD@mpslimited.com', password: 'Tejashree@8361', role: 'USER' },
      { name: 'Aishwarya', email: 'aishwarya.j@mps-in.com', password: 'Aishwarya@5729', role: 'USER' },
      { name: 'Amritii', email: 'ik.amritii@mpslimited.com', password: 'Amritii@1846', role: 'USER' },
      { name: 'Catherine', email: 'angelin.catherinej@mpslimited.com', password: 'Catherine@9573', role: 'USER' },
      { name: 'Deepika', email: 'deepika.sukumaran@mpslimited.com', password: 'Deepika@2418', role: 'USER' },
      { name: 'Dhanushkanna', email: 'dhanushkanna@mpslimited.com', password: 'Dhanushkanna@7695', role: 'USER' },
      { name: 'Evanjaline', email: 'evanjaline.j@mps-in.com', password: 'Evanjaline@3842', role: 'USER' },
      { name: 'Gnanaprasuna', email: 'gnanaprasuna.s@mpslimited.com', password: 'Gnanaprasuna@6157', role: 'USER' },
      { name: 'Jayapriya', email: 'jayapriya.s@mpslimited.com', password: 'Jayapriya@4928', role: 'USER' },
      { name: 'Jerryvin', email: 'jerryvin.p@mpslimited.com', password: 'Jerryvin@8374', role: 'USER' },
      { name: 'Jessica', email: 'arockia.jessica@mpslimited.com', password: 'Jessica@1659', role: 'USER' },
      { name: 'Johannah', email: 'JohannahNitisha@mpslimited.com', password: 'Johannah@5283', role: 'USER' },
      { name: 'Jothiswaroobini', email: 'jothiswaroobini@mpslimited.com', password: 'Jothiswaroobini@7946', role: 'USER' },
      { name: 'Krishna Priya', email: 'krishnapriya.m@mpslimited.com', password: 'Krishna@3571', role: 'USER' },
      { name: 'Lavanya', email: 'lavanya.r@mpslimited.com', password: 'Lavanya@8194', role: 'USER' },
      { name: 'Liyansi', email: 'liyansilucy@mpslimited.com', password: 'Liyansi@2467', role: 'USER' },
      { name: 'Malarvizhi', email: 'malarvizhi.r@mpslimited.com', password: 'Malarvizhi@6835', role: 'USER' },
      { name: 'Malini', email: 'malini.g@mpslimited.com', password: 'Malini@4172', role: 'USER' },
      { name: 'Menarine', email: 'menarine.r@mpslimited.com', password: 'Menarine@9548', role: 'USER' },
      { name: 'Meshila', email: 'ma.meshila@mpslimited.com', password: 'Meshila@7263', role: 'USER' },
      { name: 'Mohanapriya', email: 'mohanapriya.d@mpslimited.com', password: 'Mohanapriya@3819', role: 'USER' },
      { name: 'Nandhini S', email: 'nandhini.sathiyamurthy@mpslimited.com', password: 'Nandhini@5674', role: 'USER' },
      { name: 'Niranjana', email: 'niranjana.v@mpslimited.com', password: 'Niranjana@1928', role: 'USER' },
      { name: 'Poojitha', email: 'kami.poojitha@mpslimited.com', password: 'Poojitha@8456', role: 'USER' },
      { name: 'Sakthivel', email: 'sakthivel.m@mpslimited.com', password: 'Sakthivel@2739', role: 'USER' },
      { name: 'Saritha', email: 'saritha.m@mpslimited.com', password: 'Saritha@6184', role: 'USER' },
      { name: 'Srimaghi', email: 'srimaghi.c@mpslimited.com', password: 'Srimaghi@4527', role: 'USER' },
      { name: 'Surya', email: 'surya.radhakrishnan@mpslimited.com', password: 'Surya@9361', role: 'USER' },
      { name: 'Tamil Bharathi', email: 'tamilbharathi.p@mpslimited.com', password: 'Tamil@7845', role: 'USER' },
      { name: 'Vijayalakshmi', email: 'vijayalakshmi.r@mpslimited.com', password: 'Vijayalakshmi3049', role: 'USER' }
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
        const password = userData.password;

        console.log(`🔐 Creating user: ${userData.email} with password: ${password}`);

        // Hash password with bcrypt
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const user = await prisma.user.create({
          data: {
            email: userData.email,
            passwordHash,
            role: userData.role,
            status: 'ACTIVE'
          }
        });

        console.log(`✅ Created user: ${user.email} - ID: ${user.id}`);
        successCount++;

        createdUsers.push({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          role: userData.role
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
          `${user.name},${user.email},${user.password},${user.role},ACTIVE,NEW`
        ).join('\n');
      
      fs.writeFileSync('backend/new_mps_users_credentials1.csv', csvContent);
      console.log('\n📄 Credentials saved to: backend/new_mps_users_credentials.csv');
    }

  } catch (error) {
    console.error('❌ Error creating new MPS users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createNewMPSUsers();