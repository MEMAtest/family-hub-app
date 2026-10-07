'use client';

import { useEffect, useState } from 'react';
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
  const [urlProjectId, setUrlProjectId] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : new URL(window.location.href).searchParams.get('bathroomProject'));

  // Get projects and actions from store
  const propertyProjects = useFamilyStore((state) => state.propertyProjects);
  const activeProjectId = useFamilyStore((state) => state.activeProjectId);
  const setActiveProject = useFamilyStore((state) => state.setActiveProject);
  const addPropertyProject = useFamilyStore((state) => state.addPropertyProject);
  const updatePropertyProject = useFamilyStore((state) => state.updatePropertyProject);

  // Project email actions
  const addProjectEmail = useFamilyStore((state) => state.addProjectEmail);
  const updateProjectEmail = useFamilyStore((state) => state.updateProjectEmail);
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

  // Resolve only within loaded household projects; a URL can arrive before hydration.
  const selectedProjectId = urlProjectId ?? activeProjectId;
  const activeProject = selectedProjectId
    ? propertyProjects.find((p) => p.id === selectedProjectId)
    : null;

  useEffect(() => {
    const restore = () => {
      const id = new URL(window.location.href).searchParams.get('bathroomProject');
      setUrlProjectId(id);
      setActiveProject(id);
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [setActiveProject]);

  useEffect(() => {
    if (urlProjectId && activeProject && activeProjectId !== urlProjectId) setActiveProject(urlProjectId);
  }, [urlProjectId, activeProject, activeProjectId, setActiveProject]);

  const handleSelectProject = (project: PropertyProject) => {
    const url = new URL(window.location.href);
    url.searchParams.set('bathroomProject', project.id);
    ['bathroomView', 'bathroomItem', 'bathroomPart'].forEach((key) => url.searchParams.delete(key));
    window.history.pushState({ ...window.history.state, bathroomNavigation: undefined }, '', url);
    setUrlProjectId(project.id);
    setActiveProject(project.id);
  };

  const handleBack = () => {
    const url = new URL(window.location.href);
    ['bathroomProject', 'bathroomView', 'bathroomItem', 'bathroomPart'].forEach((key) => url.searchParams.delete(key));
    window.history.replaceState({ ...window.history.state, bathroomNavigation: undefined }, '', url);
    setUrlProjectId(null);
    setActiveProject(null);
  };

  const handleCreateProject = (project: PropertyProject) => {
    addPropertyProject(project);
    handleSelectProject(project);
  };

  // If viewing a specific project
  if (activeProject) {
    return (
      <ProjectDetailView
        project={activeProject}
        onBack={handleBack}
        onUpdateProject={(updates) => updatePropertyProject(activeProject.id, updates)}
        onAddEmail={(email) => addProjectEmail(activeProject.id, email)}
        onUpdateEmail={(emailId, updates) => updateProjectEmail(activeProject.id, emailId, updates)}
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
