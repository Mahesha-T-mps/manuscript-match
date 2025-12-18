const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Function to generate 4 random numbers
function generateRandomNumbers() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function updateMPSPasswords() {
  try {
    console.log('🔄 Updating MPS user passwords and adding new users...');

    // Define existing users with new password format (FirstName + 4 random numbers)
    const existingUsers = [
      { email: 'shreya.anand@mpslimited.com', firstName: 'Shreya' },
      { email: 'Karthika.A@mpslimited.com', firstName: 'Karthika' },
      { email: 'Roshika.salini@mpslimited.com', firstName: 'Roshika' },
      { email: 'Mahaalaxmi.Venkatesan@mpslimited.com', firstName: 'Mahaalaxmi' },
      { email: 'Aishwarya.SK@mpslimited.com', firstName: 'Aishwarya' },
      { email: 'Theerdha.Veena@mpslimited.com', firstName: 'Theerdha' },
      { email: 'Kanimozhi.G@mps-in.com', firstName: 'Kanimozhi' },
      { email: 'vignesh.loganathan@mpslimited.com', firstName: 'Vignesh' },
      { email: 'roshini.b@mpslimited.com', firstName: 'Roshini' },
      { email: 'Shamini.L@mpslimited.com', firstName: 'Shamini' },
      { email: 'harsh.maan@mpslimited.com', firstName: 'Harshman' },
      { email: 'arpita.rawat@mpslimited.com', firstName: 'Arpita' },
      { email: 'jyoti.jha@mpslimited.com', firstName: 'Jyoti' },
      { email: 'neha.chauhan@mpslimited.com', firstName: 'Neha' },
      { email: 'Nivethitha.K@mpslimited.com', firstName: 'Nivethitha' },
      { email: 'Harshini.E@mpslimited.com', firstName: 'Harshini' },
      { email: 'Nandhini.K@mps-in.com', firstName: 'Nandhini' },
      { email: 'Sundarapandian.P@mpslimited.com', firstName: 'Sundarapandian' },
      { email: 'Monika.K@mpslimited.com', firstName: 'Monika' },
      { email: 'Namachivayam.D@mpslimited.com', firstName: 'Namachivayam' },
      { email: 'Dhivyapriya.S@mpslimited.com', firstName: 'Dhivyapriya' },
      { email: 'Monika.B@mpslimited.com', firstName: 'Monika' },
      { email: 'Davidson.SP@mpslimited.com', firstName: 'Davidson' },
      { email: 'Raghavi.R@mpslimited.com', firstName: 'Raghavi' },
      { email: 'Rajarathinam.A@mpslimited.com', firstName: 'Rajarathinam' },
      { email: 'Bernice.Shiny@mpslimited.com', firstName: 'Bernice' },
      { email: 'Harihara.Subramaniam@mpslimited.com', firstName: 'Harihara' },
      { email: 'Aravindhan.S@mpslimited.com', firstName: 'Aravindhan' },
      { email: 'Srioviya.J@mpslimited.com', firstName: 'Srioviya' },
      { email: 'Divya.Dharsa@mpslimited.com', firstName: 'Divya' },
      { email: 'GiridharKrishna@mpslimited.com', firstName: 'Giridhar' },
      { email: 'Iman.Thoufic@mpslimited.com', firstName: 'Iman' },
      { email: 'Gayathri.Rajan@mpslimited.com', firstName: 'Gayathri' },
      { email: 'Varshini.AS@mpslimited.com', firstName: 'Varshini' },
      { email: 'Gunasree.S@mpslimited.com', firstName: 'Gunasree' },
      { email: 'akash.phillip@mpslimited.com', firstName: 'Akash' },
      { email: 'Kiruthika.s@mpslimited.com', firstName: 'Kiruthika' },
      { email: 'divyadharshini.t@mpslimited.com', firstName: 'Divyadharshini' },
      { email: 'pooja.s@mpslimited.com', firstName: 'Pooja' },
      { email: 'gomathi.manickavelu@mpslimited.com', firstName: 'Gomathi' },
      { email: 'gunasree.s@mpslimited.com', firstName: 'Gunasree' },
      { email: 'bhuvaneshwari.r@mpslimited.com', firstName: 'Bhuvaneshwari' },
      { email: 'kavya.nair@mpslimited.com', firstName: 'Kavya' },
      { email: 'deebika.d@mpslimited.com', firstName: 'Deebika' },
      { email: 'sangeetha.kaliyamoorthy@mpslimited.com', firstName: 'Sangeetha' },
      { email: 'b.balan@mpslimited.com', firstName: 'Aswin' },
      { email: 'Suriya.Prakash@mpslimited.com', firstName: 'Suriya' },
      { email: 'durga.nandhini@mpslimited.com', firstName: 'Durga' },
      { email: 'ThaseenaBegum@mpslimited.com', firstName: 'Thaseena' },
      { email: 'sakthi.e@mpslimited.com', firstName: 'Sakthi' },
      { email: 'kavin@mpslimited.com', firstName: 'Kavin' },
      { email: 'sneha.s@mpslimited.com', firstName: 'Sneha' },
      { email: 'Anurithi.B@mpslimited.com', firstName: 'Anurithi' }
    ];

    // New users to add
    const newUsers = [
      { email: 'kaviya.s@mpslimited.com', firstName: 'Kaviya' },
      { email: 'vinuchakkaravarthy.t@mpslimited.com', firstName: 'Vinuchakkaravarthy' },
      { email: 'christy.anitha@mpslimited.com', firstName: 'Christy' }
    ];

    const updatedCredentials = [];
    let updateCount = 0;
    let createCount = 0;
    let errorCount = 0;

    // Update existing users' passwords
    console.log('🔄 Updating existing user passwords...');
    for (const userData of existingUsers) {
      try {
        const randomNumbers = generateRandomNumbers();
        const newPassword = `${userData.firstName}${randomNumbers}`;
        
        // Hash the new password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update the user's password
        const updatedUser = await prisma.user.update({
          where: { email: userData.email },
          data: { passwordHash }
        });

        console.log(`✅ Updated password for: ${userData.email} -> ${newPassword}`);
        updatedCredentials.push({
          email: userData.email,
          password: newPassword,
          action: 'UPDATED'
        });
        updateCount++;

      } catch (error) {
        console.error(`❌ Error updating ${userData.email}:`, error.message);
        errorCount++;
      }
    }

    // Create new users
    console.log('\n🆕 Creating new users...');
    for (const userData of newUsers) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: userData.email }
        });

        if (existingUser) {
          console.log(`⚠️ User already exists: ${userData.email}`);
          continue;
        }

        const randomNumbers = generateRandomNumbers();
        const newPassword = `${userData.firstName}${randomNumbers}`;
        
        // Hash the password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // Create the new user
        const newUser = await prisma.user.create({
          data: {
            email: userData.email,
            passwordHash,
            role: 'USER',
            status: 'ACTIVE'
          }
        });

        console.log(`✅ Created new user: ${userData.email} -> ${newPassword}`);
        updatedCredentials.push({
          email: userData.email,
          password: newPassword,
          action: 'CREATED'
        });
        createCount++;

      } catch (error) {
        console.error(`❌ Error creating ${userData.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n🎉 Password Update Summary:');
    console.log(`🔄 Passwords updated: ${updateCount} users`);
    console.log(`🆕 New users created: ${createCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log(`📊 Total processed: ${existingUsers.length + newUsers.length} users`);

    // Save all credentials to a file for reference
    const credentialsData = updatedCredentials.map(cred => 
      `${cred.email},${cred.password},${cred.action}`
    ).join('\n');
    
    const fs = require('fs');
    const header = 'Email,Password,Action\n';
    fs.writeFileSync('updated_mps_credentials.csv', header + credentialsData);
    
    console.log('\n📄 All updated credentials saved to: updated_mps_credentials.csv');

  } catch (error) {
    console.error('❌ Error updating MPS passwords:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateMPSPasswords();