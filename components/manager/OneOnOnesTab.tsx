'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { MessageSquare, Target, Save, Clock } from 'lucide-react';
import { Button } from '@/components/Button';

export function OneOnOnesTab({ employees }: { employees: any[] }) {
  const { user } = useAuthStore();
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [notesHistory, setNotesHistory] = useState<any[]>([]);
  const [newNotes, setNewNotes] = useState('');
  const [newGoals, setNewGoals] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedEmp) {
      fetchNotes(selectedEmp.id);
    }
  }, [selectedEmp]);

  const fetchNotes = async (empId: string) => {
    try {
      const res = await fetch(`/api/manager/one-on-ones?manager_id=${user?.id}&employee_id=${empId}`);
      const json = await res.json();
      if (json.data) setNotesHistory(json.data.reverse()); // latest first
    } catch (e) {
      toast.error('Failed to load history');
    }
  };

  const handleSave = async () => {
    if (!newNotes.trim() && !newGoals.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/manager/one-on-ones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_id: user?.id,
          employee_id: selectedEmp.id,
          notes: newNotes,
          goals: newGoals,
        })
      });
      if (res.ok) {
        toast.success('Meeting notes saved');
        setNewNotes('');
        setNewGoals('');
        fetchNotes(selectedEmp.id);
      }
    } catch (e) {
      toast.error('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-16rem)] min-h-[600px]">
      {/* Left side: Employee List */}
      <div className="w-full md:w-1/3 bg-[#0b132b] border border-white/5 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 bg-white/5">
          <h3 className="font-semibold text-white">Direct Reports</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {employees.map(emp => (
            <button
              key={emp.id}
              onClick={() => setSelectedEmp(emp)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                selectedEmp?.id === emp.id ? 'bg-blue-600/20 text-white border border-blue-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center font-bold text-blue-400 shrink-0">
                {emp.full_name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="font-medium truncate">{emp.full_name}</p>
                <p className="text-xs opacity-60 truncate">{emp.designation}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right side: Details */}
      <div className="w-full md:w-2/3 bg-[#0b132b] border border-white/5 rounded-xl flex flex-col overflow-hidden">
        {selectedEmp ? (
          <>
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-white">1-on-1 with {selectedEmp.full_name.split(' ')[0]}</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Add New Note */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-blue-400 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> New Meeting Notes
                </h4>
                <textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  className="w-full bg-[#15203c] border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500 min-h-[100px] resize-y"
                  placeholder="Discussed project updates, roadblocks, etc..."
                />
                
                <h4 className="text-sm font-medium text-emerald-400 flex items-center gap-2 mt-4">
                  <Target className="w-4 h-4" /> Action Items & Goals
                </h4>
                <textarea
                  value={newGoals}
                  onChange={e => setNewGoals(e.target.value)}
                  className="w-full bg-[#15203c] border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-emerald-500 min-h-[80px] resize-y"
                  placeholder="E.g., Complete AWS certification by Q3..."
                />

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                    <Save className="w-4 h-4 mr-2" />
                    Save Notes
                  </Button>
                </div>
              </div>

              {/* History */}
              <div className="pt-8 border-t border-white/10">
                <h4 className="text-sm font-medium text-gray-400 mb-6 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Previous Meetings
                </h4>
                
                {notesHistory.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-8">No previous meetings recorded.</p>
                ) : (
                  <div className="space-y-6">
                    {notesHistory.map((note) => (
                      <div key={note.id} className="bg-white/5 border border-white/5 rounded-lg p-4">
                        <div className="text-xs text-gray-500 mb-3">
                          {format(new Date(note.date), 'MMMM d, yyyy - h:mm a')}
                        </div>
                        {note.notes && (
                          <div className="mb-4">
                            <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</h5>
                            <p className="text-sm text-gray-300 whitespace-pre-wrap">{note.notes}</p>
                          </div>
                        )}
                        {note.goals && (
                          <div className="pt-3 border-t border-white/5">
                            <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Action Items</h5>
                            <p className="text-sm text-gray-300 whitespace-pre-wrap">{note.goals}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
            <p>Select a team member to view or add 1-on-1 notes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
