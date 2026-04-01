const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5055;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite Database
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
  initializeDatabase();
});

// Initialize Database Schema
function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        specialty TEXT,
        password TEXT DEFAULT 'password123',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Doctors table
    db.run(`
      CREATE TABLE IF NOT EXISTS doctors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        specialty TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        rating REAL DEFAULT 4.5,
        phone TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Appointments table
    db.run(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientName TEXT NOT NULL,
        patientEmail TEXT NOT NULL,
        doctorId INTEGER NOT NULL,
        doctorName TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        status TEXT DEFAULT 'Scheduled',
        type TEXT,
        notes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (doctorId) REFERENCES doctors(id)
      )
    `);

    // Medical Records table
    db.run(`
      CREATE TABLE IF NOT EXISTS medical_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientName TEXT NOT NULL,
        patientEmail TEXT NOT NULL,
        date TEXT NOT NULL,
        doctor TEXT NOT NULL,
        diagnosis TEXT NOT NULL,
        prescription TEXT NOT NULL,
        symptoms TEXT,
        notes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bills table
    db.run(`
      CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientName TEXT NOT NULL,
        patientEmail TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'Pending',
        date TEXT NOT NULL,
        service TEXT NOT NULL,
        dueDate TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notifications table
    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        text TEXT NOT NULL,
        time DATETIME DEFAULT CURRENT_TIMESTAMP,
        read INTEGER DEFAULT 0
      )
    `);

    // Seed initial data
    seedInitialData();
  });
}

function seedInitialData() {
  // Check if users already exist
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err) return;
    
    if (row.count === 0) {
      // Insert users
      const users = [
        { id: uuidv4(), email: 'admin@mail.com', name: 'System Administrator', role: 'admin' },
        { id: uuidv4(), email: 'doctor@mail.com', name: 'Dr. Sarah Wilson', role: 'doctor', specialty: 'Cardiology' },
        { id: uuidv4(), email: 'reception@mail.com', name: 'Front Desk (Emma)', role: 'reception' },
        { id: uuidv4(), email: 'patient@mail.com', name: 'James Anderson', role: 'patient' }
      ];

      users.forEach(user => {
        db.run(
          'INSERT INTO users (id, email, name, role, specialty) VALUES (?, ?, ?, ?, ?)',
          [user.id, user.email, user.name, user.role, user.specialty || null]
        );
      });

      // Insert doctors
      const doctors = [
        { name: 'Dr. Sarah Wilson', specialty: 'Cardiology', email: 'sarah.wilson@hospital.com', rating: 4.9 },
        { name: 'Dr. Michael Chen', specialty: 'Neurology', email: 'michael.chen@hospital.com', rating: 4.8 },
        { name: 'Dr. Emily Brooks', specialty: 'Pediatrics', email: 'emily.brooks@hospital.com', rating: 5.0 },
        { name: 'Dr. John Doe', specialty: 'General Physician', email: 'john.doe@hospital.com', rating: 4.7 }
      ];

      doctors.forEach(doctor => {
        db.run(
          'INSERT INTO doctors (name, specialty, email, rating) VALUES (?, ?, ?, ?)',
          [doctor.name, doctor.specialty, doctor.email, doctor.rating]
        );
      });

      // Insert sample appointments
      db.run(
        `INSERT INTO appointments (patientName, patientEmail, doctorId, doctorName, date, time, status, type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['James Anderson', 'patient@mail.com', 1, 'Dr. Sarah Wilson', '2024-03-30', '09:00', 'Completed', 'Checkup']
      );

      db.run(
        `INSERT INTO appointments (patientName, patientEmail, doctorId, doctorName, date, time, status, type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Linda Martinez', 'linda@mail.com', 1, 'Dr. Sarah Wilson', '2024-03-31', '10:00', 'Scheduled', 'Consultation']
      );

      // Insert sample medical records
      db.run(
        `INSERT INTO medical_records (patientName, patientEmail, date, doctor, diagnosis, prescription, symptoms)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['James Anderson', 'patient@mail.com', '2024-03-30', 'Dr. Sarah Wilson', 'Normal sinus rhythm, slightly elevated BP', 'Lisinopril 5mg daily', 'Chest discomfort']
      );

      // Insert sample bills
      db.run(
        `INSERT INTO bills (patientName, patientEmail, amount, status, date, service, dueDate)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['James Anderson', 'patient@mail.com', 150, 'Paid', '2024-03-30', 'Cardio Checkup', '2024-04-15']
      );

      console.log('Initial data seeded successfully');
    }
  });
}

// --- AUTHENTICATION ENDPOINTS ---
app.post('/api/login', (req, res) => {
  const { email } = req.body;
  
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'User not found' });
    
    res.json(row);
  });
});

// --- DOCTORS ENDPOINTS ---
app.get('/api/doctors', (req, res) => {
  db.all('SELECT * FROM doctors', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/doctors', (req, res) => {
  const { name, specialty, email, rating } = req.body;
  
  db.run(
    'INSERT INTO doctors (name, specialty, email, rating) VALUES (?, ?, ?, ?)',
    [name, specialty, email, rating || 4.5],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, specialty, email, rating });
    }
  );
});

app.put('/api/doctors/:id', (req, res) => {
  const { id } = req.params;
  const { name, specialty, email, rating } = req.body;
  
  db.run(
    'UPDATE doctors SET name = ?, specialty = ?, email = ?, rating = ? WHERE id = ?',
    [name, specialty, email, rating, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id, name, specialty, email, rating });
    }
  );
});

app.delete('/api/doctors/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM doctors WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Doctor deleted' });
  });
});

// --- APPOINTMENTS ENDPOINTS ---
app.get('/api/appointments', (req, res) => {
  const { email } = req.query;
  let query = 'SELECT * FROM appointments';
  let params = [];
  
  if (email) {
    query += ' WHERE patientEmail = ?';
    params = [email];
  }
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/appointments', (req, res) => {
  const { patientName, patientEmail, doctorId, doctorName, date, time, type } = req.body;
  
  db.run(
    `INSERT INTO appointments (patientName, patientEmail, doctorId, doctorName, date, time, status, type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [patientName, patientEmail, doctorId, doctorName, date, time, 'Scheduled', type],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, patientName, patientEmail, doctorId, doctorName, date, time, status: 'Scheduled', type });
    }
  );
});

