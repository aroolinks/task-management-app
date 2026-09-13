'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/LoginForm';
import Logo from '@/components/Logo';
import { useTeamTasks } from '@/hooks/useTeamTasks';
import { TeamMember, TeamSection, TeamTask, TeamTaskInput, TeamTaskPriority, TeamTaskStatus } from '@/types/team-task';

const statuses: TeamTaskStatus[] = ['To Do', 'In Progress', 'Completed', 'On Hold'];
const priorities: TeamTaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];
const emptyForm: TeamTaskInput = { title: '', description: '', assignedTo: '', section: null, priority: 'Medium', status: 'To Do', dueDate: '', notes: '' };
const fieldClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const toolbarSelect = 'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500';
const statusClass: Record<TeamTaskStatus, string> = { 'To Do': 'bg-slate-100 text-slate-700', 'In Progress': 'bg-blue-100 text-blue-700', Completed: 'bg-emerald-100 text-emerald-700', 'On Hold': 'bg-amber-100 text-amber-700' };
const priorityClass: Record<TeamTaskPriority, string> = { Low: 'bg-sky-50 text-sky-700', Medium: 'bg-amber-50 text-amber-700', High: 'bg-orange-50 text-orange-700', Urgent: 'bg-red-50 text-red-700' };

const AVATAR_COLORS = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-teal-500', 'bg-sky-500', 'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-slate-500'];
const avatarColor = (id: string) => AVATAR_COLORS[[...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];
const initials = (name: string) => name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

function toForm(task: TeamTask): TeamTaskInput {
  return { title: task.title, description: task.description, assignedTo: task.assignedTo.id, section: task.section, priority: task.priority, status: task.status, dueDate: task.dueDate?.slice(0, 10) || '', notes: task.notes };
}

// Real timestamps (created / updated / completed) - shown in the viewer's timezone.
function formatDate(value: string | null, short = false) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', short ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

// Local YYYY-MM-DD key for a Date, for timezone-safe calendar-day comparisons.
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Due dates are calendar days, not instants - format from the YYYY-MM-DD part
// directly so a task due "the 15th" doesn't render as the 14th west of UTC.
function formatDay(value: string | null, short = false) {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '—';
  return new Intl.DateTimeFormat('en-GB', short ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(y, m - 1, d));
}

function isOverdue(task: TeamTask) {
  if (!task.dueDate || task.status === 'Completed') return false;
  return task.dueDate.slice(0, 10) < dateKey(new Date());
}

const Chevron = ({ className = '' }: { className?: string }) => <svg viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>;
const EditIcon = () => <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-8.5 8.5a1 1 0 01-.464.263l-3.1.886a.5.5 0 01-.618-.618l.886-3.1a1 1 0 01.263-.464l8.5-8.5z" /></svg>;
const TrashIcon = () => <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor"><path fillRule="evenodd" d="M8.5 2a1 1 0 00-.94.66L7.2 4H4a1 1 0 000 2h12a1 1 0 100-2h-3.2l-.36-1.34A1 1 0 0011.5 2h-3zM6 7l.7 9.13A2 2 0 008.69 18h2.62a2 2 0 001.99-1.87L14 7H6z" clipRule="evenodd" /></svg>;

function TaskForm({ initial, members, sections, busy, onCancel, onSubmit }: { initial: TeamTaskInput; members: TeamMember[]; sections: TeamSection[]; busy: boolean; onCancel: () => void; onSubmit: (value: TeamTaskInput) => void }) {
  const [form, setForm] = useState(initial);
  const set = <K extends keyof TeamTaskInput>(key: K, value: TeamTaskInput[K]) => setForm(v => ({ ...v, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); if (form.title.trim() && form.assignedTo) onSubmit({ ...form, title: form.title.trim(), dueDate: form.dueDate || null }); };
  return <form onSubmit={submit} className="space-y-4">
    <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Task title <span className="text-red-500">*</span></label><input autoFocus required maxLength={200} value={form.title} onChange={e => set('title', e.target.value)} className={fieldClass} placeholder="What needs to be done?" /></div>
    <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label><textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} className={fieldClass} placeholder="Add context or acceptance criteria…" /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Assign to <span className="text-red-500">*</span></label><select required value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)} className={fieldClass}><option value="">Select team member</option>{members.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}</select></div>
      <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Section</label><select value={form.section ?? ''} onChange={e => set('section', e.target.value || null)} className={fieldClass}><option value="">No section</option>{sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Due date</label><input type="date" value={form.dueDate || ''} onChange={e => set('dueDate', e.target.value)} className={fieldClass} /></div>
      <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Priority</label><select value={form.priority} onChange={e => set('priority', e.target.value as TeamTaskPriority)} className={fieldClass}>{priorities.map(p => <option key={p}>{p}</option>)}</select></div>
      <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label><select value={form.status} onChange={e => set('status', e.target.value as TeamTaskStatus)} className={fieldClass}>{statuses.map(s => <option key={s}>{s}</option>)}</select></div>
    </div>
    <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label><textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} className={fieldClass} placeholder="Optional internal notes…" /></div>
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button><button disabled={busy || !form.title.trim() || !form.assignedTo} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{busy ? 'Saving…' : initial.title ? 'Save changes' : 'Create task'}</button></div>
  </form>;
}

type GroupBy = 'section' | 'status' | 'assignee' | 'priority' | 'none';
type CellField = 'title' | 'assignedTo' | 'dueDate' | 'priority' | 'status';
type Group = { key: string; label: string; sectionId?: string | null; canManage?: boolean; addStatus?: TeamTaskStatus; tasks: TeamTask[] };

