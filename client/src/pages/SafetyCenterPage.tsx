import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  PhoneCall,
  Plus,
  CheckCircle2,
  Lock,
  UserCheck,
  Volume2,
  FileText,
  MapPin,
  Radio,
  Eye,
  EyeOff,
  ShieldAlert,
  Info,
  Copy,
  Check,
} from 'lucide-react';
import api from '../services/api';
import { EmergencyContact, SafetyEvent, LocationSharingStatus, SOSResponseSummary } from '../types';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/audio';
import { SosConfirmationModal } from '../components/SosConfirmationModal';
import { EmergencyResponseSummaryModal } from '../components/EmergencyResponseSummaryModal';

export const SafetyCenterPage: React.FC = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [incidents, setIncidents] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddContact, setShowAddContact] = useState(false);

  // Live Location Sharing State
  const [locationSharing, setLocationSharing] = useState<LocationSharingStatus | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [togglingLocation, setTogglingLocation] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // SOS Modal State
  const [showSosConfirm, setShowSosConfirm] = useState(false);
  const [triggeringSos, setTriggeringSos] = useState(false);
  const [sosSummary, setSosSummary] = useState<SOSResponseSummary | null>(null);
  const [showSosSummary, setShowSosSummary] = useState(false);

  // New Contact Form
  const [contactName, setContactName] = useState('');
  const [relation, setRelation] = useState('Parent / Guardian');
  const [phone, setPhone] = useState('');

  const { showToast } = useNotification();
  const { user } = useAuth();

  const fetchData = async () => {
    try {
      const [cRes, iRes, locRes] = await Promise.all([
        api.get('/api/safety/emergency-contacts'),
        api.get('/api/safety/incidents'),
        api.get('/api/safety/location-sharing'),
      ]);
      setContacts(cRes.data);
      setIncidents(iRes.data);
      setLocationSharing(locRes.data);

      const activeIds = locRes.data.shared_with
        ? locRes.data.shared_with.filter((c: any) => c.can_view).map((c: any) => c.id)
        : [];
      setSelectedContactIds(activeIds);
    } catch (err) {
      console.error('Error fetching safety data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/safety/emergency-contacts', {
        contact_name: contactName,
        relationship_type: relation,
        phone_number: phone,
        is_primary: contacts.length === 0,
      });
      showToast('Emergency contact added successfully!', 'success');
      setShowAddContact(false);
      setContactName('');
      setPhone('');
      fetchData();
    } catch (err) {
      showToast('Failed to add contact', 'error');
    }
  };

  const handleTestSosDrill = () => {
    sounds.playSosSiren();
    showToast('🚨 SOS Siren Drill Triggered! Testing emergency audio synthesizer.', 'error');
  };

  // Toggle Live Location Sharing
  const handleToggleLocationSharing = async (targetActive?: boolean) => {
    if (!locationSharing) return;
    const nextActive = targetActive !== undefined ? targetActive : !locationSharing.is_active;
    setTogglingLocation(true);
    try {
      const res = await api.post('/api/safety/location-sharing/toggle', {
        is_active: nextActive,
        contact_ids: selectedContactIds.length > 0 ? selectedContactIds : contacts.map((c) => c.id),
      });
      setLocationSharing(res.data);
      const activeIds = res.data.shared_with
        ? res.data.shared_with.filter((c: any) => c.can_view).map((c: any) => c.id)
        : [];
      setSelectedContactIds(activeIds);

      if (nextActive) {
        showToast('Live simulated GPS location sharing activated with selected contacts.', 'success');
      } else {
        showToast('Live location sharing stopped.', 'info');
      }
    } catch (err) {
      showToast('Failed to update location sharing status.', 'error');
    } finally {
      setTogglingLocation(false);
    }
  };

  // Toggle Contact Permission for Location
  const handleContactCheckboxToggle = async (contactId: string) => {
    const newSelected = selectedContactIds.includes(contactId)
      ? selectedContactIds.filter((id) => id !== contactId)
      : [...selectedContactIds, contactId];

    setSelectedContactIds(newSelected);

    if (locationSharing?.is_active) {
      try {
        const res = await api.post('/api/safety/location-sharing/toggle', {
          is_active: true,
          contact_ids: newSelected,
        });
        setLocationSharing(res.data);
      } catch (err) {
        console.error('Error updating permissions:', err);
      }
    }
  };

  // Copy Simulated Tracking Link
  const handleCopyTrackingLink = () => {
    const link = `https://rido.app/track-sim/${user?.id?.slice(0, 8) || 'live'}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    showToast('Simulated tracking link copied to clipboard!', 'info');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Trigger SOS Drill (Opens Confirmation Modal)
  const handleOpenSosConfirm = () => {
    setShowSosConfirm(true);
  };

  // Execute Confirmed SOS Broadcast
  const handleConfirmSos = async () => {
    setShowSosConfirm(false);
    setTriggeringSos(true);
    try {
      sounds.playSosSiren();
      const res = await api.post('/api/safety/sos', {
        event_type: 'SOS_SIMULATION',
        lat: 12.9716,
        lng: 77.5946,
        description: 'Passenger triggered simulated emergency panic alert drill from Safety Center.',
        severity: 'HIGH',
      });
      setSosSummary(res.data);
      setShowSosSummary(true);
      showToast('🚨 SOS Panic Broadcast Sent! Transparent response summary generated.', 'error');
      fetchData();
    } catch (err) {
      showToast('Error triggering simulated SOS', 'error');
    } finally {
      setTriggeringSos(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 text-xs font-bold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Campus Safety & Accountability</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Safety Center & Emergency Protocols
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Institutional accountability, live simulated GPS location sharing, transparent emergency SOS panic drills, and safety incident logs.
        </p>
      </div>

      {/* Safety Verification & SOS Drill Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Verification Status Card */}
        <div className="lg:col-span-4 surface-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                Institutional Status
              </span>
              <span className={user?.is_verified ? 'badge-emerald' : 'badge-amber'}>
                {user?.is_verified ? 'VERIFIED' : 'UNVERIFIED'}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{user?.full_name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              College ID: <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{user?.college_id || 'Pending submission'}</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Department: <span className="text-slate-800 dark:text-slate-200 font-medium">{user?.department || 'General Campus'}</span>
            </p>
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Campus ride matching trust score verified</span>
          </div>
        </div>

        {/* SOS Emergency Panic Drill Card */}
        <div className="lg:col-span-8 surface-card p-6 sm:p-7 rounded-2xl border-2 border-rose-500/30 bg-rose-50/20 dark:bg-rose-950/20 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 animate-pulse" />
                Emergency SOS Panic Simulator
              </span>
              <span className="badge-rose font-bold">
                Academic Safe Drill
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
              High-Priority Emergency SOS Broadcast & Response Drill
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Triggers simulated emergency notifications to Campus Security, active fleet dispatchers, and your registered emergency contacts with simulated GPS coordinates and full action transparency.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              onClick={handleTestSosDrill}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <Volume2 className="w-4 h-4 text-amber-500" />
              <span>Test Audio Siren Only</span>
            </button>

            <button
              onClick={handleOpenSosConfirm}
              disabled={triggeringSos}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShieldAlert className="w-4 h-4 animate-bounce" />
              <span>{triggeringSos ? 'Processing Drill...' : '🚨 Trigger Simulated SOS Panic Alert'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* LIVE LOCATION SHARING SECTION */}
      <div className="surface-card p-6 sm:p-7 rounded-2xl border border-blue-500/20 shadow-md space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-cyan-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Live Location Sharing (Simulated GPS)
              </span>
              <span className={locationSharing?.is_active ? 'badge-emerald font-mono font-bold' : 'badge-amber font-mono font-bold'}>
                STATUS: {locationSharing?.status || 'STOPPED'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Share Real-Time Simulated Commute Coordinates
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Grant verified contacts visibility of your simulated transit coordinates along the campus corridor.
            </p>
          </div>

          {/* Start / Stop Control Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {locationSharing?.is_active ? (
              <>
                <button
                  onClick={handleCopyTrackingLink}
                  className="btn-secondary flex items-center gap-1.5"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy Tracking Link'}</span>
                </button>
                <button
                  onClick={() => handleToggleLocationSharing(false)}
                  disabled={togglingLocation}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-rose-600/25"
                >
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>{togglingLocation ? 'Stopping...' : 'Stop Sharing'}</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => handleToggleLocationSharing(true)}
                disabled={togglingLocation || contacts.length === 0}
                className="btn-primary flex items-center gap-2"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{togglingLocation ? 'Starting...' : 'Start Live Location Sharing (Simulation)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Academic Simulation Notice Banner */}
        <div className="p-3.5 rounded-xl surface-inset border border-blue-500/20 flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-200">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-blue-700 dark:text-blue-300">Simulated GPS Tracking Notice:</span>{' '}
            All location telemetry operates in <strong>safe simulated mode</strong> using pre-calculated campus route waypoints. Zero real GPS hardware sensors or cellular data are accessed.
          </div>
        </div>

        {/* Location Telemetry & Contact Permission Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Telemetry Display Card */}
          <div className="lg:col-span-5 p-5 rounded-xl surface-inset border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-3">
                Simulated Telemetry Feed
              </span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-600 dark:text-cyan-400 shrink-0">
                  <MapPin className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                    {locationSharing?.simulated_location.lat.toFixed(4) || '12.9716'}° N,{' '}
                    {locationSharing?.simulated_location.lng.toFixed(4) || '77.5946'}° E
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {locationSharing?.simulated_location.location_label || 'Campus Tech Corridor (Simulated)'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Simulated Speed</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {locationSharing?.is_active ? '24.0 km/h' : '0.0 km/h'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Corridor Heading</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">42.5° North-East</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-mono pt-3 border-t border-slate-200 dark:border-slate-800">
              Telemetry Status: {locationSharing?.is_active ? 'Streaming live waypoints' : 'Stream idle'}
            </p>
          </div>

          {/* Trusted Viewing Circle / Contact Selectors */}
          <div className="lg:col-span-7 p-5 rounded-xl surface-inset border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Who Can See Your Shared Location
              </span>
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                {selectedContactIds.length} of {contacts.length} contacts authorized
              </span>
            </div>

            {contacts.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-white dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800">
                <p className="text-xs text-slate-500">No emergency contacts registered yet.</p>
                <button
                  onClick={() => setShowAddContact(true)}
                  className="mt-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                  + Add Emergency Contact
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((c) => {
                  const isChecked = selectedContactIds.includes(c.id);
                  const isActivelyViewing = locationSharing?.is_active && isChecked;

                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                        isChecked
                          ? 'bg-white dark:bg-slate-900 border-cyan-500/40 shadow-sm'
                          : 'bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-70'
                      }`}
                    >
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleContactCheckboxToggle(c.id)}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-cyan-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{c.contact_name}</span>
                            {c.is_primary && (
                              <span className="badge-emerald text-[9px] !py-0.5 !px-1.5">
                                PRIMARY
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{c.relationship_type}</p>
                        </div>
                      </label>

                      <div className="text-right shrink-0">
                        <span
                          className={
                            isActivelyViewing
                              ? 'badge-emerald text-[9px] font-mono'
                              : isChecked
                              ? 'badge-blue text-[9px] font-mono'
                              : 'badge-secondary text-[9px] font-mono text-slate-500'
                          }
                        >
                          {isActivelyViewing
                            ? 'VIEWING LIVE'
                            : isChecked
                            ? 'AUTHORIZED'
                            : 'ACCESS REVOKED'}
                        </span>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {c.phone_number.slice(0, 4)} ••••• {c.phone_number.slice(-2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Contacts & Incident Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Contacts Column */}
        <div className="lg:col-span-5 surface-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
              <span>Emergency Contacts</span>
            </h3>
            <button
              onClick={() => setShowAddContact(true)}
              className="p-1.5 rounded-lg btn-secondary text-xs flex items-center gap-1 font-bold"
              title="Add Contact"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl surface-inset border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{c.contact_name}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{c.relationship_type}</p>
                  <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400 font-bold mt-1">{c.phone_number}</p>
                </div>
                {c.is_primary && (
                  <span className="badge-emerald text-[9px] font-bold">
                    PRIMARY
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Incidents Column */}
        <div className="lg:col-span-7 surface-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              <span>Safety Incidents & Drill Records</span>
            </h3>
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">{incidents.length} recorded</span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {incidents.map((i) => (
              <div key={i.id} className="p-3.5 rounded-xl surface-inset border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-xs">{i.event_type}</span>
                  <span
                    className={
                      i.status === 'RESOLVED' ? 'badge-emerald' : 'badge-rose'
                    }
                  >
                    {i.status}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-xs">{i.description}</p>
                {i.resolution_notes && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-500/20">
                    Resolution: {i.resolution_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="surface-card p-6 sm:p-7 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add Emergency Contact</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Contact receives simulated notifications during emergency drills.</p>
            </div>

            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Relationship</label>
                <select
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  className="input-field"
                >
                  <option value="Parent / Guardian">Parent / Guardian</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Hostel Warden">Hostel Warden / Faculty Mentor</option>
                  <option value="Roommate / Friend">Roommate / Friend</option>
                  <option value="Campus Security">Campus Security</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="input-field"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddContact(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pre-SOS Confirmation Modal */}
      <SosConfirmationModal
        isOpen={showSosConfirm}
        onClose={() => setShowSosConfirm(false)}
        onConfirm={handleConfirmSos}
        loading={triggeringSos}
      />

      {/* Transparent Emergency Response Summary Modal */}
      <EmergencyResponseSummaryModal
        isOpen={showSosSummary}
        onClose={() => setShowSosSummary(false)}
        summary={sosSummary}
      />
    </div>
  );
};

export default SafetyCenterPage;
