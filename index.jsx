import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Bell,
  Calendar,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  Filter,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Shield,
  Star,
  Stethoscope,
  Trash2,
  TrendingUp,
  User,
  UserPlus,
  Users,
  X
} from 'lucide-react';

const API_BASE = 'http://localhost:5055/api';
const LOGIN_EMAILS = ['admin@mail.com', 'doctor@mail.com', 'reception@mail.com', 'patient@mail.com'];

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>{children}</div>
);

const Badge = ({ status }) => {
  const styles = {
    Scheduled: 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
    Cancelled: 'bg-red-100 text-red-700',
    Pending: 'bg-amber-100 text-amber-700',
    Paid: 'bg-emerald-100 text-emerald-700'
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
};

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const payload = await response.json();
      message = payload.error || message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  return response.json();
}

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [bills, setBills] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAllData = async (activeUser) => {
    setLoading(true);
    setError('');
    try {
      const [doctorRows, appointmentRows, recordRows, billRows, slots] = await Promise.all([
        request('/doctors'),
        request('/appointments'),
        request('/medical-records'),
        request('/bills'),
        request('/time-slots')
      ]);

      setDoctors(doctorRows);
      setAppointments(appointmentRows);
      setRecords(recordRows);
      setBills(billRows);
      setTimeSlots(slots);

      if (activeUser?.id) {
        const noteRows = await request(`/notifications?userId=${encodeURIComponent(activeUser.id)}`).catch(() => []);
        setNotifications(noteRows);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAllData(user);
    }
  }, [user]);

  const handleLogin = async (email) => {
    setLoading(true);
    setError('');
    try {
      const loggedInUser = await request('/login', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setUser(loggedInUser);
      setView('dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('dashboard');
    setDoctors([]);
    setAppointments([]);
    setRecords([]);
    setBills([]);
    setNotifications([]);
  };

  const addAppointment = async (appt) => {
    const doctor = doctors.find((d) => d.id === Number(appt.doctorId));
    if (!doctor) return;

    const payload = {
      patientName: appt.patientName,
      patientEmail: appt.patientEmail,
      doctorId: Number(appt.doctorId),
      doctorName: doctor.name,
      date: appt.date,
      time: appt.time,
      type: appt.type
    };

    const created = await request('/appointments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    setAppointments((prev) => [created, ...prev]);
    if (user?.id) {
      await request('/notifications', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, text: `New booking: ${created.patientName} with ${doctor.name}` })
      }).catch(() => undefined);
      loadAllData(user);
    }
  };

  const updateApptStatus = async (id, status) => {
    await request(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    setAppointments((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  const createDoctor = async (doctorData) => {
    await request('/doctors', {
      method: 'POST',
      body: JSON.stringify(doctorData)
    });
    loadAllData(user);
  };

  const removeDoctor = async (id) => {
    await request(`/doctors/${id}`, { method: 'DELETE' });
    setDoctors((prev) => prev.filter((item) => item.id !== id));
  };

  const markBillPaid = async (id) => {
    await request(`/bills/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'Paid' })
    });
    setBills((prev) => prev.map((bill) => (bill.id === id ? { ...bill, status: 'Paid' } : bill)));
  };

  const createBill = async (billData) => {
    const created = await request('/bills', {
      method: 'POST',
      body: JSON.stringify(billData)
    });
    setBills((prev) => [created, ...prev]);
  };

  const addRecord = async (recordData) => {
    const created = await request('/medical-records', {
      method: 'POST',
      body: JSON.stringify(recordData)
    });
    setRecords((prev) => [created, ...prev]);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-8">
          <div className="text-center">
            <Activity className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900">MediCare Login</h2>
            <p className="text-slate-500 mt-2">Select your role to continue</p>
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">{error}</div>}
          <div className="space-y-3">
            {LOGIN_EMAILS.map((email) => (
              <button key={email} disabled={loading} onClick={() => handleLogin(email)} className="w-full flex items-center p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group disabled:opacity-70">
                <div className="p-2 rounded-lg mr-4 bg-blue-100 text-blue-600">
                  {email.includes('admin') ? <Shield size={20} /> : email.includes('doctor') ? <Stethoscope size={20} /> : email.includes('reception') ? <Users size={20} /> : <User size={20} />}
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-slate-900">{email}</div>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-blue-500" size={18} />
              </button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const scopedAppointments = user.role === 'doctor'
    ? appointments.filter((a) => a.doctorName === user.name)
    : user.role === 'patient'
      ? appointments.filter((a) => a.patientEmail === user.email)
      : appointments;

  const scopedRecords = user.role === 'patient'
    ? records.filter((r) => r.patientEmail === user.email)
    : records;

  const scopedBills = user.role === 'patient'
    ? bills.filter((b) => b.patientEmail === user.email)
    : bills;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-100">
          <div className="p-1.5 bg-blue-600 rounded-lg"><Activity className="text-white" size={18} /></div>
          <span className="font-bold text-xl tracking-tight text-slate-800">MediCare</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <SidebarLink icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          {user.role === 'admin' && <SidebarLink icon={Users} label="Manage Staff" active={view === 'manage_staff'} onClick={() => setView('manage_staff')} />}
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

      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 capitalize">{view.replace('_', ' ')}</h1>
            <p className="text-slate-500">MediCare System Console</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right"><p className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString()}</p></div>
            <button className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-blue-600 transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {loading && <div className="mb-4 text-sm text-slate-500">Loading data...</div>}
        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">{error}</div>}

        {view === 'dashboard' && <DashboardView user={user} appointments={scopedAppointments} doctors={doctors} bills={scopedBills} notifications={notifications} records={scopedRecords} />}
        {view === 'manage_staff' && <AdminStaffView doctors={doctors} onCreate={createDoctor} onDelete={removeDoctor} />}
        {view === 'reception_booking' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2"><AppointmentList appointments={scopedAppointments} onStatusChange={updateApptStatus} /></div>
            <div className="lg:col-span-1"><BookingForm doctors={doctors} onBook={addAppointment} timeSlots={timeSlots} /></div>
          </div>
        )}
        {view === 'reception_billing' && <BillingView bills={scopedBills} appointments={appointments} onMarkPaid={markBillPaid} onGenerate={createBill} />}
        {view === 'patient_book' && <PatientBookingView doctors={doctors} onBook={addAppointment} user={user} timeSlots={timeSlots} />}
        {view === 'patient_history' && <PatientHistoryView records={scopedRecords} />}
        {view === 'doctor_queue' && <DoctorQueueView appointments={scopedAppointments} setView={setView} />}
        {view === 'doctor_records' && <DoctorRecordsView records={scopedRecords} appointments={scopedAppointments} doctor={user} onAddRecord={addRecord} />}
      </main>
    </div>
  );
}

function SidebarLink({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
      <Icon size={18} /> <span>{label}</span>
    </button>
  );
}

function DashboardView({ appointments, doctors, bills, notifications, records }) {
  const patientCount = useMemo(() => {
    const names = new Set([
      ...appointments.map((a) => a.patientName),
      ...records.map((r) => r.patientName),
      ...bills.map((b) => b.patientName)
    ]);
    return names.size;
  }, [appointments, records, bills]);

  const revenue = useMemo(() => bills.filter((b) => b.status === 'Paid').reduce((sum, b) => sum + Number(b.amount || 0), 0), [bills]);

  const stats = [
    { label: 'Total Patients', value: patientCount, icon: Users, color: 'blue' },
    { label: 'Active Staff', value: doctors.length, icon: Stethoscope, color: 'emerald' },
    { label: 'Revenue', value: `$${revenue.toFixed(2)}`, icon: TrendingUp, color: 'purple' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s) => (
          <Card key={s.label} className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-slate-100 text-slate-700 rounded-xl"><s.icon size={24} /></div>
            <div><p className="text-xs font-bold text-slate-400 uppercase">{s.label}</p><h3 className="text-2xl font-bold">{s.value}</h3></div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-slate-800 mb-4">Recent Notifications</h3>
          <div className="space-y-4">
            {notifications.length === 0 && <p className="text-sm text-slate-400">No notifications yet.</p>}
            {notifications.map((n) => (
              <div key={n.id} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                <div className="h-2 w-2 mt-2 bg-blue-500 rounded-full"></div>
                <div><p className="text-sm text-slate-700">{n.text}</p><p className="text-xs text-slate-400">{new Date(n.time).toLocaleString()}</p></div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-bold text-slate-800 mb-4">Today's Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center"><span className="text-sm text-slate-600">Appointments</span><span className="font-bold">{appointments.length}</span></div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-blue-500 h-full" style={{ width: `${Math.min(appointments.length * 10, 100)}%` }}></div></div>
            <div className="flex justify-between items-center pt-2"><span className="text-sm text-slate-600">Paid Bills</span><span className="font-bold text-emerald-600">{bills.filter((b) => b.status === 'Paid').length}</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function AdminStaffView({ doctors, onCreate, onDelete }) {
  const addDoc = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await onCreate({
      name: fd.get('name'),
      specialty: fd.get('specialty'),
      email: fd.get('email'),
      rating: Number(fd.get('rating') || 4.5)
    });
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
          {doctors.map((doc) => (
            <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 group">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold">{doc.name.charAt(0)}</div>
                <div><p className="font-bold text-slate-900">{doc.name}</p><p className="text-xs text-slate-500">{doc.specialty}</p></div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center text-amber-500 text-xs font-bold mb-1"><Star size={12} fill="currentColor" className="mr-1" /> {doc.rating}</div>
                  <p className="text-[10px] text-slate-400 truncate max-w-40">{doc.email}</p>
                </div>
                <button onClick={() => onDelete(doc.id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center"><UserPlus size={18} className="mr-2 text-blue-500" /> Onboard Staff</h3>
        <form onSubmit={addDoc} className="space-y-4">
          <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Doctor Name</label><input name="name" required className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Email</label><input name="email" type="email" required className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Specialty</label><input name="specialty" required className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Rating</label><input name="rating" type="number" min="1" max="5" step="0.1" defaultValue="4.5" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
          <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all">Onboard to System</button>
        </form>
      </Card>
    </div>
  );
}

function PatientBookingView({ doctors, onBook, user, timeSlots }) {
  const [query, setQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const matchedDoc = useMemo(() => {
    if (!query) return null;
    const q = query.toLowerCase();
    return doctors.find((d) => d.specialty.toLowerCase().includes(q) || d.name.toLowerCase().includes(q));
  }, [query, doctors]);

  const handleComplete = async () => {
    if (!selectedDoc || !selectedSlot) return;
    await onBook({
      patientName: user.name,
      patientEmail: user.email,
      doctorId: selectedDoc.id,
      date: new Date().toISOString().split('T')[0],
      time: selectedSlot,
      type: 'Direct Booking'
    });
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
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. headache, fever, chest pain" className="w-full pl-14 pr-6 py-5 bg-white shadow-xl rounded-2xl border-none text-lg outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all" />
      </div>
      {matchedDoc && !selectedDoc && (
        <Card className="p-6 border-blue-500 border-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-2xl">{matchedDoc.name.charAt(0)}</div>
              <div>
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Expert Match</span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{matchedDoc.name}</h3>
                <p className="text-slate-500">{matchedDoc.specialty}</p>
              </div>
            </div>
            <button onClick={() => setSelectedDoc(matchedDoc)} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center">Choose Doctor <ArrowRight size={18} className="ml-2" /></button>
          </div>
        </Card>
      )}
      {selectedDoc && (
        <Card className="p-8">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-2xl font-bold">Select Appointment Time</h3>
            <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {timeSlots.map((slot) => (
              <button key={slot} onClick={() => setSelectedSlot(slot)} className={`py-4 rounded-xl border-2 font-bold transition-all ${selectedSlot === slot ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200'}`}>{slot}</button>
            ))}
          </div>
          <button onClick={handleComplete} disabled={!selectedSlot} className="w-full mt-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 disabled:opacity-50 transition-all">Confirm Booking</button>
        </Card>
      )}
    </div>
  );
}

function AppointmentList({ appointments, onStatusChange }) {
  return (
    <Card>
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold">Active Appointments</h3>
        <Filter size={18} className="text-slate-400" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold">
            <tr><th className="px-6 py-4">Patient</th><th className="px-6 py-4">Doctor</th><th className="px-6 py-4">Time</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {appointments.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-bold text-slate-800">{a.patientName}</td>
                <td className="px-6 py-4">{a.doctorName}</td>
                <td className="px-6 py-4 font-medium">{a.time}</td>
                <td className="px-6 py-4"><Badge status={a.status} /></td>
                <td className="px-6 py-4 text-right">
                  <select onChange={(e) => onStatusChange(a.id, e.target.value)} className="bg-slate-100 rounded p-1 outline-none text-xs font-bold" value="">
                    <option value="">Update...</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Scheduled">Scheduled</option>
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

function BookingForm({ doctors, onBook, timeSlots }) {
  return (
    <Card className="p-6">
      <h3 className="font-bold mb-4">New Walk-in</h3>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          await onBook({
            patientName: fd.get('patientName'),
            patientEmail: fd.get('patientEmail'),
            doctorId: Number(fd.get('doctorId')),
            time: fd.get('time'),
            date: new Date().toISOString().split('T')[0],
            type: 'Walk-in'
          });
          e.target.reset();
        }}
        className="space-y-4"
      >
        <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Patient Name</label><input name="patientName" required className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
        <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Patient Email</label><input name="patientEmail" type="email" required className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
        <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Specialist</label><select name="doctorId" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">{doctors.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>)}</select></div>
        <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Timeslot</label><select name="time" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">{timeSlots.map((t) => <option key={t}>{t}</option>)}</select></div>
        <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm">Register & Book</button>
      </form>
    </Card>
  );
}

function BillingView({ bills, appointments, onMarkPaid, onGenerate }) {
  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold">Patient Billing</h3>
          <button
            onClick={async () => {
              const completed = appointments.find((a) => a.status === 'Completed');
              if (!completed) return;
              await onGenerate({
                patientName: completed.patientName,
                patientEmail: completed.patientEmail,
                amount: 150,
                service: completed.type || 'Consultation',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              });
            }}
            className="flex items-center space-x-1 text-blue-600 text-sm font-bold"
          >
            <Plus size={16} /> <span>Generate Invoice</span>
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {bills.map((b) => (
            <div key={b.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center space-x-4"><div className="p-2 bg-slate-100 rounded-lg"><CreditCard size={20} className="text-slate-500" /></div><div><p className="font-bold">{b.patientName}</p><p className="text-xs text-slate-500">{b.service} • {b.date}</p></div></div>
              <div className="flex items-center space-x-6"><span className="font-bold">${b.amount}</span><Badge status={b.status} />{b.status === 'Pending' && <button onClick={() => onMarkPaid(b.id)} className="text-blue-600 font-bold text-xs hover:underline">Mark Paid</button>}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PatientHistoryView({ records }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {records.map((rec) => (
        <Card key={rec.id} className="p-6">
          <div className="flex justify-between items-start mb-4"><div><h3 className="text-xl font-bold">{rec.diagnosis}</h3><p className="text-sm text-slate-500">{rec.date} • {rec.doctor}</p></div><span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded">Record Verified</span></div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><p className="text-sm text-slate-700 italic"><span className="font-bold not-italic">Prescription:</span> {rec.prescription}</p></div>
        </Card>
      ))}
      {records.length === 0 && <div className="text-center py-20 text-slate-400"><FileText size={48} className="mx-auto mb-4 opacity-20" /><p>No medical records found yet.</p></div>}
    </div>
  );
}

function DoctorQueueView({ appointments, setView }) {
  const today = appointments.filter((a) => a.status === 'Scheduled').slice(0, 5);
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center"><Clock size={20} className="mr-2 text-blue-600" /> Current Waiting Queue</h3>
        <div className="space-y-3">
          {today.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-4"><div className="h-10 w-10 bg-white rounded-full flex items-center justify-center font-bold shadow-sm">{a.patientName.charAt(0)}</div><div><p className="font-bold">{a.patientName}</p><p className="text-xs text-slate-500">Wait time: ~15 mins</p></div></div>
              <div className="flex items-center space-x-3"><span className="font-bold text-blue-600">{a.time}</span><button onClick={() => setView('doctor_records')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">Attend Patient</button></div>
            </div>
          ))}
          {today.length === 0 && <p className="text-slate-500 italic">No patients currently in queue.</p>}
        </div>
      </Card>
    </div>
  );
}

function DoctorRecordsView({ records, appointments, doctor, onAddRecord }) {
  const addRec = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const patientName = fd.get('patient');
    const matchingAppointment = appointments.find((a) => a.patientName === patientName);

    await onAddRecord({
      patientName,
      patientEmail: matchingAppointment?.patientEmail || `${patientName.toLowerCase().replace(/\s+/g, '.')}@mail.com`,
      date: new Date().toISOString().split('T')[0],
      doctor: doctor.name,
      diagnosis: fd.get('diagnosis'),
      prescription: fd.get('prescription'),
      symptoms: fd.get('symptoms')
    });

    e.target.reset();
  };

  const patients = [...new Set(appointments.map((a) => a.patientName))];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card className="p-6">
          <h3 className="font-bold mb-4">Add Medical Note</h3>
          <form onSubmit={addRec} className="space-y-4">
            <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Patient</label><select name="patient" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">{patients.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Symptoms</label><input name="symptoms" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Diagnosis</label><input name="diagnosis" required className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Prescription Details</label><textarea name="prescription" required className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm h-32"></textarea></div>
            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm">Save to Record</button>
          </form>
        </Card>
      </div>
      <Card className="lg:col-span-2">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold">Recent Clinic Records</h3></div>
        <div className="divide-y divide-slate-100">
          {records.map((r) => (
            <div key={r.id} className="p-6 hover:bg-slate-50"><div className="flex justify-between items-center mb-2"><h4 className="font-bold text-blue-700">{r.patientName}</h4><span className="text-xs text-slate-400">{r.date}</span></div><p className="text-sm font-bold text-slate-800 mb-1">{r.diagnosis}</p><p className="text-sm text-slate-500 italic">{r.prescription}</p></div>
          ))}
        </div>
      </Card>
    </div>
  );
}