export default function TeamTasksPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user, loading: authLoading, logout } = useAuth();
  const { tasks, members, sections, loading, error, setError, fetchTasks, createTask, updateTask, deleteTask, createSection, updateSection, deleteSection } = useTeamTasks();
  const [busy, setBusy] = useState(false); const [pendingId, setPendingId] = useState<string | null>(null); const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | 'view' | 'delete' | null>(null); const [selected, setSelected] = useState<TeamTask | null>(null);
  const [addPreset, setAddPreset] = useState<Partial<TeamTaskInput>>({});
  const [scope, setScope] = useState<'all' | 'mine'>('all'); const [search, setSearch] = useState(''); const [assignee, setAssignee] = useState('All'); const [due, setDue] = useState('All');
  const [groupBy, setGroupBy] = useState<GroupBy>('section'); const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [layout, setLayout] = useState<'sections' | 'list' | 'grid'>('sections');
  const [selectedSectionKey, setSelectedSectionKey] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false); const [newSectionName, setNewSectionName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null); const [editName, setEditName] = useState('');
  const [editCell, setEditCell] = useState<{ id: string; field: CellField } | null>(null);
  const [quickAddKey, setQuickAddKey] = useState<string | null>(null); const [quickAddTitle, setQuickAddTitle] = useState(''); const [quickBusy, setQuickBusy] = useState(false);

  useEffect(() => { if (user) fetchTasks(); }, [user, fetchTasks]);
  useEffect(() => {
    if (!modal) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) { setModal(null); setSelected(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, busy]);

  const toast = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2800); };
  const save = async (value: TeamTaskInput) => { setBusy(true); const editing = modal === 'edit' && selected; const result = editing ? await updateTask(selected.id, value) : await createTask(value); setBusy(false); if (result) { setModal(null); setSelected(null); toast(editing ? 'Task updated' : 'Task created'); } };
  const changeStatus = async (task: TeamTask, next: TeamTaskStatus) => { if (task.status === next || pendingId) return; setPendingId(task.id); const result = await updateTask(task.id, { status: next }); setPendingId(null); if (result) toast(next === 'Completed' ? 'Task completed' : `Moved to ${next}`); };
  const toggleComplete = (task: TeamTask) => changeStatus(task, task.status === 'Completed' ? 'To Do' : 'Completed');
  const remove = async () => { if (!selected) return; setBusy(true); const success = await deleteTask(selected.id); setBusy(false); if (success) { setModal(null); setSelected(null); toast('Task deleted'); } };
  const toggleCollapse = (key: string) => setCollapsed(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });

  const addSection = async (event: FormEvent) => {
    event.preventDefault();
    const name = newSectionName.trim();
    if (!name) return;
    const created = await createSection(name);
    if (created) { setNewSectionName(''); setAddingSection(false); toast('Section added'); }
  };
  const commitRename = async (id: string, original: string) => {
    const name = editName.trim();
    setEditingSectionId(null);
    if (name && name !== original) await updateSection(id, { name });
  };
  const moveSection = async (id: string, dir: -1 | 1) => {
    const index = sections.findIndex(s => s.id === id);
    const swap = sections[index + dir];
    if (index < 0 || !swap) return;
    await Promise.all([updateSection(id, { order: swap.order }), updateSection(swap.id, { order: sections[index].order })]);
  };
  const handleDeleteSection = async (id: string, name: string) => {
    if (!window.confirm(`Delete section “${name}”? Its tasks move to “No section”.`)) return;
    if (await deleteSection(id)) toast('Section deleted');
  };

  const filtered = useMemo(() => tasks.filter(task => {
    if (scope === 'mine' && task.assignedTo.id !== user?.id) return false;
    if (search && !`${task.title} ${task.description}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (assignee !== 'All' && task.assignedTo.id !== assignee) return false;
    if (due !== 'All') {
      const key = task.dueDate?.slice(0, 10);
      if (!key) return false;
      const now = new Date();
      const todayKey = dateKey(now);
      const weekEndKey = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
      if (due === 'Today' && key !== todayKey) return false;
      if (due === 'This Week' && !(key >= todayKey && key < weekEndKey)) return false;
      if (due === 'Overdue' && !isOverdue(task)) return false;
    }
    return true;
  }), [tasks, scope, search, assignee, due, user?.id]);

  const overdueCount = useMemo(() => filtered.filter(isOverdue).length, [filtered]);

  const groups = useMemo<Group[]>(() => {
    if (groupBy === 'section') {
      return [
        { key: '__none', label: 'No section', sectionId: null, tasks: filtered.filter(t => !t.section) },
        ...sections.map<Group>(s => ({ key: s.id, label: s.name, sectionId: s.id, canManage: true, tasks: filtered.filter(t => t.section === s.id) })),
      ];
    }
    if (groupBy === 'status') return statuses.map<Group>(s => ({ key: s, label: s, addStatus: s, tasks: filtered.filter(t => t.status === s) }));
    if (groupBy === 'priority') return priorities.map<Group>(p => ({ key: p, label: `${p} priority`, tasks: filtered.filter(t => t.priority === p) })).filter(g => g.tasks.length);
    if (groupBy === 'assignee') {
      const byMember = members.map<Group>(m => ({ key: m.id, label: m.username, tasks: filtered.filter(t => t.assignedTo.id === m.id) }));
      const unassigned = filtered.filter(t => !t.assignedTo.id);
      return [...byMember, ...(unassigned.length ? [{ key: '__unassigned', label: 'Unassigned', tasks: unassigned } as Group] : [])].filter(g => g.tasks.length);
    }
    return [{ key: '__all', label: 'All tasks', tasks: filtered }];
  }, [filtered, groupBy, members, sections]);

  // Independent of `groupBy` - the sections layout always browses by section, and only
  // surfaces the "No section" bucket when it actually holds a task (no default empty tab).
  const sectionGroups = useMemo<Group[]>(() => {
    const real = sections.map<Group>(s => ({ key: s.id, label: s.name, sectionId: s.id, canManage: true, tasks: filtered.filter(t => t.section === s.id) }));
    const none = filtered.filter(t => !t.section);
    return none.length ? [...real, { key: '__none', label: 'No section', sectionId: null, tasks: none }] : real;
  }, [filtered, sections]);

  useEffect(() => {
    if (!sectionGroups.length) { if (selectedSectionKey !== null) setSelectedSectionKey(null); return; }
    if (!sectionGroups.some(g => g.key === selectedSectionKey)) setSelectedSectionKey(sectionGroups[0].key);
  }, [sectionGroups, selectedSectionKey]);

  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Loading…</div>;
  if (!user) return <LoginForm />;
  if (!user.permissions.canViewTasks) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">You do not have permission to view team tasks.</div>;

  const canEdit = user.permissions.canEditTasks;
  const sectionName = (id: string | null) => id ? (sections.find(s => s.id === id)?.name ?? '—') : 'No section';
  const open = (kind: 'edit' | 'view' | 'delete', task: TeamTask) => { setSelected(task); setModal(kind); setError(''); };
  const openAdd = (preset: Partial<TeamTaskInput> = {}) => {
    const clean = Object.fromEntries(Object.entries(preset).filter(([, v]) => v !== undefined)) as Partial<TeamTaskInput>;
    setAddPreset(clean); setSelected(null); setModal('add'); setError('');
  };
  const filtersActive = scope !== 'all' || !!search || assignee !== 'All' || due !== 'All';
  const clearFilters = () => { setScope('all'); setSearch(''); setAssignee('All'); setDue('All'); };
  const showEmptyCard = !loading && filtered.length === 0 && groupBy !== 'section';
  const selectedGroup = sectionGroups.find(g => g.key === selectedSectionKey) ?? null;

  const commitCell = async (task: TeamTask, field: CellField, raw: string) => {
    setEditCell(null);
    const value = field === 'dueDate' ? (raw || null) : field === 'title' ? raw.trim() : raw;
    const current = field === 'assignedTo' ? task.assignedTo.id : field === 'dueDate' ? (task.dueDate?.slice(0, 10) ?? null) : task[field];
    if (value === current || ((field === 'assignedTo' || field === 'title') && !value)) return;
    setPendingId(task.id);
    const result = await updateTask(task.id, { [field]: value } as Partial<TeamTaskInput>);
    setPendingId(null);
    if (result) toast('Task updated');
  };
  const submitQuickAdd = async (group: Group) => {
    const title = quickAddTitle.trim();
    if (!title || quickBusy) return;
    setQuickBusy(true);
    const created = await createTask({ ...emptyForm, title, assignedTo: user.id, section: group.sectionId ?? null, status: group.addStatus ?? emptyForm.status });
    setQuickBusy(false);
    if (created) { setQuickAddTitle(''); toast('Task created'); }
  };

  const row = (task: TeamTask) => {
    const done = task.status === 'Completed';
    const overdue = isOverdue(task);
    const rowPending = pendingId === task.id;
    const editing = (field: CellField) => editCell?.id === task.id && editCell.field === field;
    const cellBtn = canEdit ? 'hover:bg-slate-100' : 'cursor-default';
    return (
      <div key={task.id} className="group flex items-start gap-3 border-b border-slate-100 px-3 hover:bg-slate-50 sm:items-center sm:px-4">
        <button
          type="button"
          disabled={!canEdit || rowPending}
          onClick={() => toggleComplete(task)}
          aria-label={done ? 'Mark incomplete' : 'Mark complete'}
          className={`mt-[9px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors sm:mt-0 ${done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-400'} ${!canEdit ? 'cursor-default' : ''} ${rowPending ? 'opacity-50' : ''}`}
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6.2l2.3 2.3L9.5 3.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>

        <div className="min-w-0 flex-1 py-2 sm:py-2.5">
          {editing('title') ? (
            <input
              autoFocus
              defaultValue={task.title}
              maxLength={200}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } else if (e.key === 'Escape') { e.currentTarget.value = task.title; e.currentTarget.blur(); } }}
              onBlur={e => commitCell(task, 'title', e.target.value)}
              className="block w-full rounded border border-slate-300 px-1.5 py-1 text-sm text-slate-900 outline-none focus:border-blue-500"
            />
          ) : (
            <button type="button" onClick={() => (canEdit ? setEditCell({ id: task.id, field: 'title' }) : open('view', task))} className={`block w-full truncate rounded text-left text-sm ${done ? 'text-slate-400 line-through' : 'text-slate-800 hover:text-blue-600'} ${canEdit ? 'px-1 hover:bg-slate-100' : ''}`}>
              {task.title}
            </button>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs sm:hidden">
            {task.assignedTo.id && <span className="text-slate-500">{task.assignedTo.username}</span>}
            {task.dueDate && <span className={done ? 'text-slate-400' : overdue ? 'font-medium text-red-600' : 'text-slate-500'}>{formatDay(task.dueDate, true)}</span>}
            <span className={`rounded-full px-1.5 py-0.5 font-medium ${priorityClass[task.priority]}`}>{task.priority}</span>
            <span className={`rounded-full px-1.5 py-0.5 font-medium ${statusClass[task.status]}`}>{task.status}</span>
          </div>
        </div>

        <div className="hidden w-44 shrink-0 sm:block">
          {editing('assignedTo') ? (
            <select autoFocus defaultValue={task.assignedTo.id} onChange={e => commitCell(task, 'assignedTo', e.target.value)} onBlur={() => setEditCell(null)} className="w-full rounded border border-slate-300 px-1.5 py-1 text-sm outline-none focus:border-blue-500">
              {members.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
            </select>
          ) : (
            <button type="button" disabled={!canEdit} onClick={() => setEditCell({ id: task.id, field: 'assignedTo' })} className={`flex w-full items-center gap-2 rounded px-1 py-1 text-left ${cellBtn}`}>
              {task.assignedTo.id ? (
                <>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${avatarColor(task.assignedTo.id)}`}>{initials(task.assignedTo.username)}</span>
                  <span className="truncate text-sm text-slate-600">{task.assignedTo.username}</span>
                </>
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-300"><svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor"><path d="M10 10a3 3 0 100-6 3 3 0 000 6zm-7 8a7 7 0 0114 0H3z" /></svg></span>
              )}
            </button>
          )}
        </div>

        <div className="hidden w-28 shrink-0 text-sm sm:block">
          {editing('dueDate') ? (
            <input type="date" autoFocus defaultValue={task.dueDate?.slice(0, 10) ?? ''} onChange={e => { if (e.target.value) commitCell(task, 'dueDate', e.target.value); }} onBlur={e => commitCell(task, 'dueDate', e.target.value)} className="w-full rounded border border-slate-300 px-1.5 py-1 text-sm outline-none focus:border-blue-500" />
          ) : (
            <button type="button" disabled={!canEdit} onClick={() => setEditCell({ id: task.id, field: 'dueDate' })} className={`rounded px-1 py-1 ${cellBtn}`}>
              {task.dueDate
                ? <span className={done ? 'text-slate-300' : overdue ? 'font-medium text-red-600' : 'text-slate-600'}>{formatDay(task.dueDate, true)}</span>
                : <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-300"><svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3.5" y="4.5" width="13" height="12" rx="2" /><path d="M3.5 8.5h13M7 3.5v2M13 3.5v2" strokeLinecap="round" /></svg></span>}
            </button>
          )}
        </div>

        <div className="hidden w-24 shrink-0 sm:block">
          {editing('priority') ? (
            <select autoFocus defaultValue={task.priority} onChange={e => commitCell(task, 'priority', e.target.value)} onBlur={() => setEditCell(null)} className="w-full rounded border border-slate-300 px-1 py-1 text-xs outline-none focus:border-blue-500">
              {priorities.map(p => <option key={p}>{p}</option>)}
            </select>
          ) : (
            <button type="button" disabled={!canEdit} onClick={() => setEditCell({ id: task.id, field: 'priority' })} className={canEdit ? '' : 'cursor-default'}>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${priorityClass[task.priority]}`}>{task.priority}</span>
            </button>
          )}
        </div>

        <div className="hidden w-24 shrink-0 sm:block">
          {editing('status') ? (
            <select autoFocus defaultValue={task.status} onChange={e => commitCell(task, 'status', e.target.value)} onBlur={() => setEditCell(null)} className="w-full rounded border border-slate-300 px-1 py-1 text-xs outline-none focus:border-blue-500">
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
          ) : (
            <button type="button" disabled={!canEdit} onClick={() => setEditCell({ id: task.id, field: 'status' })} className={canEdit ? '' : 'cursor-default'}>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[task.status]}`}>{task.status}</span>
            </button>
          )}
        </div>

        <div className="hidden w-16 shrink-0 items-center justify-end gap-0.5 text-slate-400 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 sm:flex">
          {canEdit && <>
            <button type="button" onClick={() => open('edit', task)} title="Edit" className="rounded p-1.5 hover:bg-slate-200 hover:text-slate-700"><EditIcon /></button>
            <button type="button" onClick={() => open('delete', task)} title="Delete" className="rounded p-1.5 hover:bg-red-100 hover:text-red-600"><TrashIcon /></button>
          </>}
        </div>
      </div>
    );
  };

  // Compact per-task card used by the grid/board layout - same fields and inline editors as `row`, laid out vertically.
  const card = (task: TeamTask) => {
    const done = task.status === 'Completed';
    const overdue = isOverdue(task);
    const rowPending = pendingId === task.id;
    const editing = (field: CellField) => editCell?.id === task.id && editCell.field === field;
    return (
      <div key={task.id} className="group/card flex items-start gap-2.5 p-3 hover:bg-slate-50">
        <button
          type="button"
          disabled={!canEdit || rowPending}
          onClick={() => toggleComplete(task)}
          aria-label={done ? 'Mark incomplete' : 'Mark complete'}
          className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors ${done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-400'} ${!canEdit ? 'cursor-default' : ''} ${rowPending ? 'opacity-50' : ''}`}
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6.2l2.3 2.3L9.5 3.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>

        <div className="min-w-0 flex-1">
          {editing('title') ? (
            <input
              autoFocus
              defaultValue={task.title}
              maxLength={200}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } else if (e.key === 'Escape') { e.currentTarget.value = task.title; e.currentTarget.blur(); } }}
              onBlur={e => commitCell(task, 'title', e.target.value)}
              className="block w-full rounded border border-slate-300 px-1.5 py-1 text-sm text-slate-900 outline-none focus:border-blue-500"
            />
          ) : (
            <button type="button" onClick={() => (canEdit ? setEditCell({ id: task.id, field: 'title' }) : open('view', task))} className={`block w-full truncate rounded text-left text-sm ${done ? 'text-slate-400 line-through' : 'text-slate-800 hover:text-blue-600'} ${canEdit ? 'px-1 hover:bg-slate-100' : ''}`}>
              {task.title}
            </button>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {editing('assignedTo') ? (
              <select autoFocus defaultValue={task.assignedTo.id} onChange={e => commitCell(task, 'assignedTo', e.target.value)} onBlur={() => setEditCell(null)} className="rounded border border-slate-300 px-1.5 py-0.5 text-xs outline-none focus:border-blue-500">
                {members.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
              </select>
            ) : (
              <button type="button" disabled={!canEdit} onClick={() => setEditCell({ id: task.id, field: 'assignedTo' })} className={`flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 text-xs ${canEdit ? 'hover:bg-slate-100' : ''}`}>
                {task.assignedTo.id ? (
                  <>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold text-white ${avatarColor(task.assignedTo.id)}`}>{initials(task.assignedTo.username)}</span>
                    <span className="text-slate-600">{task.assignedTo.username}</span>
                  </>
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-300"><svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor"><path d="M10 10a3 3 0 100-6 3 3 0 000 6zm-7 8a7 7 0 0114 0H3z" /></svg></span>
                )}
              </button>
            )}

            {editing('dueDate') ? (
              <input type="date" autoFocus defaultValue={task.dueDate?.slice(0, 10) ?? ''} onChange={e => { if (e.target.value) commitCell(task, 'dueDate', e.target.value); }} onBlur={e => commitCell(task, 'dueDate', e.target.value)} className="rounded border border-slate-300 px-1.5 py-0.5 text-xs outline-none focus:border-blue-500" />
            ) : (
              <button type="button" disabled={!canEdit} onClick={() => setEditCell({ id: task.id, field: 'dueDate' })} className={`rounded-full px-2 py-0.5 text-xs ${canEdit ? 'hover:bg-slate-100' : ''} ${task.dueDate ? (done ? 'text-slate-400' : overdue ? 'font-medium text-red-600' : 'text-slate-600') : 'text-slate-300'}`}>
                {task.dueDate ? formatDay(task.dueDate, true) : 'No date'}
              </button>
            )}

            {editing('priority') ? (
              <select autoFocus defaultValue={task.priority} onChange={e => commitCell(task, 'priority', e.target.value)} onBlur={() => setEditCell(null)} className="rounded border border-slate-300 px-1 py-0.5 text-xs outline-none focus:border-blue-500">
                {priorities.map(p => <option key={p}>{p}</option>)}
              </select>
            ) : (
              <button type="button" disabled={!canEdit} onClick={() => setEditCell({ id: task.id, field: 'priority' })}>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityClass[task.priority]}`}>{task.priority}</span>
              </button>
            )}

            {editing('status') ? (
              <select autoFocus defaultValue={task.status} onChange={e => commitCell(task, 'status', e.target.value)} onBlur={() => setEditCell(null)} className="rounded border border-slate-300 px-1 py-0.5 text-xs outline-none focus:border-blue-500">
                {statuses.map(s => <option key={s}>{s}</option>)}
              </select>
            ) : (
              <button type="button" disabled={!canEdit} onClick={() => setEditCell({ id: task.id, field: 'status' })}>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[task.status]}`}>{task.status}</span>
              </button>
            )}
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-0.5 text-slate-400 opacity-0 transition-opacity group-hover/card:opacity-100 sm:flex">
          {canEdit && <>
            <button type="button" onClick={() => open('edit', task)} title="Edit" className="rounded p-1.5 hover:bg-slate-200 hover:text-slate-700"><EditIcon /></button>
            <button type="button" onClick={() => open('delete', task)} title="Delete" className="rounded p-1.5 hover:bg-red-100 hover:text-red-600"><TrashIcon /></button>
          </>}
        </div>
      </div>
    );
  };

  // One section/status/etc. group rendered as its own card for the grid/board layout.
  const sectionCard = (group: Group, groupIndex: number) => {
    const isCollapsed = collapsed.has(group.key);
    const isEditing = editingSectionId === group.key;
    return (
      <div key={group.key} className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="group/sec flex items-center gap-1 border-b border-slate-100 px-3 py-2.5">
          {isEditing ? (
            <form onSubmit={e => { e.preventDefault(); commitRename(group.key, group.label); }} className="flex min-w-0 flex-1 items-center gap-2">
              <Chevron className="h-4 w-4 shrink-0 text-slate-300" />
              <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} onBlur={() => commitRename(group.key, group.label)} className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-0.5 text-sm font-semibold outline-none focus:border-blue-500" />
            </form>
          ) : (
            <button type="button" onClick={() => toggleCollapse(group.key)} className="flex min-w-0 flex-1 items-center gap-2 rounded py-0.5 pr-2 text-left hover:bg-slate-50">
              <Chevron className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
              <span className="truncate text-sm font-semibold text-slate-700">{group.label}</span>
              <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">{group.tasks.length}</span>
            </button>
          )}
          {group.canManage && canEdit && !isEditing && (
            <div className="flex shrink-0 items-center gap-0.5 text-slate-300 opacity-0 transition-opacity focus-within:opacity-100 group-hover/sec:opacity-100">
              <button type="button" onClick={() => moveSection(group.key, -1)} disabled={groupIndex <= 1} title="Move up" className="rounded p-1 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30">↑</button>
              <button type="button" onClick={() => moveSection(group.key, 1)} disabled={groupIndex >= groups.length - 1} title="Move down" className="rounded p-1 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30">↓</button>
              <button type="button" onClick={() => { setEditingSectionId(group.key); setEditName(group.label); }} title="Rename section" className="rounded p-1 hover:bg-slate-100 hover:text-slate-600"><EditIcon /></button>
              <button type="button" onClick={() => handleDeleteSection(group.key, group.label)} title="Delete section" className="rounded p-1 hover:bg-red-100 hover:text-red-600"><TrashIcon /></button>
            </div>
          )}
        </div>
        {!isCollapsed && <div className="flex flex-1 flex-col divide-y divide-slate-100">
          {group.tasks.map(card)}
          {group.tasks.length === 0 && <p className="px-3 py-4 text-center text-xs text-slate-400">No tasks</p>}
          {canEdit && (group.addStatus || group.sectionId !== undefined) && (quickAddKey === group.key ? (
            <div className="flex items-center gap-2 p-2.5">
              <input autoFocus value={quickAddTitle} maxLength={200} onChange={e => setQuickAddTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitQuickAdd(group); } else if (e.key === 'Escape') { setQuickAddKey(null); setQuickAddTitle(''); } }} onBlur={() => { if (!quickAddTitle.trim()) setQuickAddKey(null); }} placeholder="Task name, then press Enter" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => submitQuickAdd(group)} disabled={quickBusy || !quickAddTitle.trim()} className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{quickBusy ? '…' : 'Add'}</button>
            </div>
          ) : (
            <button type="button" onClick={() => { setQuickAddKey(group.key); setQuickAddTitle(''); }} className="flex w-full items-center gap-2 p-2.5 text-left text-sm text-slate-400 hover:bg-slate-50 hover:text-slate-600">
              <span className="text-base leading-none">+</span> Add task
            </button>
          ))}
        </div>}
      </div>
    );
  };

  const sidebar = embedded ? null : (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-gray-200 bg-gray-50 md:flex"><div className="border-b border-gray-200 p-6"><Logo /></div><nav className="space-y-1 p-3"><Link href="/" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">← <span>Project workspace</span></Link><div className="flex items-center gap-2.5 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600"><span>✓</span><span>Team Tasks</span><span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs">{tasks.length}</span></div>{user.role === 'admin' && <Link href="/invoices" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">▤ <span>Invoices</span></Link>}</nav><div className="mt-auto border-t border-gray-200 p-4"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm text-white">{user.username[0].toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{user.username}</p><p className="text-xs capitalize text-gray-500">{user.role.replace('_', ' ')}</p></div><button onClick={logout} title="Sign out" className="rounded p-2 text-gray-500 hover:bg-gray-100">↪</button></div></div></aside>
  );

  const mainContent = (
      <main className={embedded ? 'min-w-0' : 'min-w-0 flex-1'}>
        <header className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4">
            <div>
              {!embedded && <div className="mb-2 flex items-center gap-3 md:hidden"><Link href="/" className="text-sm text-slate-500">← Projects</Link></div>}
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Team Tasks</h1>
                {overdueCount > 0 && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">{overdueCount} overdue</span>}
              </div>
              <p className="mt-1 text-sm text-slate-500">Manage and track your team’s work in one place.</p>
            </div>
            <button disabled={!canEdit} title={!canEdit ? 'You need edit permission to add tasks' : undefined} onClick={() => openAdd()} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">+ Add task</button>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] space-y-4 p-4 sm:p-6 lg:p-8">
          {error && <div className="flex justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span>{error}</span><button onClick={() => setError('')}>×</button></div>}

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg bg-slate-100 p-0.5">
              <button onClick={() => setScope('all')} className={`rounded-md px-3 py-1.5 text-sm font-medium ${scope === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>All tasks</button>
              <button onClick={() => setScope('mine')} className={`rounded-md px-3 py-1.5 text-sm font-medium ${scope === 'mine' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>My tasks</button>
            </div>
            <div className="flex rounded-lg bg-slate-100 p-0.5">
              <button type="button" onClick={() => setLayout('sections')} title="Sections view" aria-label="Sections view" className={`rounded-md px-2.5 py-1.5 ${layout === 'sections' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="14" height="12" rx="2" /><path d="M8 4v12" strokeLinecap="round" /></svg></button>
              <button type="button" onClick={() => setLayout('list')} title="List view" aria-label="List view" className={`rounded-md px-2.5 py-1.5 ${layout === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg></button>
              <button type="button" onClick={() => setLayout('grid')} title="Grid view" aria-label="Grid view" className={`rounded-md px-2.5 py-1.5 ${layout === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor"><path d="M4 4h5v5H4V4zm7 0h5v5h-5V4zM4 11h5v5H4v-5zm7 0h5v5h-5v-5z" /></svg></button>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…" className={`${toolbarSelect} w-full sm:w-56`} />
            {layout !== 'sections' && <label className="flex items-center gap-1.5 text-sm text-slate-500">Group
              <select value={groupBy} onChange={e => setGroupBy(e.target.value as GroupBy)} className={toolbarSelect}>
                <option value="section">Section</option><option value="status">Status</option><option value="assignee">Assignee</option><option value="priority">Priority</option><option value="none">None</option>
              </select>
            </label>}
            <select value={assignee} onChange={e => setAssignee(e.target.value)} className={toolbarSelect}><option value="All">All assignees</option>{members.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}</select>
            <select value={due} onChange={e => setDue(e.target.value)} className={toolbarSelect}>{['All', 'Today', 'This Week', 'Overdue'].map(d => <option key={d}>{d === 'All' ? 'Any due date' : d}</option>)}</select>
            {filtersActive && <button onClick={clearFilters} className="text-sm font-medium text-blue-600 hover:text-blue-700">Clear</button>}
            <span className="ml-auto text-xs text-slate-500">{filtered.length} of {tasks.length}</span>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-16 text-center text-sm text-slate-500 shadow-sm">Loading team tasks…</div>
          ) : layout === 'sections' ? (
            sectionGroups.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-16 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">✓</div>
                <h2 className="font-semibold">No sections yet</h2>
                <p className="mt-1 text-sm text-slate-500">{canEdit ? 'Add a section to start organizing tasks.' : 'Check back once sections have been added.'}</p>
                {canEdit && (addingSection ? (
                  <form onSubmit={addSection} className="mx-auto mt-4 flex max-w-xs flex-col gap-2">
                    <input autoFocus value={newSectionName} onChange={e => setNewSectionName(e.target.value)} maxLength={120} placeholder="Section name" className={toolbarSelect} />
                    <div className="flex justify-center gap-2">
                      <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800">Add section</button>
                      <button type="button" onClick={() => { setAddingSection(false); setNewSectionName(''); }} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <button type="button" onClick={() => setAddingSection(true)} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">+ Add section</button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <aside className="flex shrink-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm sm:w-64">
                  <nav className="flex flex-col gap-0.5 p-1.5">
                    {sectionGroups.map(group => (
                      <button
                        key={group.key}
                        type="button"
                        onClick={() => setSelectedSectionKey(group.key)}
                        className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium ${selectedSectionKey === group.key ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <span className="truncate">{group.label}</span>
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium ${selectedSectionKey === group.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{group.tasks.length}</span>
                      </button>
                    ))}
                  </nav>
                  {canEdit && (
                    <div className="border-t border-slate-100 p-1.5">
                      {addingSection ? (
                        <form onSubmit={addSection} className="space-y-2 p-1">
                          <input autoFocus value={newSectionName} onChange={e => setNewSectionName(e.target.value)} maxLength={120} placeholder="Section name" className={`${toolbarSelect} w-full`} />
                          <div className="flex gap-2">
                            <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800">Add</button>
                            <button type="button" onClick={() => { setAddingSection(false); setNewSectionName(''); }} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <button type="button" onClick={() => setAddingSection(true)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800">
                          <span className="text-base leading-none">+</span> Add section
                        </button>
                      )}
                    </div>
                  )}
                </aside>

                <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {!selectedGroup ? (
                    <div className="p-16 text-center text-sm text-slate-400">Select a section</div>
                  ) : (
                    <>
                      <div className="group/sec flex items-center gap-1 border-b border-slate-200 px-4 py-3">
                        {editingSectionId === selectedGroup.key ? (
                          <form onSubmit={e => { e.preventDefault(); commitRename(selectedGroup.key, selectedGroup.label); }} className="flex flex-1 items-center gap-2">
                            <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} onBlur={() => commitRename(selectedGroup.key, selectedGroup.label)} className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-base font-semibold outline-none focus:border-blue-500" />
                          </form>
                        ) : (
                          <div className="flex flex-1 items-center gap-2">
                            <h2 className="text-base font-semibold text-slate-800">{selectedGroup.label}</h2>
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">{selectedGroup.tasks.length}</span>
                          </div>
                        )}
                        {selectedGroup.canManage && canEdit && editingSectionId !== selectedGroup.key && (
                          <div className="flex items-center gap-0.5 text-slate-400">
                            <button type="button" onClick={() => { setEditingSectionId(selectedGroup.key); setEditName(selectedGroup.label); }} title="Rename section" className="rounded p-1.5 hover:bg-slate-100 hover:text-slate-600"><EditIcon /></button>
                            <button type="button" onClick={() => handleDeleteSection(selectedGroup.key, selectedGroup.label)} title="Delete section" className="rounded p-1.5 hover:bg-red-100 hover:text-red-600"><TrashIcon /></button>
                          </div>
                        )}
                      </div>

                      <div className="hidden items-center gap-3 border-b border-slate-200 px-4 text-xs font-medium uppercase tracking-wide text-slate-400 sm:flex">
                        <span className="w-[18px] shrink-0" />
                        <span className="flex-1 py-2.5">Name</span>
                        <span className="w-44 shrink-0 py-2.5">Assignee</span>
                        <span className="w-28 shrink-0 py-2.5">Due date</span>
                        <span className="w-24 shrink-0 py-2.5">Priority</span>
                        <span className="w-24 shrink-0 py-2.5">Status</span>
                        <span className="w-16 shrink-0" />
                      </div>

                      {selectedGroup.tasks.map(row)}
                      {selectedGroup.tasks.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">No tasks in this section</p>}
                      {canEdit && (quickAddKey === selectedGroup.key ? (
                        <div className="flex items-center gap-3 px-3 py-1.5 sm:px-4">
                          <span className="w-[18px] shrink-0" />
                          <input autoFocus value={quickAddTitle} maxLength={200} onChange={e => setQuickAddTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitQuickAdd(selectedGroup); } else if (e.key === 'Escape') { setQuickAddKey(null); setQuickAddTitle(''); } }} onBlur={() => { if (!quickAddTitle.trim()) setQuickAddKey(null); }} placeholder="Task name, then press Enter" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => submitQuickAdd(selectedGroup)} disabled={quickBusy || !quickAddTitle.trim()} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{quickBusy ? 'Adding…' : 'Add'}</button>
                          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { setQuickAddKey(null); setQuickAddTitle(''); }} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => { setQuickAddKey(selectedGroup.key); setQuickAddTitle(''); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-50 hover:text-slate-600 sm:px-4">
                          <span className="flex h-[18px] w-[18px] items-center justify-center text-base leading-none">+</span>
                          <span>Add task</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )
          ) : showEmptyCard ? (
            <div className="rounded-xl border border-slate-200 bg-white p-16 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">✓</div>
              <h2 className="font-semibold">{tasks.length === 0 ? 'No team tasks yet' : 'No tasks match your filters'}</h2>
              <p className="mt-1 text-sm text-slate-500">{tasks.length === 0 ? (canEdit ? 'Create your first task to get started.' : 'Check back once tasks have been added.') : 'Try adjusting or clearing your filters.'}</p>
              {tasks.length > 0 && filtersActive && <button onClick={clearFilters} className="mt-4 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Clear filters</button>}
              {tasks.length === 0 && canEdit && <button onClick={() => openAdd()} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">+ Add task</button>}
            </div>
          ) : layout === 'grid' ? (
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {groups.map((group, groupIndex) => sectionCard(group, groupIndex))}
              {groupBy === 'section' && canEdit && (
                addingSection ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3">
                    <form onSubmit={addSection} className="space-y-2">
                      <input autoFocus value={newSectionName} onChange={e => setNewSectionName(e.target.value)} maxLength={120} placeholder="Section name" className={`${toolbarSelect} w-full`} />
                      <div className="flex gap-2">
                        <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800">Add section</button>
                        <button type="button" onClick={() => { setAddingSection(false); setNewSectionName(''); }} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <button type="button" onClick={() => setAddingSection(true)} className="flex min-h-[64px] items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-500 hover:border-slate-400 hover:text-slate-800">
                    <span className="text-base leading-none">+</span> Add section
                  </button>
                )
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="hidden items-center gap-3 border-b border-slate-200 px-4 text-xs font-medium uppercase tracking-wide text-slate-400 sm:flex">
                <span className="w-[18px] shrink-0" />
                <span className="flex-1 py-2.5">Name</span>
                <span className="w-44 shrink-0 py-2.5">Assignee</span>
                <span className="w-28 shrink-0 py-2.5">Due date</span>
                <span className="w-24 shrink-0 py-2.5">Priority</span>
                <span className="w-24 shrink-0 py-2.5">Status</span>
                <span className="w-16 shrink-0" />
              </div>

              {groups.map((group, groupIndex) => {
                  const isCollapsed = collapsed.has(group.key);
                  const isEditing = editingSectionId === group.key;
                  return (
                    <div key={group.key} className="border-b border-slate-100 last:border-b-0">
                      <div className="group/sec flex items-center gap-1 px-3 pt-3 sm:px-4">
                        {isEditing ? (
                          <form onSubmit={e => { e.preventDefault(); commitRename(group.key, group.label); }} className="flex items-center gap-2 py-1">
                            <Chevron className="h-4 w-4 text-slate-300" />
                            <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} onBlur={() => commitRename(group.key, group.label)} className="rounded border border-slate-300 px-2 py-0.5 text-sm font-semibold outline-none focus:border-blue-500" />
                          </form>
                        ) : (
                          <button type="button" onClick={() => toggleCollapse(group.key)} className="flex items-center gap-2 rounded py-1 pr-2 text-left hover:bg-slate-50">
                            <Chevron className={`h-4 w-4 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                            <span className="text-sm font-semibold text-slate-700">{group.label}</span>
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">{group.tasks.length}</span>
                          </button>
                        )}
                        {group.canManage && canEdit && !isEditing && (
                          <div className="flex items-center gap-0.5 text-slate-300 opacity-0 transition-opacity focus-within:opacity-100 group-hover/sec:opacity-100">
                            <button type="button" onClick={() => moveSection(group.key, -1)} disabled={groupIndex <= 1} title="Move up" className="rounded p-1 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30">↑</button>
                            <button type="button" onClick={() => moveSection(group.key, 1)} disabled={groupIndex >= groups.length - 1} title="Move down" className="rounded p-1 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30">↓</button>
                            <button type="button" onClick={() => { setEditingSectionId(group.key); setEditName(group.label); }} title="Rename section" className="rounded p-1 hover:bg-slate-100 hover:text-slate-600"><EditIcon /></button>
                            <button type="button" onClick={() => handleDeleteSection(group.key, group.label)} title="Delete section" className="rounded p-1 hover:bg-red-100 hover:text-red-600"><TrashIcon /></button>
                          </div>
                        )}
                      </div>
                      {!isCollapsed && <div className="mt-1">
                        {group.tasks.map(row)}
                        {canEdit && (group.addStatus || group.sectionId !== undefined) && (quickAddKey === group.key ? (
                          <div className="flex items-center gap-3 px-3 py-1.5 sm:px-4">
                            <span className="w-[18px] shrink-0" />
                            <input autoFocus value={quickAddTitle} maxLength={200} onChange={e => setQuickAddTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitQuickAdd(group); } else if (e.key === 'Escape') { setQuickAddKey(null); setQuickAddTitle(''); } }} onBlur={() => { if (!quickAddTitle.trim()) setQuickAddKey(null); }} placeholder="Task name, then press Enter" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => submitQuickAdd(group)} disabled={quickBusy || !quickAddTitle.trim()} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{quickBusy ? 'Adding…' : 'Add'}</button>
                            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { setQuickAddKey(null); setQuickAddTitle(''); }} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => { setQuickAddKey(group.key); setQuickAddTitle(''); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-50 hover:text-slate-600 sm:px-4">
                            <span className="flex h-[18px] w-[18px] items-center justify-center text-base leading-none">+</span>
                            <span>Add task</span>
                          </button>
                        ))}
                        {group.tasks.length === 0 && !group.addStatus && group.sectionId === undefined && <p className="px-4 py-3 text-sm text-slate-400">No tasks</p>}
                      </div>}
                    </div>
                  );
                })}

                {groupBy === 'section' && canEdit && (
                  <div className="px-3 py-3 sm:px-4">
                    {addingSection ? (
                      <form onSubmit={addSection} className="flex flex-wrap items-center gap-2">
                        <input autoFocus value={newSectionName} onChange={e => setNewSectionName(e.target.value)} maxLength={120} placeholder="Section name" className={`${toolbarSelect} w-64`} />
                        <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800">Add section</button>
                        <button type="button" onClick={() => { setAddingSection(false); setNewSectionName(''); }} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                      </form>
                    ) : (
                      <button type="button" onClick={() => setAddingSection(true)} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800">
                        <span className="text-base leading-none">+</span> Add section
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
  );

  const noticeBanner = notice && <div className="fixed right-4 top-4 z-[70] rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">{notice}</div>;

  const modalContent = modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget && !busy) { setModal(null); setSelected(null); } }}><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-semibold">{modal === 'add' ? 'Add task' : modal === 'edit' ? 'Edit task' : modal === 'delete' ? 'Delete this task?' : 'Task details'}</h2><button onClick={() => { setModal(null); setSelected(null); }} className="rounded p-1 text-xl text-slate-400 hover:bg-slate-100">×</button></div><div className="p-5">{modal === 'add' && <TaskForm initial={{ ...emptyForm, assignedTo: user.id, ...addPreset }} members={members} sections={sections} busy={busy} onCancel={() => setModal(null)} onSubmit={save} />}{modal === 'edit' && selected && <TaskForm initial={toForm(selected)} members={members} sections={sections} busy={busy} onCancel={() => setModal(null)} onSubmit={save} />}{modal === 'delete' && selected && <div><p className="text-sm text-slate-600">“{selected.title}” will be permanently deleted. This action cannot be undone.</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancel</button><button disabled={busy} onClick={remove} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Deleting…' : 'Delete'}</button></div></div>}{modal === 'view' && selected && <div><div className="flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityClass[selected.priority]}`}>{selected.priority}</span><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[selected.status]}`}>{selected.status}</span>{isOverdue(selected) && <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">Overdue</span>}</div><p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selected.description || 'No description provided.'}</p><dl className="mt-6 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">{[['Assigned to', selected.assignedTo.username], ['Section', sectionName(selected.section)], ['Created by', selected.createdBy.username], ['Due date', formatDay(selected.dueDate)], ['Created', formatDate(selected.createdAt)], ['Last updated', formatDate(selected.updatedAt)], ['Completed', formatDate(selected.completedAt)]].map(([k, v]) => <div key={k}><dt className="text-xs uppercase tracking-wide text-slate-400">{k}</dt><dd className="mt-1 text-sm font-medium">{v}</dd></div>)}</dl>{selected.notes && <div className="mt-5"><h3 className="text-sm font-semibold">Notes</h3><p className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-200 p-3 text-sm text-slate-600">{selected.notes}</p></div>}<div className="mt-6 flex justify-end gap-2"><button onClick={() => { setModal(null); setSelected(null); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Close</button>{canEdit && <button onClick={() => setModal('edit')} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Edit task</button>}</div></div>}</div></div></div>;

  if (embedded) {
    return <>
      {noticeBanner}
      {mainContent}
      {modalContent}
    </>;
  }

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    {noticeBanner}
    <div className="flex min-h-screen">
      {sidebar}
      {mainContent}
    </div>
    {modalContent}
  </div>;
}
