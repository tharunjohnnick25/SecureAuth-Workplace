'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  type?: string;
  color?: string;
  created_at: string;
}

const EVENT_COLORS = [
  'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'
];

export default function CalendarPage() {
  const { user } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventColor, setNewEventColor] = useState(EVENT_COLORS[0]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/workspace/calendar?owner=${user.id}`);
        const data = await res.json();
        if (!cancelled && data.events) setEvents(data.events);
      } catch {
        if (!cancelled) toast.error('Failed to load events');
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    try {
      const day = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch('/api/workspace/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEventTitle,
          start: new Date(`${day}T09:00:00`).toISOString(),
          end: new Date(`${day}T17:00:00`).toISOString(),
          type: 'EVENT',
          color: newEventColor,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.event) {
        toast.error(data.error || 'Error adding event');
        return;
      }
      setEvents([...events, data.event]);
      setIsModalOpen(false);
      setNewEventTitle('');
      toast.success('Event added');
    } catch {
      toast.error('Error adding event');
    }
  };

  const handleDeleteEvent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this event?')) return;
    try {
      await fetch(`/api/workspace/calendar?id=${id}`, { method: 'DELETE' });
      setEvents(events.filter(ev => ev.id !== id));
      toast.success('Event deleted');
    } catch {
      toast.error('Failed to delete event');
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Generate calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="min-h-screen bg-[#020617]">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        
        <main className="pt-24 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                <CalendarIcon className="w-8 h-8 text-blue-500" />
                Workspace Calendar
              </h1>
              <p className="text-slate-400">Schedule meetings, deadlines, and personal events.</p>
            </div>
            <Button 
              onClick={() => { setSelectedDate(new Date()); setIsModalOpen(true); }} 
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-xl font-semibold text-white">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/50">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 bg-slate-800 gap-[1px]">
              {days.map(day => {
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());
                const dayString = format(day, 'yyyy-MM-dd');
                const dayEvents = events.filter(e => format(new Date(e.start_time), 'yyyy-MM-dd') === dayString);

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => { setSelectedDate(day); setIsModalOpen(true); }}
                    className={`min-h-[120px] p-2 bg-slate-900 transition-colors cursor-pointer group hover:bg-slate-800/80 ${
                      !isCurrentMonth ? 'opacity-40' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium ${
                        isToday ? 'bg-blue-600 text-white' : 'text-slate-300'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      <Plus className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    <div className="space-y-1 mt-1">
                      {dayEvents.map(event => (
                        <div 
                          key={event.id}
                          className={`text-xs px-2 py-1 rounded-md text-white shadow-sm flex justify-between items-center group/event ${event.color || 'bg-blue-500'}`}
                        >
                          <span className="truncate">{event.title}</span>
                          <button 
                            onClick={(e) => handleDeleteEvent(event.id, e)}
                            className="opacity-0 group-hover/event:opacity-100 hover:text-red-200 transition-opacity ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Add Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-1">Add Event</h2>
            <p className="text-sm text-slate-400 mb-5">{format(selectedDate, 'EEEE, MMMM do, yyyy')}</p>
            
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="E.g. Team Standup"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Event Color</label>
                <div className="flex gap-2">
                  {EVENT_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewEventColor(color)}
                      className={`w-8 h-8 rounded-full ${color} transition-transform ${
                        newEventColor === color ? 'ring-2 ring-white scale-110' : 'hover:scale-110 opacity-70'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Save Event
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
