const pool = require('../config/mysql');

async function findAll() {
    const query = 'SELECT * FROM users'
    const [rows] = await pool.execute(query)
    return rows;
}

async function findById(id) {
    const query = 'SELECT * FROM users WHERE id = ?'
    const [rows] = await pool.execute(query,[id])
    return rows[0] || null;
}

async function create({username, fullname, email}) {
    const query = 'INSERT INTO users(username, fullname, email) VALUES (?,?,?)'
    const [result] = await pool.execute(query,[username, fullname, email])
    return result.insertId;
}

async function remove(id){
    const query = 'DELETE FROM users WHERE id = ?'
    const [result] = await pool.execute(query,[id])
    return result.affectedRows > 0;
}

module.exports = {findAll, findById, create, remove};
