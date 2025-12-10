 const API_BASE_URL = 'http://localhost:5000/api';

// Store token in localStorage
export const setToken = (token) => {
  localStorage.setItem('token', token);
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

// API calls
export const login = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (response.ok) {
    setToken(data.token);
    // Store user data in localStorage for persistence
    localStorage.setItem('user', JSON.stringify(data.user));
  }
  return { ok: response.ok, data };
};

export const register = async (name, email, password, role = 'employee') => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role }),
  });
  const data = await response.json();
  if (response.ok) {
    setToken(data.token);
    // Store user data in localStorage for persistence
    localStorage.setItem('user', JSON.stringify(data.user));
  }
  return { ok: response.ok, data };
};

export const getTasks = async () => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch tasks');
  return await response.json();
};

export const getEmployees = async () => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/tasks/employees`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch employees');
  return await response.json();
};

export const createTask = async (taskData) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(taskData),
  });
  if (!response.ok) throw new Error('Failed to create task');
  return await response.json();
};

export const updateTask = async (taskId, updates) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update task');
  return await response.json();
};

export const deleteTask = async (taskId) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to delete task');
  return await response.json();
};

export const shareFile = async (fileName, fileUrl, sharedWith, description = '') => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fileName, fileUrl, sharedWith, description }),
  });
  if (!response.ok) throw new Error('Failed to share file');
  return await response.json();
};

export const getSharedFiles = async () => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/files`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch files');
  return await response.json();
};

export const deleteFile = async (fileId) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to delete file');
  return await response.json();
};

export const updateProfile = async (profileData) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });
  if (!response.ok) throw new Error('Failed to update profile');
  return await response.json();
};

export const getAnnouncements = async () => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/announcements`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch announcements');
  return await response.json();
};

export const createAnnouncement = async (text) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/announcements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error('Failed to create announcement');
  return await response.json();
};

export const getNewsletters = async () => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/newsletters`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch newsletters');
  return await response.json();
};

export const createNewsletter = async (title, content) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/newsletters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, content }),
  });
  if (!response.ok) throw new Error('Failed to create newsletter');
  return await response.json();
};

export const createSuggestion = async (title, description, category, targetEmployee = null) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/suggestions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, description, category, targetEmployee }),
  });
  if (!response.ok) throw new Error('Failed to create suggestion');
  return await response.json();
};

export const logout = () => {
  removeToken();
};

export const getSuggestions = async () => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/suggestions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch suggestions');
  return await response.json();
};

export const updateSuggestion = async (suggestionId, status) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/suggestions/${suggestionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update suggestion');
  return await response.json();
};

export const deleteSuggestion = async (suggestionId) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/suggestions/${suggestionId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to delete suggestion');
  return await response.json();
};
