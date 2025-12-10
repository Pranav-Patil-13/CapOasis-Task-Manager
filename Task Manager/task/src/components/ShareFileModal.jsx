import React, { useState } from 'react';
import { getToken } from '../utils/api';
import './ShareFileModal.css';

const API_BASE_URL = 'http://localhost:5000/api';

export default function ShareFileModal({ isOpen, onClose, employees, onFileShared }) {
  const [formData, setFormData] = useState({
    fileName: '',
    fileUrl: '',
    sharedWith: '',
    description: '',
    uploadType: 'url', // 'url' or 'upload'
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleUploadTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      uploadType: type,
      fileName: '',
      fileUrl: '',
    }));
    setFile(null);
    setError('');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB');
        return;
      }
      setFile(selectedFile);
      setFormData(prev => ({
        ...prev,
        fileName: selectedFile.name,
      }));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.sharedWith) {
      setError('Please select an employee');
      return;
    }

    if (formData.uploadType === 'url') {
      if (!formData.fileName.trim() || !formData.fileUrl.trim()) {
        setError('Please fill in all required fields');
        return;
      }
    } else {
      if (!file) {
        setError('Please select a file to upload');
        return;
      }
    }

    setLoading(true);

    try {
      const token = getToken();
      const uploadFormData = new FormData();

      if (formData.uploadType === 'upload' && file) {
        uploadFormData.append('file', file);
      } else {
        uploadFormData.append('fileName', formData.fileName);
        uploadFormData.append('fileUrl', formData.fileUrl);
      }

      uploadFormData.append('sharedWith', formData.sharedWith);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('fileType', formData.uploadType);

      const response = await fetch(`${API_BASE_URL}/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to share file');
      }

      const result = await response.json();
      onFileShared(result);
      setFormData({
        fileName: '',
        fileUrl: '',
        sharedWith: '',
        description: '',
        uploadType: 'url',
      });
      setFile(null);
    } catch (err) {
      setError(err.message || 'Failed to share file');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content share-file-modal">
        <div className="modal-header">
          <h2>Share File with Employee</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="share-form">
          {/* Upload Type Toggle */}
          <div className="upload-type-toggle">
            <button
              type="button"
              className={`toggle-btn ${formData.uploadType === 'url' ? 'active' : ''}`}
              onClick={() => handleUploadTypeChange('url')}
              disabled={loading}
            >
              <i className="fas fa-link"></i> URL / Link
            </button>
            <button
              type="button"
              className={`toggle-btn ${formData.uploadType === 'upload' ? 'active' : ''}`}
              onClick={() => handleUploadTypeChange('upload')}
              disabled={loading}
            >
              <i className="fas fa-upload"></i> Upload File
            </button>
          </div>

          {formData.uploadType === 'url' ? (
            <>
              <div className="form-group">
                <label htmlFor="fileName">File Name *</label>
                <input
                  type="text"
                  id="fileName"
                  name="fileName"
                  placeholder="e.g., Project Guidelines"
                  value={formData.fileName}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="fileUrl">File URL / Link *</label>
                <input
                  type="url"
                  id="fileUrl"
                  name="fileUrl"
                  placeholder="https://example.com/file.pdf"
                  value={formData.fileUrl}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label htmlFor="fileInput">Select File to Upload *</label>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="fileInput"
                  onChange={handleFileChange}
                  disabled={loading}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,.jpg,.jpeg,.png,.gif"
                />
                <span className="file-name">{file ? file.name : 'No file selected'}</span>
              </div>
              <p className="file-help">Max size: 50MB. Supported: PDF, DOC, XLS, ZIP, Images</p>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="sharedWith">Share with Employee *</label>
            <select
              id="sharedWith"
              name="sharedWith"
              value={formData.sharedWith}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="">Select an employee</option>
              {employees.map((emp) => {
                const id = typeof emp === 'object' ? emp._id : emp;
                const name = typeof emp === 'object' ? emp.name : emp;
                return (
                  <option key={id} value={id}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              name="description"
              placeholder="Add any description or notes about this file..."
              value={formData.description}
              onChange={handleChange}
              disabled={loading}
              rows="3"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Sharing...' : <><i className="fas fa-folder"></i> Share File</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

