require('dotenv').config();
const express        = require('express');
const cors           = require('cors');
const helmet         = require('helmet');
const morgan         = require('morgan');
const { connectDB }  = require('./database/connection');

const app  = express();
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()),
  methods: ['GET','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(morgan('dev'));

app.get('/',           (_q,r) => r.json({ service:'CubeVision API', version:'1.0.0', status:'running' }));
app.get('/api/health', (_q,r) => r.json({ status:'healthy', algorithm:'Kociemba Two-Phase (JS)' }));

app.use('/api/auth',    require('./routes/auth'));
app.use('/api/upload',  require('./routes/upload'));
app.use('/api/solve',   require('./routes/solve'));
app.use('/api/history', require('./routes/history'));
app.use('/api/stats',   require('./routes/stats'));

app.use((_q,r) => r.status(404).json({ error:'Not found' }));
app.use((e,_q,r,_n) => r.status(500).json({ error: e.message || 'Server error' }));

(async () => {
  await connectDB();
  app.listen(PORT, HOST, () => {
  console.log(`CubeVision API running on http://${HOST}:${PORT}`);
});
})();

module.exports = app;
