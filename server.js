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

function requireAuth(req, res, next) {
  const userId = req.header('x-user-id');
  const userRole = req.header('x-user-role');

  if (!userId || !userRole) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  db.get('SELECT id, email, name, role FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid user session' });
    if (user.role !== userRole) return res.status(403).json({ error: 'Role mismatch' });

    req.authUser = user;
    next();
  });
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.authUser) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.authUser.role)) {
      return res.status(403).json({ error: 'You do not have access to this route' });
    }
    next();
  };
}

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
        tags TEXT DEFAULT '',
        rating REAL DEFAULT 4.5,
        phone TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Backward-compatible migration for existing databases created before tags existed.
    db.all('PRAGMA table_info(doctors)', (tableErr, columns) => {
      if (tableErr) return;
      const hasTags = columns.some((column) => column.name === 'tags');
      if (!hasTags) {
        db.run("ALTER TABLE doctors ADD COLUMN tags TEXT DEFAULT ''");
      }
    });

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
        { name: 'Dr. Sarah Wilson', specialty: 'Cardiology', email: 'sarah.wilson@hospital.com', tags: 'chest pain,heart,blood pressure', rating: 4.9 },
        { name: 'Dr. Michael Chen', specialty: 'Neurology', email: 'michael.chen@hospital.com', tags: 'headache,migraine,nerve pain', rating: 4.8 },
        { name: 'Dr. Emily Brooks', specialty: 'Pediatrics', email: 'emily.brooks@hospital.com', tags: 'fever,child health,vaccination', rating: 5.0 },
        { name: 'Dr. John Doe', specialty: 'General Physician', email: 'john.doe@hospital.com', tags: 'cold,cough,checkup', rating: 4.7 }
      ];

      doctors.forEach(doctor => {
        db.run(
          'INSERT INTO doctors (name, specialty, email, tags, rating) VALUES (?, ?, ?, ?, ?)',
          [doctor.name, doctor.specialty, doctor.email, doctor.tags || '', doctor.rating]
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

// --- BACKEND INFO / SIMPLE ADMIN VIEW ---
app.get('/', (req, res) => {
  res.json({
    service: 'Hospital Management System API',
    status: 'running',
    docs: {
      health: '/api/health',
      summary: '/api/admin/summary',
      users: '/api/users',
      doctors: '/api/doctors',
      appointments: '/api/appointments',
      bills: '/api/bills'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/api/users', requireAuth, requireRole(['admin']), (req, res) => {
  db.all(
    'SELECT id, email, name, role, specialty, createdAt FROM users ORDER BY createdAt DESC',
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get('/api/admin/summary', requireAuth, requireRole(['admin']), (req, res) => {
  const summary = {
    users: 0,
    doctors: 0,
    appointments: 0,
    medicalRecords: 0,
    bills: 0
  };

  db.serialize(() => {
    db.get('SELECT COUNT(*) AS count FROM users', (usersErr, usersRow) => {
      if (usersErr) return res.status(500).json({ error: usersErr.message });
      summary.users = usersRow.count;

      db.get('SELECT COUNT(*) AS count FROM doctors', (doctorsErr, doctorsRow) => {
        if (doctorsErr) return res.status(500).json({ error: doctorsErr.message });
        summary.doctors = doctorsRow.count;

        db.get('SELECT COUNT(*) AS count FROM appointments', (appointmentsErr, appointmentsRow) => {
          if (appointmentsErr) return res.status(500).json({ error: appointmentsErr.message });
          summary.appointments = appointmentsRow.count;

          db.get('SELECT COUNT(*) AS count FROM medical_records', (recordsErr, recordsRow) => {
            if (recordsErr) return res.status(500).json({ error: recordsErr.message });
            summary.medicalRecords = recordsRow.count;

            db.get('SELECT COUNT(*) AS count FROM bills', (billsErr, billsRow) => {
              if (billsErr) return res.status(500).json({ error: billsErr.message });
              summary.bills = billsRow.count;

              res.json(summary);
            });
          });
        });
      });
    });
  });
});

app.post('/api/register/patient', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }

  db.get('SELECT id FROM users WHERE email = ?', [email], (checkErr, existingUser) => {
    if (checkErr) return res.status(500).json({ error: checkErr.message });
    if (existingUser) return res.status(409).json({ error: 'An account with this email already exists' });

    const userId = uuidv4();
    db.run(
      'INSERT INTO users (id, email, name, role, specialty, password) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, email, name, 'patient', null, password],
      (insertErr) => {
        if (insertErr) return res.status(500).json({ error: insertErr.message });

        db.get(
          'SELECT id, email, name, role, specialty, createdAt FROM users WHERE id = ?',
          [userId],
          (fetchErr, safeUser) => {
            if (fetchErr) return res.status(500).json({ error: fetchErr.message });
            return res.status(201).json({ message: 'Patient account created', user: safeUser });
          }
        );
      }
    );
  });
});

app.post('/api/admin/doctors', requireAuth, requireRole(['admin']), (req, res) => {
  const { name, specialty, email, tags, rating, password } = req.body;

  if (!name || !specialty || !email || !password) {
    return res.status(400).json({ error: 'Name, specialty, email and password are required' });
  }

  db.get('SELECT id FROM users WHERE email = ?', [email], (userCheckErr, existingUser) => {
    if (userCheckErr) return res.status(500).json({ error: userCheckErr.message });
    if (existingUser) return res.status(409).json({ error: 'A user account with this email already exists' });

    db.get('SELECT id FROM doctors WHERE email = ?', [email], (docCheckErr, existingDoctor) => {
      if (docCheckErr) return res.status(500).json({ error: docCheckErr.message });
      if (existingDoctor) return res.status(409).json({ error: 'A doctor profile with this email already exists' });

      const userId = uuidv4();
      db.run(
        'INSERT INTO users (id, email, name, role, specialty, password) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, email, name, 'doctor', specialty, password],
        (userInsertErr) => {
          if (userInsertErr) return res.status(500).json({ error: userInsertErr.message });

          db.run(
            'INSERT INTO doctors (name, specialty, email, tags, rating) VALUES (?, ?, ?, ?, ?)',
            [name, specialty, email, tags || '', Number(rating || 4.5)],
            function doctorInsertCallback(doctorInsertErr) {
              if (doctorInsertErr) {
                db.run('DELETE FROM users WHERE id = ?', [userId]);
                return res.status(500).json({ error: doctorInsertErr.message });
              }

              return res.status(201).json({
                message: 'Doctor account created',
                doctor: {
                  id: this.lastID,
                  name,
                  specialty,
                  email,
                  tags: tags || '',
                  rating: Number(rating || 4.5)
                },
                user: {
                  id: userId,
                  name,
                  email,
                  role: 'doctor',
                  specialty
                }
              });
            }
          );
        }
      );
    });
  });
});

// --- AUTHENTICATION ENDPOINTS ---
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Invalid email or password' });
    if (row.password !== password) return res.status(401).json({ error: 'Invalid email or password' });

    const { password: _password, ...safeUser } = row;
    
    res.json(safeUser);
  });
});

// --- DOCTORS ENDPOINTS ---
app.get('/api/doctors', requireAuth, (req, res) => {
  db.all('SELECT * FROM doctors', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/doctors', requireAuth, requireRole(['admin']), (req, res) => {
  const { name, specialty, email, tags, rating } = req.body;
  
  db.run(
    'INSERT INTO doctors (name, specialty, email, tags, rating) VALUES (?, ?, ?, ?, ?)',
    [name, specialty, email, tags || '', rating || 4.5],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, specialty, email, tags: tags || '', rating });
    }
  );
});

app.put('/api/doctors/:id', requireAuth, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const { name, specialty, email, tags, rating } = req.body;

  const fields = [];
  const values = [];

  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (specialty !== undefined) { fields.push('specialty = ?'); values.push(specialty); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email); }
  if (tags !== undefined) { fields.push('tags = ?'); values.push(tags); }
  if (rating !== undefined) { fields.push('rating = ?'); values.push(rating); }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No doctor fields provided for update' });
  }

  values.push(id);
  db.run(`UPDATE doctors SET ${fields.join(', ')} WHERE id = ?`, values, (err) => {
    if (err) return res.status(500).json({ error: err.message });

    db.get('SELECT * FROM doctors WHERE id = ?', [id], (fetchErr, doctorRow) => {
      if (fetchErr) return res.status(500).json({ error: fetchErr.message });
      return res.json(doctorRow);
    });
  });
});

