const express = require('express');
const cors = require('cors');
const client = require('./client.js');
const app = express();
const morgan = require('morgan');
const ensureAuth = require('./auth/ensure-auth');
const createAuthRoutes = require('./auth/create-auth-routes');
const request = require('superagent');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev')); // http logging

const authRoutes = createAuthRoutes();

// setup authentication routes to give user an auth token
// creates a /auth/signin and a /auth/signup POST route. 
// each requires a POST body with a .email and a .password
app.use('/auth', authRoutes);

// everything that starts with "/api" below here requires an auth token!
app.use('/api', ensureAuth);

// and now every request that has a token in the Authorization header will have a `req.userId` property for us to see who's talking
// http://makeup-api.herokuapp.com/api/v1/products.json?&product_type=lipstick
app.get('/api/lipsticks', async(req, res) => {
  try {
    
    const lipstick = await request.get('http://makeup-api.herokuapp.com/api/v1/products.json?product_type=lipstick');

    res.json(lipstick.body);
  } catch (e) {

    res.status(500).json({ error: e.message });
  }

});

app.get('/api/favorites', async(req, res) => {
  try {
    const data = await client.query(
      'SELECT * from favorites where owner_id=$1', 
      [req.userId],
    );
    
    res.json(data.rows);
  } catch (e) {
    
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/favorites/:id', async(req, res) => {
  try {
    const data = await client.query(
      'DELETE from favorites where owner_id=$1 AND id=$2', 
      [req.userId, req.params.id],
    );
    
    res.json(data.rows);
  } catch (e) {
    
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/favorites', async(req, res) => {
  try {
    const { 
      image_link,
      brand,
      name,
      product_type,
      description,
      db_id,
    } = req.body;
  
    const data = await client.query(`
    INSERT INTO favorites (
      image_link,
      brand,
      name,
      product_type,
      description,
      db_id,
      owner_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
`,
    [
      image_link,
      brand,
      name,
      product_type,
      description,
      db_id,
      req.userId
    ]);
    
    res.json(data.rows);
  } catch (e) {
    
    res.status(500).json({ error: e.message });
  }
});

app.use(require('./middleware/error'));

module.exports = app; 
