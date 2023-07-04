const mysql = require('mysql')

// const connection = mysql.createConnection({
//     host: 'localhost',
//     user: 'root',
//     password: '',
//     database : 'blog'
// });

const connection = mysql.createConnection({
    host: 'srv685.hstgr.io',
    user: 'u417213122_preetam',
    password: 'd@23zAGeP9@',
    database : 'u417213122_blog'
});

module.exports = connection;