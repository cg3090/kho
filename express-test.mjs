import express from 'express';
const app = express();

// Test 1: anchored regexp
app.use(/^\/api\//, (req, res, next) => {
  console.log('T1 matched:', req.path);
  next();
});
// Test 2: string prefix
app.use('/api/db', (req, res, next) => {
  console.log('T2 matched:', req.path);
  next();
});
app.get('/api/db/state', (req, res) => res.json({ ok: true }));
app.listen(3099, () => console.log('test server on 3099'));
