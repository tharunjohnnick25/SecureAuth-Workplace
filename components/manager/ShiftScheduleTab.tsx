'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Calendar, Save, User } from 'lucide-react';
import { Button } from '@/components/Button';

const SHIFT_OPTIONS = [
  'Morning (09:00 AM - 05:00 PM)',
  'Evening (02:00 PM - 10:00 PM)',
  'Night (10:00 PM - 06:00 AM)',
  'Off'
];

export function ShiftScheduleTab({ employees }: { employees: any[] }) {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchShifts();
    
    // Pre-populate assignments with current employee shift_timing
    const initialAssignments: Record<string, string> = {};
    employees.forEach(emp => {
      if (emp.shift_timing) {
        initialAssignments[emp.id] = emp.shift_timing;
      }
    });
    setAssignments(initialAssignments);
  }, [employees]);

  const fetchShifts = async () => {
    try {
      const managerId = employees[0]?.manager_id;
      if (!managerId) return;
      
      const res = await fetch(`/api/manager/shifts?manager_id=${managerId}`);
      const json = await res.json();
      if (json.data) setShifts(json.data);
    } catch (e) {
      toast.error('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const handleShiftChange = (empId: string, shift: string) => {
    setAssignments(prev => ({ ...prev, [empId]: shift }));
  };

  const handleSave = async (empId: string) => {
    const shift = assignments[empId];
    if (!shift) return;

    try {
      const res = await fetch('/api/manager/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: empId,
          current_shift: shift,
        })
      });
      if (res.ok) {
        toast.success('Shift assigned successfully');
        fetchShifts();
      }
    } catch (e) {
      toast.error('Failed to assign shift');
    }
  };

  return (
    <div className="bg-[#0b132b] border border-white/5 rounded-xl p-6 min-h-[600px]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Shift Roster
          </h3>
          <p className="text-sm text-gray-400 mt-1">Assign work schedules for your team members.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-gray-400 text-sm">
              <th className="pb-4 font-medium px-4">Employee</th>
              <th className="pb-4 font-medium px-4">Role</th>
              <th className="pb-4 font-medium px-4">Current Shift</th>
              <th className="pb-4 font-medium px-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-white/5 transition-colors">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center font-bold text-blue-400 text-xs">
                      {emp.full_name.charAt(0)}
                    </div>
                    <span className="text-white font-medium text-sm">{emp.full_name}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-sm text-gray-400">
                  {emp.designation || 'Employee'}
                </td>
                <td className="py-4 px-4">
                  <select
                    value={assignments[emp.id] || ''}
                    onChange={(e) => handleShiftChange(emp.id, e.target.value)}
                    className="bg-[#15203c] border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500 w-full max-w-[250px]"
                  >
                    <option value="" disabled>Select Shift</option>
                    {SHIFT_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>
                <td className="py-4 px-4">
                  <Button 
                    onClick={() => handleSave(emp.id)}
                    className="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-1.5 h-auto text-xs border border-blue-500/30"
                  >
                    <Save className="w-3 h-3 mr-1.5" />
                    Assign
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