app.delete('/api/doctors/:id', requireAuth, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM doctors WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Doctor deleted' });
  });
});

// --- APPOINTMENTS ENDPOINTS ---
app.get('/api/appointments', requireAuth, (req, res) => {
  const { email } = req.query;
  let query = 'SELECT * FROM appointments';
  let params = [];

  if (req.authUser.role === 'patient') {
    query += ' WHERE patientEmail = ?';
    params = [req.authUser.email];
  } else if (req.authUser.role === 'doctor') {
    query += ' WHERE doctorName = ?';
    params = [req.authUser.name];
  } else if (email) {
    query += ' WHERE patientEmail = ?';
    params = [email];
  }
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/appointments', requireAuth, (req, res) => {
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

app.put('/api/appointments/:id', requireAuth, (req, res) => {
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

app.delete('/api/appointments/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM appointments WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Appointment deleted' });
  });
});

// --- MEDICAL RECORDS ENDPOINTS ---
app.get('/api/medical-records', requireAuth, (req, res) => {
  const { email } = req.query;
  let query = 'SELECT * FROM medical_records';
  let params = [];

  if (req.authUser.role === 'patient') {
    query += ' WHERE patientEmail = ?';
    params = [req.authUser.email];
  } else if (email) {
    query += ' WHERE patientEmail = ?';
    params = [email];
  }
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/medical-records', requireAuth, requireRole(['doctor', 'admin']), (req, res) => {
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

app.delete('/api/medical-records/:id', requireAuth, requireRole(['doctor', 'admin']), (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM medical_records WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Record deleted' });
  });
});

