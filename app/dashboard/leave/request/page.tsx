'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, FileText, Upload } from 'lucide-react';

export default function LeaveRequestPage() {
  const router = useRouter();
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalDays, setTotalDays] = useState(0);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Automatically calculate total days when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end >= start) {
        // Calculate difference in days (inclusive)
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setTotalDays(diffDays);
      } else {
        setTotalDays(0);
      }
    }
  }, [startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveType || !startDate || !endDate || !reason) {
      toast.error('Please fill all required fields');
      return;
    }
    if (totalDays <= 0) {
      toast.error('End date must be after or equal to start date');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          total_days: totalDays,
          reason,
          document_url: null, // Would handle file upload here and get URL
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Leave request submitted successfully');
        router.push('/dashboard/leave/history');
      } else {
        toast.error(data.error || 'Failed to submit leave request');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-500/10 rounded-xl">
          <CalendarDays className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Request Leave</h1>
          <p className="text-slate-400">Submit a new time-off request for manager approval.</p>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800 shadow-2xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <Label htmlFor="leaveType">Leave Type <span className="text-red-500">*</span></Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger id="leaveType" className="bg-slate-950 border-slate-700">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="Casual Leave">Casual Leave</SelectItem>
                  <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                  <SelectItem value="Paid Leave">Paid Leave</SelectItem>
                  <SelectItem value="Emergency Leave">Emergency Leave</SelectItem>
                  <SelectItem value="Maternity/Paternity Leave">Maternity/Paternity Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date <span className="text-red-500">*</span></Label>
                <Input 
                  id="startDate" 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-950 border-slate-700 [color-scheme:dark]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date <span className="text-red-500">*</span></Label>
                <Input 
                  id="endDate" 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-950 border-slate-700 [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400 font-medium">Total Leave Days:</span>
              <span className="text-2xl font-bold text-blue-400">{totalDays}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Leave <span className="text-red-500">*</span></Label>
              <Textarea 
                id="reason" 
                placeholder="Please provide details about your leave request..." 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-slate-950 border-slate-700 min-h-[120px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Supporting Documents (Optional)</Label>
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center bg-slate-950 hover:bg-slate-900/50 transition-colors cursor-pointer group">
                <Upload className="w-8 h-8 text-slate-500 mx-auto mb-3 group-hover:text-blue-400 transition-colors" />
                <p className="text-sm text-slate-400">Click to upload medical certificate or proof</p>
                <p className="text-xs text-slate-600 mt-1">PDF, JPG, PNG up to 5MB</p>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-4 border-t border-slate-800">
              <Button type="button" variant="outline" onClick={() => router.back()} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
