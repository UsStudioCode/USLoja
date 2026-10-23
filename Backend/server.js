const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const requiredEnvironment = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY'];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);
if (missingEnvironment.length > 0) {
  throw new Error(`Variáveis obrigatórias em falta: ${missingEnvironment.join(', ')}`);
}

const account = require('./routes/account');
const ai = require('./routes/ai');
const buyers = require('./routes/buyers');
const sellers = require('./routes/sellers');
const workers = require('./routes/workers');
const products = require('./routes/products');
const admins = require('./routes/admins');
const adminpanel = require('./routes/admin-paniel');

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', account);
app.use('/ai', ai)
app.use('/buyers', buyers);
app.use('/sellers', sellers);
app.use('/workers', workers);
app.use('/products', products);
app.use('/admins', admins)
app.use('/admins/painel', adminpanel);

app.use((req, res) => {
  res.status(404).json({ success: false, comment: 'Rota não encontrada.' });
});

app.use((error, req, res, next) => {
  console.error('Erro não tratado no backend:', error);
  if (res.headersSent) return next(error);
  return res.status(500).json({ success: false, comment: 'Erro interno do servidor.' });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server on PORT ${port}`);
});