const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Function to generate 4 random numbers
function generateRandomNumbers() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function createMPSUsers() {
  try {
    console.log('🔍 Creating MPS Limited users...');

    // Define all MPS users with email and first name (password will be generated)
    const mpsUsersData = [
      { email: 'shreya.anand@mpslimited.com', firstName: 'Shreya', role: 'USER' },
      { email: 'Karthika.A@mpslimited.com', firstName: 'Karthika', role: 'USER' },
      { email: 'Roshika.salini@mpslimited.com', firstName: 'Roshika', role: 'USER' },
      { email: 'Mahaalaxmi.Venkatesan@mpslimited.com', firstName: 'Mahaalaxmi', role: 'USER' },
      { email: 'Aishwarya.SK@mpslimited.com', firstName: 'Aishwarya', role: 'USER' },
      { email: 'Theerdha.Veena@mpslimited.com', firstName: 'Theerdha', role: 'USER' },
      { email: 'Kanimozhi.G@mps-in.com', firstName: 'Kanimozhi', role: 'USER' },
      { email: 'vignesh.loganathan@mpslimited.com', firstName: 'Vignesh', role: 'USER' },
      { email: 'roshini.b@mpslimited.com', firstName: 'Roshini', role: 'USER' },
      { email: 'Shamini.L@mpslimited.com', firstName: 'Shamini', role: 'USER' },
      { email: 'harsh.maan@mpslimited.com', firstName: 'Harshman', role: 'USER' },
      { email: 'arpita.rawat@mpslimited.com', firstName: 'Arpita', role: 'USER' },
      { email: 'jyoti.jha@mpslimited.com', firstName: 'Jyoti', role: 'USER' },
      { email: 'neha.chauhan@mpslimited.com', firstName: 'Neha', role: 'USER' },
      { email: 'Nivethitha.K@mpslimited.com', firstName: 'Nivethitha', role: 'USER' },
      { email: 'Harshini.E@mpslimited.com', firstName: 'Harshini', role: 'USER' },
      { email: 'Nandhini.K@mps-in.com', firstName: 'Nandhini', role: 'USER' },
      { email: 'Sundarapandian.P@mpslimited.com', firstName: 'Sundarapandian', role: 'USER' },
      { email: 'Monika.K@mpslimited.com', firstName: 'Monika', role: 'USER' },
      { email: 'Namachivayam.D@mpslimited.com', firstName: 'Namachivayam', role: 'USER' },
      { email: 'Dhivyapriya.S@mpslimited.com', firstName: 'Dhivyapriya', role: 'USER' },
      { email: 'Monika.B@mpslimited.com', firstName: 'Monika', role: 'USER' },
      { email: 'Davidson.SP@mpslimited.com', firstName: 'Davidson', role: 'USER' },
      { email: 'Raghavi.R@mpslimited.com', firstName: 'Raghavi', role: 'USER' },
      { email: 'Rajarathinam.A@mpslimited.com', firstName: 'Rajarathinam', role: 'USER' },
      { email: 'Bernice.Shiny@mpslimited.com', firstName: 'Bernice', role: 'USER' },
      { email: 'Harihara.Subramaniam@mpslimited.com', firstName: 'Harihara', role: 'USER' },
      { email: 'Aravindhan.S@mpslimited.com', firstName: 'Aravindhan', role: 'USER' },
      { email: 'Srioviya.J@mpslimited.com', firstName: 'Srioviya', role: 'USER' },
      { email: 'Divya.Dharsa@mpslimited.com', firstName: 'Divya', role: 'USER' },
      { email: 'GiridharKrishna@mpslimited.com', firstName: 'Giridhar', role: 'USER' },
      { email: 'Iman.Thoufic@mpslimited.com', firstName: 'Iman', role: 'USER' },
      { email: 'Gayathri.Rajan@mpslimited.com', firstName: 'Gayathri', role: 'USER' },
      { email: 'Varshini.AS@mpslimited.com', firstName: 'Varshini', role: 'USER' },
      { email: 'Gunasree.S@mpslimited.com', firstName: 'Gunasree', role: 'USER' },
      { email: 'akash.phillip@mpslimited.com', firstName: 'Akash', role: 'USER' },
      { email: 'Kiruthika.s@mpslimited.com', firstName: 'Kiruthika', role: 'USER' },
      { email: 'divyadharshini.t@mpslimited.com', firstName: 'Divyadharshini', role: 'USER' },
      { email: 'pooja.s@mpslimited.com', firstName: 'Pooja', role: 'USER' },
      { email: 'gomathi.manickavelu@mpslimited.com', firstName: 'Gomathi', role: 'USER' },
      { email: 'gunasree.s@mpslimited.com', firstName: 'Gunasree', role: 'USER' },
      { email: 'bhuvaneshwari.r@mpslimited.com', firstName: 'Bhuvaneshwari', role: 'USER' },
      { email: 'kavya.nair@mpslimited.com', firstName: 'Kavya', role: 'USER' },
      { email: 'deebika.d@mpslimited.com', firstName: 'Deebika', role: 'USER' },
      { email: 'sangeetha.kaliyamoorthy@mpslimited.com', firstName: 'Sangeetha', role: 'USER' },
      { email: 'b.balan@mpslimited.com', firstName: 'Aswin', role: 'USER' },
      { email: 'Suriya.Prakash@mpslimited.com', firstName: 'Suriya', role: 'USER' },
      { email: 'durga.nandhini@mpslimited.com', firstName: 'Durga', role: 'USER' },
      { email: 'ThaseenaBegum@mpslimited.com', firstName: 'Thaseena', role: 'USER' },
      { email: 'sakthi.e@mpslimited.com', firstName: 'Sakthi', role: 'USER' },
      { email: 'kavin@mpslimited.com', firstName: 'Kavin', role: 'USER' },
      { email: 'sneha.s@mpslimited.com', firstName: 'Sneha', role: 'USER' },
      { email: 'Anurithi.B@mpslimited.com', firstName: 'Anurithi', role: 'USER' },
      // New users
      { email: 'kaviya.s@mpslimited.com', firstName: 'Kaviya', role: 'USER' },
      { email: 'vinuchakkaravarthy.t@mpslimited.com', firstName: 'Vinuchakkaravarthy', role: 'USER' },
      { email: 'christy.anitha@mpslimited.com', firstName: 'Christy', role: 'USER' }
    ];

    // Generate passwords with 4 random numbers for each user
    const mpsUsers = mpsUsersData.map(user => ({
      ...user,
      password: `${user.firstName}${generateRandomNumbers()}`
    }));

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    console.log(`📊 Processing ${mpsUsers.length} users...`);

    for (const userData of mpsUsers) {
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

        console.log(`🔐 Creating user: ${userData.email}`);

        // Hash password with bcrypt
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(userData.password, saltRounds);

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

        // Test password verification
        const isValid = await bcrypt.compare(userData.password, passwordHash);
        if (!isValid) {
          console.log(`❌ Password verification failed for ${userData.email}`);
        }

      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n🎉 MPS Users Creation Summary:');
    console.log(`✅ Successfully created: ${successCount} users`);
    console.log(`⚠️ Already existed: ${skipCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log(`📊 Total processed: ${mpsUsers.length} users`);

    if (successCount > 0) {
      console.log('\n📝 Sample login credentials (Password format: FirstName + 4 random numbers):');
      console.log('Example formats:');
      console.log('shreya.anand@mpslimited.com / Shreya1234');
      console.log('Karthika.A@mpslimited.com / Karthika5678');
      console.log('vignesh.loganathan@mpslimited.com / Vignesh9012');
      console.log('... passwords are randomly generated for each user');
      
      console.log('\n📄 For complete credentials list, refer to: updated_mps_credentials.csv');
    }

  } catch (error) {
    console.error('❌ Error creating MPS users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMPSUsers();