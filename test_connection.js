const axios = require('axios');
axios.get('http://127.0.0.1:5000/api/products/store')
  .then(res => console.log('Success:', res.status))
  .catch(err => console.log('Error:', err.message));
