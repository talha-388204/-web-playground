// This file handles local storage operations, including saving and loading projects, and managing the draft system.

const STORAGE_KEY = 'advancedWebPlaygroundProject';

// Save the current project state to local storage
function saveProjectToLocalStorage(project) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}

// Load the project state from local storage
function loadProjectFromLocalStorage() {
    const projectData = localStorage.getItem(STORAGE_KEY);
    if (!projectData) return null;
    try {
        return JSON.parse(projectData);
    } catch (e) {
        // corrupted/non-JSON data detected. Remove it and return null so caller falls back to defaults
        try { localStorage.removeItem(STORAGE_KEY); } catch (err) {}
        return null;
    }
}

// Clear the project data from local storage
function clearProjectFromLocalStorage() {
    localStorage.removeItem(STORAGE_KEY);
}

// Save a draft of the current project state
function saveDraft(draft) {
    localStorage.setItem(`${STORAGE_KEY}_draft`, JSON.stringify(draft));
}

// Load the draft from local storage
function loadDraft() {
    const draftData = localStorage.getItem(`${STORAGE_KEY}_draft`);
    return draftData ? JSON.parse(draftData) : null;
}

// Clear the draft from local storage
function clearDraft() {
    localStorage.removeItem(`${STORAGE_KEY}_draft`);
}