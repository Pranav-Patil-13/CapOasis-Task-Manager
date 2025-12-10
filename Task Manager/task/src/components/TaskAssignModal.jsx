import React, { useState } from 'react';
import { createTask } from '../utils/api';
import './TaskAssignModal.css';

export default function TaskAssignModal({ isOpen, onClose, onSubmit, employees = [] }) {
  const [formData, setFormData] = useState({
    taskName: '',
    description: '',
    assignTo: '',
    priority: 'medium',
    dueDate: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.taskName.trim()) newErrors.taskName = 'Task name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.assignTo) newErrors.assignTo = 'Please assign to an employee';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      const taskData = {
        title: formData.taskName,
        description: formData.description,
        priority: formData.priority,
        assignedTo: formData.assignTo,
        dueDate: formData.dueDate,
      };
      const newTask = await createTask(taskData);
      onSubmit(newTask);
      resetForm();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      taskName: '',
      description: '',
      assignTo: '',
      priority: 'medium',
      dueDate: '',
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Assign New Task</h2>
          <button className="close-btn" onClick={handleClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          {/* Task Name */}
          <div className="form-group">
            <label htmlFor="taskName">Task Name *</label>
            <input
              type="text"
              id="taskName"
              name="taskName"
              value={formData.taskName}
              onChange={handleChange}
              placeholder="Enter task name"
              className={errors.taskName ? 'input-error' : ''}
            />
            {errors.taskName && <span className="error-msg">{errors.taskName}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter task description"
              rows="4"
              className={errors.description ? 'input-error' : ''}
            />
            {errors.description && <span className="error-msg">{errors.description}</span>}
          </div>

          {/* Two Column Layout for Priority, Assign To, Due Date */}
          <div className="form-row">
            {/* Assign To */}
            <div className="form-group">
              <label htmlFor="assignTo">Assign To *</label>
              <select
                id="assignTo"
                name="assignTo"
                value={formData.assignTo}
                onChange={handleChange}
                className={errors.assignTo ? 'input-error' : ''}
              >
                <option value="">Select an employee</option>
                {employees.map((emp) => {
                  // Handle both string and object formats
                  const id = typeof emp === 'object' ? emp._id : emp;
                  const name = typeof emp === 'object' ? emp.name : emp;
                  return (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  );
                })}
              </select>
              {errors.assignTo && <span className="error-msg">{errors.assignTo}</span>}
            </div>

            {/* Priority */}
            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div className="form-group">
            <label htmlFor="dueDate">Due Date *</label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className={errors.dueDate ? 'input-error' : ''}
            />
            {errors.dueDate && <span className="error-msg">{errors.dueDate}</span>}
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Assigning...' : 'Assign Task'}
            </button>
          </div>

          {errors.submit && <div className="error">{errors.submit}</div>}
        </form>
      </div>
    </div>
  );
}