// --- BILLS ENDPOINTS ---
app.get('/api/bills', requireAuth, (req, res) => {
  const { email } = req.query;
  let query = 'SELECT * FROM bills';
  let params = [];

  if (req.authUser.role === 'patient') {
    query += ' WHERE patientEmail = ?';
    params = [req.authUser.email];
  } else if (email) {
    query += ' WHERE patientEmail = ?';
    params = [email];
  }
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/bills', requireAuth, requireRole(['reception', 'admin']), (req, res) => {
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

app.put('/api/bills/:id', requireAuth, requireRole(['reception', 'admin']), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  db.run('UPDATE bills SET status = ? WHERE id = ?', [status, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id, status });
  });
});

app.delete('/api/bills/:id', requireAuth, requireRole(['reception', 'admin']), (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM bills WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Bill deleted' });
  });
});

// --- NOTIFICATIONS ENDPOINTS ---
app.get('/api/notifications', requireAuth, (req, res) => {
  const { userId } = req.query;

  if (req.authUser.role !== 'admin' && req.authUser.id !== userId) {
    return res.status(403).json({ error: 'You can only view your own notifications' });
  }
  
  db.all('SELECT * FROM notifications WHERE userId = ? ORDER BY time DESC', [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/notifications', requireAuth, (req, res) => {
  const { userId, text } = req.body;

  if (req.authUser.role !== 'admin' && req.authUser.id !== userId) {
    return res.status(403).json({ error: 'You can only create your own notifications' });
  }
  
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
app.get('/api/time-slots', requireAuth, (req, res) => {
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