app.put('/api/appointments/:id', (req, res) => {
  const { id } = req.params;
  const { status, date, time, type, notes } = req.body;
  
  const fields = [];
  const values = [];
  
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (date !== undefined) { fields.push('date = ?'); values.push(date); }
  if (time !== undefined) { fields.push('time = ?'); values.push(time); }
  if (type !== undefined) { fields.push('type = ?'); values.push(type); }
  if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }
  
  values.push(id);
  
  db.run(`UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`, values, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id, ...req.body });
  });
});

app.delete('/api/appointments/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM appointments WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Appointment deleted' });
  });
});

// --- MEDICAL RECORDS ENDPOINTS ---
app.get('/api/medical-records', (req, res) => {
  const { email } = req.query;
  let query = 'SELECT * FROM medical_records';
  let params = [];
  
  if (email) {
    query += ' WHERE patientEmail = ?';
    params = [email];
  }
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/medical-records', (req, res) => {
  const { patientName, patientEmail, date, doctor, diagnosis, prescription, symptoms, notes } = req.body;
  
  db.run(
    `INSERT INTO medical_records (patientName, patientEmail, date, doctor, diagnosis, prescription, symptoms, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [patientName, patientEmail, date, doctor, diagnosis, prescription, symptoms || '', notes || ''],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, patientName, patientEmail, date, doctor, diagnosis, prescription, symptoms, notes });
    }
  );
});

app.delete('/api/medical-records/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM medical_records WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Record deleted' });
  });
});

// --- BILLS ENDPOINTS ---
app.get('/api/bills', (req, res) => {
  const { email } = req.query;
  let query = 'SELECT * FROM bills';
  let params = [];
  
  if (email) {
    query += ' WHERE patientEmail = ?';
    params = [email];
  }
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/bills', (req, res) => {
  const { patientName, patientEmail, amount, service, dueDate } = req.body;
  const date = new Date().toISOString().split('T')[0];
  
  db.run(
    `INSERT INTO bills (patientName, patientEmail, amount, status, date, service, dueDate)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [patientName, patientEmail, amount, 'Pending', date, service, dueDate],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, patientName, patientEmail, amount, status: 'Pending', date, service, dueDate });
    }
  );
});

app.put('/api/bills/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  db.run('UPDATE bills SET status = ? WHERE id = ?', [status, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id, status });
  });
});

app.delete('/api/bills/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM bills WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Bill deleted' });
  });
});

// --- NOTIFICATIONS ENDPOINTS ---
app.get('/api/notifications', (req, res) => {
  const { userId } = req.query;
  
  db.all('SELECT * FROM notifications WHERE userId = ? ORDER BY time DESC', [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/notifications', (req, res) => {
  const { userId, text } = req.body;
  
  db.run(
    'INSERT INTO notifications (userId, text) VALUES (?, ?)',
    [userId, text],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, userId, text, time: new Date(), read: 0 });
    }
  );
});

// --- TIME SLOTS ENDPOINT ---
app.get('/api/time-slots', (req, res) => {
  const slots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
  res.json(slots);
});

// Start Server
app.listen(PORT, () => {
  console.log(`🏥 Hospital Management System backend running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  console.log('\nDatabase connection closed');
  process.exit(0);
});
