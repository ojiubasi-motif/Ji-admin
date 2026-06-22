import React, { useState, useEffect } from 'react';
import { Mail, Shield, Calendar, CheckCircle } from 'lucide-react';
import { fetchApi } from '../lib/apiClient';

interface ProfileProps {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    createdAt?: string;
  } | null;
  onUpdateUser: (updatedUser: any) => void;
}

export default function Profile({ user, onUpdateUser }: ProfileProps) {
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetchApi('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        }),
      });

      if (res?.data?.user) {
        onUpdateUser(res.data.user);
        setSuccess(true);
      } else {
        throw new Error('Failed to update profile details.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-sm text-[#9A8F87]">
        Loading profile details…
      </div>
    );
  }

  const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'N/A';

  const initials = ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() || user.email[0].toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#1C1916]" style={{ fontFamily: "'Georgia', serif" }}>
          Profile Details
        </h2>
        <p className="text-sm text-[#6B6460] mt-0.5">Manage your personal details and account settings</p>
      </div>

      <div className="bg-white rounded-3xl border border-[#E5DFD5] overflow-hidden shadow-sm">
        {/* Profile Card Header */}
        <div className="bg-[#FAF8F5] border-b border-[#E5DFD5] p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#C8521A] flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-[#C8521A]/20 shrink-0 select-none">
            {initials}
          </div>
          <div className="text-center sm:text-left min-w-0">
            <h3 className="text-lg font-bold text-[#1C1916]">
              {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Administrator'}
            </h3>
            <p className="text-sm text-[#6B6460] flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
              <Mail size={14} className="text-[#9A8F87]" />
              <span className="truncate">{user.email}</span>
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Obi"
                className="w-full border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm text-[#1C1916] focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A] transition-all bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Ubasis"
                className="w-full border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm text-[#1C1916] focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A] transition-all bg-white"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#F7F3EC] space-y-3">
            <div className="flex items-center gap-3 text-sm text-[#6B6460] py-1">
              <Shield size={16} className="text-[#C8521A] shrink-0" />
              <span>Role: <strong className="text-[#1C1916] font-medium">{user.role}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#6B6460] py-1">
              <Calendar size={16} className="text-[#C8521A] shrink-0" />
              <span>Member since: <strong className="text-[#1C1916] font-medium">{joinDate}</strong></span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
              {error}
            </p>
          )}

          {success && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-2.5">
              <CheckCircle size={15} />
              <span>Profile details saved successfully!</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#C8521A] text-white rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-[#b04817] transition-all active:scale-[0.98] disabled:opacity-70 flex items-center gap-2"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
