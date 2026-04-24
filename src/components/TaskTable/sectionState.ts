import type { Section } from '../../types/task.ts'

export function appendSection(
  currentSections: Section[],
  nextSection: Section,
): Section[] {
  return [...currentSections, nextSection]
}

export function renameSectionInList(
  currentSections: Section[],
  sectionGuid: string,
  name: string,
): Section[] {
  return currentSections.map((section) =>
    section.guid === sectionGuid ? { ...section, name } : section,
  )
}

export function ensureSectionVisible(
  currentVisibleSections: Set<string>,
  sectionGuid: string,
): Set<string> {
  if (currentVisibleSections.has(sectionGuid)) {
    return currentVisibleSections
  }
  const nextVisibleSections = new Set(currentVisibleSections)
  nextVisibleSections.add(sectionGuid)
  return nextVisibleSections
}

export function shouldEnterSectionEditMode(
  creatingSection: boolean,
  pendingSectionGuid: string | null,
  sectionExists: boolean,
): boolean {
  return !creatingSection && Boolean(pendingSectionGuid) && sectionExists
}
