import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axiosClient from '../api/axiosClient';
import { getLogoUrl } from '../utils/logoUrl';
import { User, Building, Lock, Mail, Phone, MapPin, Save, Shield, Upload, Trash2, Image as ImageIcon } from 'lucide-react';

const Profile = () => {
  const { user, updateProfileState, isAdmin } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    businessName: user?.businessName || '',
    businessAddress: user?.businessAddress || '',
    businessPhone: user?.businessPhone || '',
    businessEmail: user?.businessEmail || ''
  });

  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsUpdatingProfile(true);
      const res = await axiosClient.put('/auth/profile', profileForm);
      if (res.data.success) {
        showToast('Profile & Business information updated!', 'success');
        updateProfileState(res.data.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePassSubmit = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      showToast('New password and confirm password do not match', 'error');
      return;
    }
    if (passForm.newPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      setIsChangingPass(true);
      const res = await axiosClient.put('/auth/change-password', {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword
      });
      if (res.data.success) {
        showToast('Password changed successfully!', 'success');
        setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleLogoFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      showToast('Invalid file format. Please upload PNG, JPG/JPEG, or WEBP image', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showToast('File size is too large. Maximum allowed size is 5 MB', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsUploadingLogo(true);
      const formData = new FormData();
      formData.append('logo', file);

      const res = await axiosClient.post('/auth/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        showToast('Business logo updated successfully!', 'success');
        updateProfileState(res.data.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to upload logo', 'error');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    try {
      setIsRemovingLogo(true);
      const res = await axiosClient.delete('/auth/logo');
      if (res.data.success) {
        showToast('Business logo removed', 'success');
        updateProfileState(res.data.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove logo', 'error');
    } finally {
      setIsRemovingLogo(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Account & Business Profile</h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
          Manage your account profile, business logo, invoice headers, and security settings
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }} className="grid-responsive">
        
        {/* LEFT: Business & Profile Settings */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building size={20} color="var(--primary)" /> Business Information (Invoice Headers)
            </h3>
            {isAdmin && <span className="badge badge-admin"><Shield size={12} /> Admin Account</span>}
          </div>

          <form onSubmit={handleProfileSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="grid-responsive-2">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Account Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={user?.email || ''}
                  disabled
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="grid-responsive-2">
              <div className="form-group">
                <label className="form-label">Business / Studio Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileForm.businessName}
                  onChange={(e) => setProfileForm({ ...profileForm, businessName: e.target.value })}
                  placeholder="e.g. Alex Creative Works"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Personal Phone</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="9876543210"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Business Address (Appears on Invoice Header)</label>
              <textarea
                rows="2"
                className="form-textarea"
                value={profileForm.businessAddress}
                onChange={(e) => setProfileForm({ ...profileForm, businessAddress: e.target.value })}
                placeholder="Full address to print on top of your invoices..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="grid-responsive-2">
              <div className="form-group">
                <label className="form-label">Invoice Business Phone</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileForm.businessPhone}
                  onChange={(e) => setProfileForm({ ...profileForm, businessPhone: e.target.value })}
                  placeholder="Phone to display on invoices"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Invoice Business Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={profileForm.businessEmail}
                  onChange={(e) => setProfileForm({ ...profileForm, businessEmail: e.target.value })}
                  placeholder="Email to display on invoices"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={isUpdatingProfile}>
              <Save size={16} /> {isUpdatingProfile ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Business Logo & Password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* BUSINESS LOGO CARD */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ImageIcon size={20} color="var(--primary)" /> Business Logo
              </h3>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={handleLogoFileChange}
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
              {user?.businessLogo ? (
                <div
                  style={{
                    width: '100%',
                    maxHeight: '130px',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  <img
                    src={getLogoUrl(user.businessLogo)}
                    alt="Business Logo Preview"
                    style={{ maxHeight: '100px', maxWidth: '100%', objectFit: 'contain' }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '110px',
                    borderRadius: 'var(--radius-md)',
                    border: '2px dashed var(--border-color)',
                    backgroundColor: 'var(--bg-tertiary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-subtle)',
                    padding: '1rem',
                    textAlign: 'center'
                  }}
                >
                  <ImageIcon size={32} style={{ opacity: 0.5, marginBottom: '6px' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>No Business Logo Uploaded</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PNG, JPG, or WEBP (Max 5MB)</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', width: '100%', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo || isRemovingLogo}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <Upload size={16} />
                  {isUploadingLogo ? 'Uploading...' : user?.businessLogo ? 'Change Logo' : 'Upload Logo'}
                </button>

                {user?.businessLogo && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleRemoveLogo}
                    disabled={isUploadingLogo || isRemovingLogo}
                    style={{ padding: '0.5rem 0.875rem' }}
                    title="Remove Logo"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* CHANGE PASSWORD CARD */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={20} color="var(--warning)" /> Change Password
              </h3>
            </div>

            <form onSubmit={handlePassSubmit}>
              <div className="form-group">
                <label className="form-label">Current Password *</label>
                <input
                  type="password"
                  className="form-input"
                  value={passForm.currentPassword}
                  onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password *</label>
                <input
                  type="password"
                  className="form-input"
                  value={passForm.newPassword}
                  onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password *</label>
                <input
                  type="password"
                  className="form-input"
                  value={passForm.confirmPassword}
                  onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-secondary" style={{ width: '100%' }} disabled={isChangingPass}>
                {isChangingPass ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>

        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .grid-responsive {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Profile;
