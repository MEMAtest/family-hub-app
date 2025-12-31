'use client';

import { useState } from 'react';
import { ProjectsList } from '../projects/ProjectsList';
import { ProjectDetailView } from '../projects/ProjectDetailView';
import { CreateProjectModal } from '../projects/CreateProjectModal';
import { useFamilyStore } from '@/store/familyStore';
import type { PropertyProject } from '@/types/property.types';

interface PropertyProjectsTabProps {
  isReadOnly?: boolean;
}

export const PropertyProjectsTab = ({ isReadOnly = false }: PropertyProjectsTabProps) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Get projects and actions from store
  const propertyProjects = useFamilyStore((state) => state.propertyProjects);
  const activeProjectId = useFamilyStore((state) => state.activeProjectId);
  const setActiveProject = useFamilyStore((state) => state.setActiveProject);
  const addPropertyProject = useFamilyStore((state) => state.addPropertyProject);
  const updatePropertyProject = useFamilyStore((state) => state.updatePropertyProject);

  // Project email actions
  const addProjectEmail = useFamilyStore((state) => state.addProjectEmail);
  const removeProjectEmail = useFamilyStore((state) => state.removeProjectEmail);

  // Project task actions
  const addProjectTask = useFamilyStore((state) => state.addProjectTask);
  const updateProjectTask = useFamilyStore((state) => state.updateProjectTask);
  const removeProjectTask = useFamilyStore((state) => state.removeProjectTask);

  // Project CRM actions
  const addProjectContact = useFamilyStore((state) => state.addProjectContact);
  const updateProjectContact = useFamilyStore((state) => state.updateProjectContact);
  const removeProjectContact = useFamilyStore((state) => state.removeProjectContact);
  const addProjectQuote = useFamilyStore((state) => state.addProjectQuote);
  const updateProjectQuote = useFamilyStore((state) => state.updateProjectQuote);
  const removeProjectQuote = useFamilyStore((state) => state.removeProjectQuote);
  const addProjectVisit = useFamilyStore((state) => state.addProjectVisit);
  const updateProjectVisit = useFamilyStore((state) => state.updateProjectVisit);
  const removeProjectVisit = useFamilyStore((state) => state.removeProjectVisit);
  const addProjectFollowUp = useFamilyStore((state) => state.addProjectFollowUp);
  const updateProjectFollowUp = useFamilyStore((state) => state.updateProjectFollowUp);
  const removeProjectFollowUp = useFamilyStore((state) => state.removeProjectFollowUp);

  const activeProject = activeProjectId
    ? propertyProjects.find((p) => p.id === activeProjectId)
    : null;

  const handleSelectProject = (project: PropertyProject) => {
    setActiveProject(project.id);
  };

  const handleBack = () => {
    setActiveProject(null);
  };

  const handleCreateProject = (project: PropertyProject) => {
    addPropertyProject(project);
    setActiveProject(project.id);
  };

  // If viewing a specific project
  if (activeProject) {
    return (
      <ProjectDetailView
        project={activeProject}
        onBack={handleBack}
        onUpdateProject={(updates) => updatePropertyProject(activeProject.id, updates)}
        onAddEmail={(email) => addProjectEmail(activeProject.id, email)}
        onRemoveEmail={(emailId) => removeProjectEmail(activeProject.id, emailId)}
        onAddContact={(contact) => addProjectContact(activeProject.id, contact)}
        onUpdateContact={(contactId, updates) => updateProjectContact(activeProject.id, contactId, updates)}
        onRemoveContact={(contactId) => removeProjectContact(activeProject.id, contactId)}
        onAddQuote={(quote) => addProjectQuote(activeProject.id, quote)}
        onUpdateQuote={(quoteId, updates) => updateProjectQuote(activeProject.id, quoteId, updates)}
        onRemoveQuote={(quoteId) => removeProjectQuote(activeProject.id, quoteId)}
        onAddVisit={(visit) => addProjectVisit(activeProject.id, visit)}
        onUpdateVisit={(visitId, updates) => updateProjectVisit(activeProject.id, visitId, updates)}
        onRemoveVisit={(visitId) => removeProjectVisit(activeProject.id, visitId)}
        onAddFollowUp={(followUp) => addProjectFollowUp(activeProject.id, followUp)}
        onUpdateFollowUp={(followUpId, updates) => updateProjectFollowUp(activeProject.id, followUpId, updates)}
        onRemoveFollowUp={(followUpId) => removeProjectFollowUp(activeProject.id, followUpId)}
        onAddTask={(task) => addProjectTask(activeProject.id, task)}
        onUpdateTask={(taskId, updates) => updateProjectTask(activeProject.id, taskId, updates)}
        onRemoveTask={(taskId) => removeProjectTask(activeProject.id, taskId)}
        isReadOnly={isReadOnly}
      />
    );
  }

  // Show projects list
  return (
    <>
      <ProjectsList
        projects={propertyProjects}
        onSelectProject={handleSelectProject}
        onCreateProject={() => setShowCreateModal(true)}
      />

      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateProject={handleCreateProject}
      />
    </>
  );
};
