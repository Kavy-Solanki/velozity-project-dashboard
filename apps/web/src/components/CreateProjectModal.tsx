import React, { useState, useEffect } from "react";
import { Client } from "../types";
import { api } from "../services/api";
import { X } from "lucide-react";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.clients.list().then((res) => {
        setClients(res);
        if (res.length > 0) setClientId(res[0].id);
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateClient = async () => {
    if (!newClientName.trim()) return;
    try {
      const client = await api.clients.create({ name: newClientName });
      setClients((prev) => [...prev, client]);
      setClientId(client.id);
      setIsCreatingClient(false);
      setNewClientName("");
    } catch (err: any) {
      setError(err.message || "Failed to create client");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !clientId) {
      setError("Please specify project name and client");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.projects.create({
        name,
        description: description || undefined,
        clientId,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3 className="m-0 font-semibold">Create New Project</h3>
          <button className="icon-button-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text"
              placeholder="e.g. Next-Gen Mobile Banking"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              rows={3}
              placeholder="High-level project scope..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Client *</label>
            {!isCreatingClient ? (
              <div className="flex gap-2">
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select Client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-secondary text-xs whitespace-nowrap"
                  onClick={() => setIsCreatingClient(true)}
                >
                  + New Client
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New Client Name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-primary text-xs"
                  onClick={handleCreateClient}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setIsCreatingClient(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
