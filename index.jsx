import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Users, 
  FileText, 
  CreditCard, 
  Activity, 
  Clock, 
  Search, 
  Bell, 
  LogOut, 
  User, 
  Plus, 
  CheckCircle, 
  X,
  ChevronRight,
  Stethoscope,
  LayoutDashboard,
  MapPin,
  Star,
  ArrowRight,
  Shield,
  UserPlus,
  Trash2,
  Settings,
  TrendingUp,
  Filter,
  ClipboardList
} from 'lucide-react';

// --- MOCK DATA & CONSTANTS ---

const INITIAL_USERS = {
  'admin@mail.com': { name: 'System Administrator', role: 'admin' },
  'doctor@mail.com': { name: 'Dr. Sarah Wilson', role: 'doctor', id: 1, specialty: 'Cardiology' },
  'reception@mail.com': { name: 'Front Desk (Emma)', role: 'reception' },
  'patient@mail.com': { name: 'James Anderson', role: 'patient' }
};

const INITIAL_DOCTORS = [
  { id: 1, name: 'Dr. Sarah Wilson', specialty: 'Cardiology', keywords: ['heart', 'chest', 'pressure', 'beat', 'cardio', 'pain'], rating: 4.9 },
  { id: 2, name: 'Dr. Michael Chen', specialty: 'Neurology', keywords: ['head', 'headache', 'dizzy', 'migraine', 'nerve', 'seizure'], rating: 4.8 },
  { id: 3, name: 'Dr. Emily Brooks', specialty: 'Pediatrics', keywords: ['child', 'baby', 'fever', 'cough', 'flu', 'vaccine'], rating: 5.0 },
  { id: 4, name: 'Dr. John Doe', specialty: 'General Physician', keywords: ['general', 'checkup', 'weakness', 'stomach', 'cold'], rating: 4.7 }
];

const TIME_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

// --- SHARED COMPONENTS ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

