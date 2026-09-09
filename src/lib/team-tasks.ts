import mongoose from 'mongoose';
import TeamSection from '@/models/TeamSection';
import type { TeamTask } from '@/types/team-task';

type PopulatedRef = { _id?: unknown; username?: unknown; email?: unknown } | null | undefined;

const UNKNOWN_MEMBER = { id: '', username: 'Unknown user', email: '' };

/**
 * Turns a populated ref (`{ _id, username, email }`) into the client shape
 * (`{ id, username, email }`). Returns a placeholder when the ref is null,
 * which happens when the referenced user has since been deleted - without
 * this the client crashes on `task.assignedTo.username`.
 */
function serializeMember(ref: PopulatedRef) {
  if (!ref || typeof ref !== 'object' || ref._id == null) return { ...UNKNOWN_MEMBER };
  return {
    id: String(ref._id),
    username: typeof ref.username === 'string' ? ref.username : 'Unknown user',
    email: typeof ref.email === 'string' ? ref.email : '',
  };
}

const toIso = (value: unknown): string | null => {
  if (!value) return null;
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/**
 * Normalises a client-supplied `section` value for a task write.
 * - `undefined`  -> field absent from the update (returns undefined)
 * - `null` / ''  -> explicitly no section (returns null)
 * - valid id of an existing section -> that id
 * - anything else (bad id, missing section) -> undefined (ignored)
 */
export async function resolveSection(value: unknown): Promise<string | null | undefined> {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !mongoose.Types.ObjectId.isValid(value)) return undefined;
  return (await TeamSection.exists({ _id: value })) ? value : undefined;
}

/** Serializes a lean TeamTask document (with populated refs) for the API response. */
export function serializeTeamTask(task: Record<string, unknown>): TeamTask {
  return {
    id: String(task._id),
    title: typeof task.title === 'string' ? task.title : '',
    description: typeof task.description === 'string' ? task.description : '',
    assignedTo: serializeMember(task.assignedTo as PopulatedRef),
    createdBy: serializeMember(task.createdBy as PopulatedRef),
    section: task.section == null ? null : String(task.section),
    priority: task.priority as TeamTask['priority'],
    status: task.status as TeamTask['status'],
    dueDate: toIso(task.dueDate),
    notes: typeof task.notes === 'string' ? task.notes : '',
    completedAt: toIso(task.completedAt),
    createdAt: toIso(task.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(task.updatedAt) ?? new Date(0).toISOString(),
  };
}
