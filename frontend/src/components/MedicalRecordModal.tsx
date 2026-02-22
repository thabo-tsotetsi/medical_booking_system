import { useState } from 'react';
import Modal from './Modal';

const RECORD_TYPES = [
  { value: 'allergy', label: 'Allergy' },
  { value: 'chronic_condition', label: 'Chronic condition' },
  { value: 'medication', label: 'Medication' },
  { value: 'other', label: 'Other' },
] as const;

interface MedicalRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  saveRecord: (data: { recordType: string; name: string; description?: string; severity?: string; diagnosedDate?: string }) => Promise<void>;
}

export default function MedicalRecordModal({ isOpen, onClose, onSaved, saveRecord }: MedicalRecordModalProps) {
  const [recordType, setRecordType] = useState<string>('allergy');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('');
  const [diagnosedDate, setDiagnosedDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    try {
      await saveRecord({
        recordType,
        name: name.trim(),
        description: description.trim() || undefined,
        severity: severity.trim() || undefined,
        diagnosedDate: diagnosedDate || undefined,
      });
      setName('');
      setDescription('');
      setSeverity('');
      setDiagnosedDate('');
      onSaved();
      onClose();
    } catch (err) {
      setError('Failed to add record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add medical record">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Type</label>
          <select value={recordType} onChange={(e) => setRecordType(e.target.value)} required>
            {RECORD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Penicillin, Diabetes" required />
        </div>
        <div className="form-group">
          <label>Description (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Additional details" />
        </div>
        <div className="form-group">
          <label>Severity (optional)</label>
          <input value={severity} onChange={(e) => setSeverity(e.target.value)} placeholder="e.g. Mild, Severe" />
        </div>
        <div className="form-group">
          <label>Diagnosed date (optional)</label>
          <input type="date" value={diagnosedDate} onChange={(e) => setDiagnosedDate(e.target.value)} />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add record'}</button>
        </div>
      </form>
    </Modal>
  );
}