const Badge = ({ status }) => {
  const styles = {
    Scheduled: 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
    Cancelled: 'bg-red-100 text-red-700',
    Pending: 'bg-amber-100 text-amber-700',
    Paid: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
};

// --- MAIN APPLICATION ---

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  
  // Centralized State
  const [doctors, setDoctors] = useState(INITIAL_DOCTORS);
  const [appointments, setAppointments] = useState([
    { id: 101, patientName: 'James Anderson', doctorId: 1, date: '2023-10-25', time: '09:00', status: 'Completed', type: 'Checkup' },
    { id: 102, patientName: 'Linda Martinez', doctorId: 1, date: '2023-10-25', time: '10:00', status: 'Scheduled', type: 'Consultation' },
  ]);
  const [records, setRecords] = useState([
    { id: 1, patientName: 'James Anderson', date: '2023-10-25', doctor: 'Dr. Sarah Wilson', diagnosis: 'Normal sinus rhythm, slightly elevated BP', prescription: 'Lisinopril 5mg daily' }
  ]);
  const [bills, setBills] = useState([
    { id: 501, patientName: 'James Anderson', amount: 150, status: 'Paid', date: '2023-10-25', service: 'Cardio Checkup' },
  ]);
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'System Update: New specialty "Dermatology" added.', time: '1h ago' }
  ]);

  // Auth Actions
  const handleLogin = (email) => {
    setUser({ email, ...INITIAL_USERS[email] });
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setView('dashboard');
  };

  // Shared Logic
  const addAppointment = (appt) => {
    const newAppt = { ...appt, id: Date.now(), status: 'Scheduled' };
    setAppointments([newAppt, ...appointments]);
    setNotifications([{ id: Date.now(), text: `New booking: ${appt.patientName} with ${doctors.find(d => d.id === appt.doctorId)?.name}`, time: 'Just now' }, ...notifications]);
  };

  const updateApptStatus = (id, status) => {
    setAppointments(appointments.map(a => a.id === id ? {...a, status} : a));
  };

  // --- VIEWS ---

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-8">
          <div className="text-center">
            <Activity className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900">MediCare Login</h2>
            <p className="text-slate-500 mt-2">Select your role to continue</p>
          </div>
          <div className="space-y-3">
            {Object.entries(INITIAL_USERS).map(([email, profile]) => (
              <button key={email} onClick={() => handleLogin(email)} className="w-full flex items-center p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group">
                <div className={`p-2 rounded-lg mr-4 ${profile.role === 'admin' ? 'bg-slate-800 text-white' : 'bg-blue-100 text-blue-600'}`}>
                  {profile.role === 'admin' ? <Shield size={20}/> : profile.role === 'doctor' ? <Stethoscope size={20}/> : profile.role === 'reception' ? <Users size={20}/> : <User size={20}/>}
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-slate-900">{profile.name}</div>
                  <div className="text-xs text-slate-500 uppercase font-bold">{profile.role}</div>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-blue-500" size={18} />
              </button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-100">
          <div className="p-1.5 bg-blue-600 rounded-lg"><Activity className="text-white" size={18} /></div>
          <span className="font-bold text-xl tracking-tight text-slate-800">MediCare</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <SidebarLink icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          
          {user.role === 'admin' && (
            <SidebarLink icon={Users} label="Manage Staff" active={view === 'manage_staff'} onClick={() => setView('manage_staff')} />
          )}

          {user.role === 'doctor' && (
            <>
              <SidebarLink icon={ClipboardList} label="Patient Queue" active={view === 'doctor_queue'} onClick={() => setView('doctor_queue')} />
              <SidebarLink icon={FileText} label="Medical Records" active={view === 'doctor_records'} onClick={() => setView('doctor_records')} />
            </>
          )}

          {user.role === 'reception' && (
            <>
              <SidebarLink icon={Calendar} label="Appointments" active={view === 'reception_booking'} onClick={() => setView('reception_booking')} />
              <SidebarLink icon={CreditCard} label="Billing" active={view === 'reception_billing'} onClick={() => setView('reception_billing')} />
            </>
          )}

          {user.role === 'patient' && (
            <>
              <SidebarLink icon={Calendar} label="Book Medical" active={view === 'patient_book'} onClick={() => setView('patient_book')} />
              <SidebarLink icon={FileText} label="My History" active={view === 'patient_history'} onClick={() => setView('patient_history')} />
            </>
          )}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{user.name.charAt(0)}</div>
            <div className="flex-1 overflow-hidden"><p className="text-sm font-bold truncate">{user.name}</p></div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 p-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={16} /> <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 capitalize">{view.replace('_', ' ')}</h1>
            <p className="text-slate-500">MediCare System Console</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right"><p className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString()}</p></div>
            <button className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-blue-600 transition-colors relative">
              <Bell size={20} /><span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* VIEW ROUTING */}
        
        {view === 'dashboard' && <DashboardView user={user} appointments={appointments} doctors={doctors} bills={bills} notifications={notifications} />}

        {view === 'manage_staff' && <AdminStaffView doctors={doctors} setDoctors={setDoctors} setNotifications={setNotifications} />}

        {view === 'reception_booking' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2"><AppointmentList appointments={appointments} onStatusChange={updateApptStatus} doctors={doctors} /></div>
            <div className="lg:col-span-1"><BookingForm doctors={doctors} onBook={addAppointment} /></div>
          </div>
        )}

        {view === 'reception_billing' && <BillingView bills={bills} setBills={setBills} appointments={appointments} />}

        {view === 'patient_book' && <PatientBookingView doctors={doctors} onBook={addAppointment} userName={user.name} />}

        {view === 'patient_history' && <PatientHistoryView records={records} userName={user.name} />}

        {view === 'doctor_queue' && <DoctorQueueView appointments={appointments} setView={setView} />}

        {view === 'doctor_records' && <DoctorRecordsView records={records} setRecords={setRecords} appointments={appointments} doctorName={user.name} />}

      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function SidebarLink({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
      <Icon size={18} /> <span>{label}</span>
    </button>
  );
}

function DashboardView({ user, appointments, doctors, bills, notifications }) {
  const stats = [
    { label: 'Total Patients', value: '1,284', icon: Users, color: 'blue' },
    { label: 'Active Staff', value: doctors.length, icon: Stethoscope, color: 'emerald' },
    { label: 'Revenue', value: '$24.5k', icon: TrendingUp, color: 'purple' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map(s => (
          <Card key={s.label} className={`p-6 border-l-4 border-l-${s.color}-500 flex items-center space-x-4`}>
            <div className={`p-3 bg-${s.color}-50 text-${s.color}-600 rounded-xl`}><s.icon size={24}/></div>
            <div><p className="text-xs font-bold text-slate-400 uppercase">{s.label}</p><h3 className="text-2xl font-bold">{s.value}</h3></div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-slate-800 mb-4">Recent Notifications</h3>
          <div className="space-y-4">
            {notifications.map(n => (
              <div key={n.id} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                <div className="h-2 w-2 mt-2 bg-blue-500 rounded-full"></div>
                <div><p className="text-sm text-slate-700">{n.text}</p><p className="text-xs text-slate-400">{n.time}</p></div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
           <h3 className="font-bold text-slate-800 mb-4">Today's Performance</h3>
           <div className="space-y-4">
              <div className="flex justify-between items-center"><span className="text-sm text-slate-600">Bed Occupancy</span><span className="font-bold">84%</span></div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-blue-500 h-full w-[84%]"></div></div>
              <div className="flex justify-between items-center pt-2"><span className="text-sm text-slate-600">Patient Satisfaction</span><span className="font-bold text-emerald-600">4.9/5.0</span></div>
           </div>
        </Card>
      </div>
    </div>
  );
}

function AdminStaffView({ doctors, setDoctors, setNotifications }) {
  const addDoc = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newDoc = {
      id: Date.now(),
      name: fd.get('name'),
      specialty: fd.get('specialty'),
      keywords: fd.get('keywords').split(',').map(k => k.trim()),
      rating: 5.0
    };
    setDoctors([...doctors, newDoc]);
    setNotifications(prev => [{id: Date.now(), text: `New Specialist ${newDoc.name} onboarded.`, time: 'Just now'}, ...prev]);
    e.target.reset();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card className="lg:col-span-2">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold">Medical Directory</h3>
          <span className="text-xs bg-slate-100 px-2 py-1 rounded font-bold uppercase">{doctors.length} Doctors</span>
        </div>
        <div className="divide-y divide-slate-100">
          {doctors.map(doc => (
            <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 group">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold">{doc.name.charAt(4)}</div>
                <div><p className="font-bold text-slate-900">{doc.name}</p><p className="text-xs text-slate-500">{doc.specialty}</p></div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center text-amber-500 text-xs font-bold mb-1"><Star size={12} fill="currentColor" className="mr-1"/> {doc.rating}</div>
                  <p className="text-[10px] text-slate-400">{doc.keywords.slice(0, 2).join(', ')}</p>
                </div>
                <button onClick={() => setDoctors(doctors.filter(d => d.id !== doc.id))} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18}/></button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center"><UserPlus size={18} className="mr-2 text-blue-500" /> Onboard Staff</h3>
        <form onSubmit={addDoc} className="space-y-4">
           <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Doctor Name</label><input name="name" required className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="e.g. Dr. House" /></div>
           <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Specialty</label><select name="specialty" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"><option>Cardiology</option><option>Neurology</option><option>Pediatrics</option><option>General Physician</option></select></div>
           <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Expertise Keywords</label><textarea name="keywords" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm h-20" placeholder="e.g. heart, pulse, chest (comma separated)"></textarea></div>
           <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all">Onboard to System</button>
        </form>
      </Card>
    </div>
  );
}

function PatientBookingView({ doctors, onBook, userName }) {
  const [query, setQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const matchedDoc = useMemo(() => {
    if (!query) return null;
    const q = query.toLowerCase();
    return doctors.find(d => 
      d.specialty.toLowerCase().includes(q) || 
      d.keywords.some(k => q.includes(k))
    );
  }, [query, doctors]);

  const handleComplete = () => {
    if (!selectedDoc || !selectedSlot) return;
    onBook({ patientName: userName, doctorId: selectedDoc.id, date: new Date().toISOString().split('T')[0], time: selectedSlot, type: 'Direct Booking' });
    setSelectedDoc(null);
    setSelectedSlot(null);
    setQuery('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">How can we help you today?</h2>
        <p className="text-slate-500">Describe your symptoms and we'll match you with a specialist.</p>
      </div>

      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
        <input 
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. I have a severe headache..." 
          className="w-full pl-14 pr-6 py-5 bg-white shadow-xl rounded-2xl border-none text-lg outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all" 
        />
      </div>

      {matchedDoc && !selectedDoc && (
        <Card className="p-6 border-blue-500 border-2 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-2xl">{matchedDoc.name.charAt(4)}</div>
              <div>
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Expert Match</span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{matchedDoc.name}</h3>
                <p className="text-slate-500">{matchedDoc.specialty}</p>
              </div>
            </div>
            <button onClick={() => setSelectedDoc(matchedDoc)} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center">
              Choose Doctor <ArrowRight size={18} className="ml-2" />
            </button>
          </div>
        </Card>
      )}

      {selectedDoc && (
        <Card className="p-8 animate-in zoom-in-95">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-2xl font-bold">Select Appointment Time</h3>
            <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {TIME_SLOTS.map(slot => (
              <button key={slot} onClick={() => setSelectedSlot(slot)} className={`py-4 rounded-xl border-2 font-bold transition-all ${selectedSlot === slot ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200'}`}>
                {slot}
              </button>
            ))}
          </div>
          <button onClick={handleComplete} disabled={!selectedSlot} className="w-full mt-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 disabled:opacity-50 transition-all">
            Confirm Booking
          </button>
        </Card>
      )}
    </div>
  );
}

function AppointmentList({ appointments, onStatusChange, doctors }) {
  return (
    <Card>
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold">Active Appointments</h3>
        <Filter size={18} className="text-slate-400" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold">
            <tr>
              <th className="px-6 py-4">Patient</th>
              <th className="px-6 py-4">Doctor</th>
              <th className="px-6 py-4">Time</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {appointments.map(a => (
              <tr key={a.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-bold text-slate-800">{a.patientName}</td>
                <td className="px-6 py-4">{doctors.find(d => d.id === a.doctorId)?.name}</td>
                <td className="px-6 py-4 font-medium">{a.time}</td>
                <td className="px-6 py-4"><Badge status={a.status} /></td>
                <td className="px-6 py-4 text-right">
                  <select onChange={(e) => onStatusChange(a.id, e.target.value)} className="bg-slate-100 rounded p-1 outline-none text-xs font-bold">
                    <option value="">Update...</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function BookingForm({ doctors, onBook }) {
  return (
    <Card className="p-6">
      <h3 className="font-bold mb-4">New Walk-in</h3>
      <form onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        onBook({
          patientName: fd.get('patientName'),
          doctorId: parseInt(fd.get('doctorId')),
          time: fd.get('time'),
          date: new Date().toISOString().split('T')[0],
          type: 'Walk-in'
        });
        e.target.reset();
      }} className="space-y-4">
        <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Patient Name</label><input name="patientName" required className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
        <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Specialist</label>
          <select name="doctorId" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
            {doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>)}
          </select>
        </div>
        <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Timeslot</label>
          <select name="time" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
            {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm">Register & Book</button>
      </form>
    </Card>
  );
}

function BillingView({ bills, setBills, appointments }) {
  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold">Patient Billing</h3>
          <button className="flex items-center space-x-1 text-blue-600 text-sm font-bold"><Plus size={16}/> <span>Generate Invoice</span></button>
        </div>
        <div className="divide-y divide-slate-100">
          {bills.map(b => (
            <div key={b.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-slate-100 rounded-lg"><CreditCard size={20} className="text-slate-500"/></div>
                <div><p className="font-bold">{b.patientName}</p><p className="text-xs text-slate-500">{b.service} • {b.date}</p></div>
              </div>
              <div className="flex items-center space-x-6">
                <span className="font-bold">${b.amount}</span>
                <Badge status={b.status} />
                {b.status === 'Pending' && <button onClick={() => setBills(bills.map(bi => bi.id === b.id ? {...bi, status: 'Paid'} : bi))} className="text-blue-600 font-bold text-xs hover:underline">Mark Paid</button>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PatientHistoryView({ records, userName }) {
  const myRecords = records.filter(r => r.patientName === userName);
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {myRecords.map(rec => (
        <Card key={rec.id} className="p-6">
          <div className="flex justify-between items-start mb-4">
             <div><h3 className="text-xl font-bold">{rec.diagnosis}</h3><p className="text-sm text-slate-500">{rec.date} • {rec.doctor}</p></div>
             <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded">Record Verified</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><p className="text-sm text-slate-700 italic"><span className="font-bold not-italic">Prescription:</span> {rec.prescription}</p></div>
        </Card>
      ))}
      {myRecords.length === 0 && <div className="text-center py-20 text-slate-400"><FileText size={48} className="mx-auto mb-4 opacity-20"/><p>No medical records found yet.</p></div>}
    </div>
  );
}

function DoctorQueueView({ appointments, setView }) {
  const today = appointments.filter(a => a.status === 'Scheduled').slice(0, 5);
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center"><Clock size={20} className="mr-2 text-blue-600"/> Current Waiting Queue</h3>
        <div className="space-y-3">
          {today.map(a => (
            <div key={a.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
               <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center font-bold shadow-sm">{a.patientName.charAt(0)}</div>
                  <div><p className="font-bold">{a.patientName}</p><p className="text-xs text-slate-500">Wait time: ~15 mins</p></div>
               </div>
               <div className="flex items-center space-x-3">
                  <span className="font-bold text-blue-600">{a.time}</span>
                  <button onClick={() => setView('doctor_records')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">Attend Patient</button>
               </div>
            </div>
          ))}
          {today.length === 0 && <p className="text-slate-500 italic">No patients currently in queue.</p>}
        </div>
      </Card>
    </div>
  );
}

function DoctorRecordsView({ records, setRecords, appointments, doctorName }) {
  const addRec = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newRec = {
      id: Date.now(),
      patientName: fd.get('patient'),
      doctor: doctorName,
      date: new Date().toISOString().split('T')[0],
      diagnosis: fd.get('diagnosis'),
      prescription: fd.get('prescription')
    };
    setRecords([newRec, ...records]);
    e.target.reset();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card className="p-6">
          <h3 className="font-bold mb-4">Add Medical Note</h3>
          <form onSubmit={addRec} className="space-y-4">
            <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Patient</label>
              <select name="patient" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                {[...new Set(appointments.map(a => a.patientName))].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Diagnosis</label><input name="diagnosis" required className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="e.g. Chronic Fatigue" /></div>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Prescription Details</label><textarea name="prescription" required className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm h-32" placeholder="Dosage, frequency, duration..."></textarea></div>
            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm">Save to Record</button>
          </form>
        </Card>
      </div>
      <Card className="lg:col-span-2">
         <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold">Recent Clinic Records</h3></div>
         <div className="divide-y divide-slate-100">
           {records.map(r => (
             <div key={r.id} className="p-6 hover:bg-slate-50">
                <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-blue-700">{r.patientName}</h4><span className="text-xs text-slate-400">{r.date}</span></div>
                <p className="text-sm font-bold text-slate-800 mb-1">{r.diagnosis}</p>
                <p className="text-sm text-slate-500 italic">{r.prescription}</p>
             </div>
           ))}
         </div>
      </Card>
    </div>
  );
}