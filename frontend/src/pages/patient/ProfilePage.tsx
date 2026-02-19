import { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface Profile {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
  address?: { line1?: string; city?: string; state?: string; postalCode?: string };
  medicalRecords?: { id: string; record_type: string; name: string; description?: string }[];
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Profile>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phone: '',
    address: {},
  });

  useEffect(() => {
    api.get('/users/profile').then((res) => {
      const d = res.data;
      setProfile(d);
      setForm({
        firstName: d.firstName || d.first_name || '',
        lastName: d.lastName || d.last_name || '',
        dateOfBirth: d.dateOfBirth || d.date_of_birth || '',
        phone: d.phone || '',
        address: d.address || {},
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const key = name.split('.')[1];
      setForm((prev) => ({ ...prev, address: { ...prev.address, [key]: value } }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/users/profile', {
        firstName: form.firstName,
        lastName: form.lastName,
        dateOfBirth: form.dateOfBirth || undefined,
        phone: form.phone || undefined,
        address: form.address,
      });
      setProfile({ ...profile, ...form });
    } finally {
      setSaving(false);
    }
  };

  const addMedicalRecord = async () => {
    const type = prompt('Type (allergy, chronic_condition, medication, other):');
    const name = prompt('Name:');
    if (!type || !name) return;
    try {
      await api.post('/users/medical-records', { recordType: type, name });
      const { data } = await api.get('/users/profile');
      setProfile(data);
    } catch (err) {
      alert('Failed to add');
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>My Profile</h1>
      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 500, marginBottom: '2rem' }}>
        <div className="form-group">
          <label>First Name</label>
          <input name="firstName" value={form.firstName} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Last Name</label>
          <input name="lastName" value={form.lastName} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Date of Birth</label>
          <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input name="phone" type="tel" value={form.phone} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Address</label>
          <input name="address.line1" placeholder="Street" value={form.address?.line1 ?? ''} onChange={handleChange} />
          <input name="address.city" placeholder="City" value={form.address?.city ?? ''} onChange={handleChange} style={{ marginTop: 4 }} />
          <input name="address.state" placeholder="State" value={form.address?.state ?? ''} onChange={handleChange} style={{ marginTop: 4 }} />
          <input name="address.postalCode" placeholder="Postal Code" value={form.address?.postalCode ?? ''} onChange={handleChange} style={{ marginTop: 4 }} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </form>

      <div className="card">
        <h2>Medical Records</h2>
        <p>Allergies, chronic conditions, medications</p>
        <button type="button" className="btn btn-outline" onClick={addMedicalRecord} style={{ marginBottom: '1rem' }}>Add Record</button>
        {profile?.medicalRecords?.length ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {profile.medicalRecords.map((r) => (
              <li key={r.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
                <strong>{r.record_type}:</strong> {r.name} {r.description && `— ${r.description}`}
              </li>
            ))}
          </ul>
        ) : (
          <p>No medical records yet.</p>
        )}
      </div>
    </div>
  );
}
