const db = require('../src/config/db');

async function updateAdmins() {
  try {
    // 1. Remove Maria Santos
    await db.query("DELETE FROM admin_users WHERE email = 'admin@ororuta.ph' OR name = 'Maria Santos'");
    console.log('Removed Maria Santos');

    // 2. Remove moderators & old demo accounts
    await db.query("DELETE FROM admin_users WHERE role = 'Moderator' OR email IN ('ana.villanueva@ororuta.ph', 'rhea.pabayo@cdo-rta.gov.ph', 'customuser@ororuta.ph') OR username = 'customuser'");
    console.log('Removed Moderators & customuser');

    // 3. Upsert Doniel Eunson Ko
    const [existingDoniel] = await db.query("SELECT id FROM admin_users WHERE email = 'deko74415@liceo.edu.ph'");
    if (existingDoniel.length > 0) {
      await db.query(
        "UPDATE admin_users SET name = 'Doniel Eunson Ko', username = 'deko74415', password = 'Ororuta2026', role = 'Super Admin' WHERE email = 'deko74415@liceo.edu.ph'"
      );
      console.log('Updated Doniel Eunson Ko');
    } else {
      await db.query(
        "INSERT INTO admin_users (id, username, email, password, name, role) VALUES ('u-01', 'deko74415', 'deko74415@liceo.edu.ph', 'Ororuta2026', 'Doniel Eunson Ko', 'Super Admin')"
      );
      console.log('Inserted Doniel Eunson Ko');
    }

    // 4. Update route editor to Jed Surabasquez
    const [existingJed] = await db.query("SELECT id FROM admin_users WHERE email = 'jasurabasquez66130@liceo.edu.ph'");
    if (existingJed.length > 0) {
      await db.query(
        "UPDATE admin_users SET name = 'Jed Surabasquez', username = 'jasurabasquez66130', role = 'Route Editor', password = 'Ororuta2026' WHERE email = 'jasurabasquez66130@liceo.edu.ph'"
      );
      console.log('Updated Jed Surabasquez');
    } else {
      const [editorRows] = await db.query("SELECT id FROM admin_users WHERE role = 'Route Editor' OR email = 'jomar.delacruz@ororuta.ph'");
      if (editorRows.length > 0) {
        await db.query(
          "UPDATE admin_users SET name = 'Jed Surabasquez', email = 'jasurabasquez66130@liceo.edu.ph', username = 'jasurabasquez66130', role = 'Route Editor', password = 'Ororuta2026' WHERE id = ?",
          [editorRows[0].id]
        );
        console.log('Updated editor to Jed Surabasquez');
      } else {
        await db.query(
          "INSERT INTO admin_users (id, username, email, password, name, role) VALUES ('u-02', 'jasurabasquez66130', 'jasurabasquez66130@liceo.edu.ph', 'Ororuta2026', 'Jed Surabasquez', 'Route Editor')"
        );
        console.log('Inserted Jed Surabasquez');
      }
    }

    const [after] = await db.query('SELECT id, username, email, name, role FROM admin_users');
    console.log('Final admin_users:', after);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateAdmins();
