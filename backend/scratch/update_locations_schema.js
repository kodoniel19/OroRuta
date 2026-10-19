const db = require('../src/config/db');

async function updateSchema() {
  console.log('Changing verificationStatus to VARCHAR temporarily...');
  await db.execute('ALTER TABLE locations MODIFY verificationStatus VARCHAR(50) NOT NULL DEFAULT "NEEDS_VERIFICATION"');
  
  console.log('Normalizing values...');
  await db.execute(
    "UPDATE locations SET verificationStatus = 'NEEDS_VERIFICATION' WHERE verificationStatus NOT IN ('VERIFIED','DATA_REVIEW_REQUIRED')"
  );
  
  console.log('Changing verificationStatus to strict ENUM...');
  await db.execute(
    "ALTER TABLE locations MODIFY verificationStatus ENUM('VERIFIED','NEEDS_VERIFICATION','REJECTED','DATA_REVIEW_REQUIRED') NOT NULL DEFAULT 'NEEDS_VERIFICATION'"
  );
  console.log('Updated verificationStatus enum successfully!');
}

updateSchema()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
