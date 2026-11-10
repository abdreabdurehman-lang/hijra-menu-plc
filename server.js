const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload({ createParentPath: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const db = new sqlite3.Database('./menu.db', (err) => {
    if (err) console.error("Database error:", err.message);
    else console.log("Connected to SQLite Database.");
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS menu (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        description TEXT,
        image_url TEXT,
        is_featured INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        restaurant_name TEXT,
        subtitle TEXT,
        working_hours TEXT,
        address TEXT,
        social_facebook TEXT,
        social_tiktok TEXT,
        social_instagram TEXT,
        social_whatsapp TEXT,
        social_email TEXT,
        developer_link TEXT,
        theme_color TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bank_name TEXT NOT NULL,
        account_number TEXT NOT NULL,
        account_holder TEXT
    )`);

    db.get(`SELECT COUNT(*) as count FROM settings`, (err, row) => {
        if (row && row.count === 0) {
            db.run(`INSERT INTO settings (restaurant_name, subtitle, working_hours, address, theme_color) VALUES (?, ?, ?, ?, ?)`,
                ['ሂጅራ ሬስቶራንት - Hijra Restaurant', 'Delicious food that makes your life wonderful! ጣፋጭ ምግቦች ህይወትን ያድሳሉ', '08:00 AM - 10:00 PM', 'አዲስ አበባ፣ ኢትዮጵያ', '#d4af37']);
        }
    });
});

// --- API ENDPOINTS ---
app.get('/api/menu', (req, res) => {
    db.all("SELECT * FROM menu", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/menu', (req, res) => {
    const { title, category, price, description, is_featured } = req.body;
    let image_url = '';

    if (req.files && req.files.image) {
        const imageFile = req.files.image;
        const fileName = Date.now() + '-' + imageFile.name.replace(/\s+/g, '_');
        const uploadPath = path.join(__dirname, 'public/uploads', fileName);

        imageFile.mv(uploadPath, (err) => {
            if (err) console.error(err);
        });
        image_url = '/uploads/' + fileName;
    }

    const sql = `INSERT INTO menu (title, category, price, description, image_url, is_featured) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [title, category, price, description, image_url, is_featured ? 1 : 0], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "ምግብ በስኬት ተጨምሯል!", id: this.lastID });
    });
});

app.delete('/api/menu/:id', (req, res) => {
    db.run(`DELETE FROM menu WHERE id = ?`, req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "ምግቡ ተሰርዟል!" });
    });
});

app.get('/api/settings', (req, res) => {
    db.get("SELECT * FROM settings WHERE id = 1", [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || {});
    });
});

app.post('/api/settings', (req, res) => {
    const { restaurant_name, subtitle, working_hours, address, social_facebook, social_tiktok, social_instagram, social_whatsapp, social_email, developer_link, theme_color } = req.body;
    const sql = `UPDATE settings SET restaurant_name = ?, subtitle = ?, working_hours = ?, address = ?, social_facebook = ?, social_tiktok = ?, social_instagram = ?, social_whatsapp = ?, social_email = ?, developer_link = ?, theme_color = ? WHERE id = 1`;
    
    db.run(sql, [restaurant_name, subtitle, working_hours, address, social_facebook, social_tiktok, social_instagram, social_whatsapp, social_email, developer_link, theme_color], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "ቅንብሮች ተስተካክለዋል!" });
    });
});

app.get('/api/payments', (req, res) => {
    db.all("SELECT * FROM payments", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/payments', (req, res) => {
    const { bank_name, account_number, account_holder } = req.body;
    db.run(`INSERT INTO payments (bank_name, account_number, account_holder) VALUES (?, ?, ?)`, [bank_name, account_number, account_holder], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "የክፍያ አካውንት ተጨምሯል!", id: this.lastID });
    });
});

app.delete('/api/payments/:id', (req, res) => {
    db.run(`DELETE FROM payments WHERE id = ?`, req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "ተሰርዟል!" });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
