import { sequelize } from './connection';
import './models'; // Load all models + associations

async function migrate() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connection established.');

    console.log('Syncing models...');
    await sequelize.sync({ alter: true });
    console.log('All models synchronized successfully.');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
