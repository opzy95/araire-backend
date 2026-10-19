require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app');

const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error('MONGODB_URI must be configured');
}
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured');
}

mongoose
  .connect(mongoUri)
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  });