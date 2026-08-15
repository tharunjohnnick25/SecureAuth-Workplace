'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Loader2, FileText, FileSpreadsheet, ShieldAlert, Users, LayoutDashboard, ShieldCheck, Activity, Presentation } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import pptxgen from 'pptxgenjs';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { useLanguage } from "@/context/LanguageContext";

import { useAuthStore } from '@/store/useAuthStore';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function GovernanceDashboard() {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchReport();
      fetchTasks();
    }
  }, [user?.id]);

  const fetchTasks = async () => {
    try {
      const url = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' 
        ? '/api/workspace/tasks?role=ADMIN' 
        : `/api/workspace/tasks?assignee=${user?.id}`;
      const res = await fetch(url);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any>(`/api/reports/governance?user_id=${user?.id}&role=${user?.role}`);
      if (res.success) {
        setReportData(res.data);
      } else {
        toast.error(res.error || 'Failed to fetch governance report');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error fetching report');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!reportData) return;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Governance & Compliance Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated: ${format(new Date(reportData.generated_at), 'PPpp')}`, 14, 30);
    
    doc.setFontSize(14);
    doc.text('System Overview', 14, 45);
    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Value']],
      body: [
        ['Total Employees', reportData.employees.total],
        ['Active Employees', reportData.employees.active],
        ['Total Departments', reportData.departments.total],
        ['Total Devices', reportData.devices.total],
        ['Trusted Devices', reportData.devices.trusted],
      ],
    });

    const finalY = (doc as any).lastAutoTable.finalY || 50;

    doc.text('Security & Risk', 14, finalY + 15);
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Metric', 'Value']],
      body: [
        ['Total Logins', reportData.logins.total],
        ['Failed Logins', reportData.logins.failed],
        ['High Risk Logins', reportData.logins.high_risk],
        ['Pending Access Requests', reportData.access_requests.pending],
        ['Compliance Score', reportData.compliance.score + '%'],
        ['Audit Events', reportData.audit_logs.total_events],
      ],
    });

    doc.save(`Governance_Report_${format(new Date(), 'yyyy_MM_dd')}.pdf`);
    toast.success('PDF Exported Successfully');
  };

  const exportPPTX = () => {
    if (!reportData) return;
    const pres = new pptxgen();
    
    const slide = pres.addSlide();
    slide.addText('Governance & Compliance Report', { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '363636' });
    slide.addText(`Generated: ${format(new Date(reportData.generated_at), 'PPpp')}`, { x: 0.5, y: 1.0, fontSize: 12, color: '888888' });
    
    slide.addTable(
      [
        [{ text: 'Metric', options: { bold: true, fill: { color: 'F1F1F1' } } }, { text: 'Value', options: { bold: true, fill: { color: 'F1F1F1' } } }],
        [{ text: 'Total Employees' }, { text: String(reportData.employees.total) }],
        [{ text: 'Active Employees' }, { text: String(reportData.employees.active) }],
        [{ text: 'Total Departments' }, { text: String(reportData.departments.total) }],
        [{ text: 'Total Devices' }, { text: String(reportData.devices.total) }],
        [{ text: 'Trusted Devices' }, { text: String(reportData.devices.trusted) }],
        [{ text: 'Total Logins' }, { text: String(reportData.logins.total) }],
        [{ text: 'Failed Logins' }, { text: String(reportData.logins.failed) }],
        [{ text: 'High Risk Logins' }, { text: String(reportData.logins.high_risk) }],
        [{ text: 'Compliance Score' }, { text: `${reportData.compliance.score}%` }],
        [{ text: 'Audit Events' }, { text: String(reportData.audit_logs.total_events) }],
      ],
      { x: 0.5, y: 1.5, w: 9, h: 3, colW: [4, 5], fontSize: 14 }
    );
    
    pres.writeFile({ fileName: `Governance_Report_${format(new Date(), 'yyyy_MM_dd')}.pptx` });
    toast.success('PPTX Exported Successfully');
  };

  const exportExcel = () => {
    if (!reportData) return;
    const wb = XLSX.utils.book_new();
    
    const overviewData = [
      ['Metric', 'Value'],
      ['Total Employees', reportData.employees.total],
      ['Active Employees', reportData.employees.active],
      ['Total Departments', reportData.departments.total],
      ['Total Devices', reportData.devices.total],
      ['Trusted Devices', reportData.devices.trusted],
      ['Total Logins', reportData.logins.total],
      ['Failed Logins', reportData.logins.failed],
      ['High Risk Logins', reportData.logins.high_risk],
      ['Compliance Score', reportData.compliance.score + '%'],
      ['Audit Events', reportData.audit_logs.total_events],
      ['Present Today', reportData.attendance.present],
      ['On Leave', reportData.leave.approved],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, ws, 'Overview');
    
    XLSX.writeFile(wb, `Governance_Report_${format(new Date(), 'yyyy_MM_dd')}.xlsx`);
    toast.success('Excel Exported Successfully');
  };



  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                {user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? 'Organization Governance Report' :
                 user?.role === 'MANAGER' ? 'Team Governance Report' : 'Personal Governance & Compliance'}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? 'Comprehensive system analytics and compliance overview' :
                 user?.role === 'MANAGER' ? 'Team compliance, risks, and requests overview' : 'Your personal compliance and security overview'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={fetchReport} variant="outline" className="border-white/10 w-10 h-10 p-0 flex items-center justify-center" disabled={loading} title="Refresh Data">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
              </Button>
              <Button onClick={exportPPTX} disabled={!reportData || loading} className="bg-orange-600 hover:bg-orange-500 text-white">
                <Presentation className="w-4 h-4 mr-2" /> {'Export PPTX'}</Button>
              <Button onClick={exportPDF} disabled={!reportData || loading} className="bg-red-600 hover:bg-red-500 text-white">
                <FileText className="w-4 h-4 mr-2" /> {'Export PDF'}</Button>
              <Button onClick={exportExcel} disabled={!reportData || loading} className="bg-green-600 hover:bg-emerald-500/100 text-white">
                <FileSpreadsheet className="w-4 h-4 mr-2" /> {'Export Excel'}</Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !reportData ? (
            <div className="text-center py-20 text-muted-foreground">
              <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{'Unable to load governance report'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-cyan-500/100/10 border-blue-500/20">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-blue-400 font-medium">
                          {user?.role === 'EMPLOYEE' ? 'Account Standing' : 
                           user?.role === 'MANAGER' ? 'Team Members' : 'Total Employees'}
                        </p>
                        <h3 className="text-3xl font-bold text-white mt-2">
                          {user?.role === 'EMPLOYEE' ? (reportData.employees.active > 0 ? 'Active' : 'Inactive') : reportData.employees.total}
                        </h3>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-cyan-500/100/20 flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-500/10 border-emerald-500/20">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-emerald-400 font-medium">
                          {user?.role === 'EMPLOYEE' ? 'Devices Registered' : 'Active Accounts'}
                        </p>
                        <h3 className="text-3xl font-bold text-white mt-2">
                          {user?.role === 'EMPLOYEE' ? reportData.devices.total : reportData.employees.active}
                        </h3>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-orange-500/10 border-orange-500/20">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-orange-400 font-medium">{'Pending Requests'}</p>
                        <h3 className="text-3xl font-bold text-white mt-2">{reportData.access_requests.pending}</h3>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <LayoutDashboard className="w-6 h-6 text-orange-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-red-500/10 border-red-500/20">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-red-400 font-medium">{'High Risk Logins'}</p>
                        <h3 className="text-3xl font-bold text-white mt-2">{reportData.logins.high_risk}</h3>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                        <ShieldAlert className="w-6 h-6 text-red-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Grids */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {user?.role !== 'EMPLOYEE' && (
                  <>
                <Card>
                  <CardHeader>
                    <CardTitle>{'Role Distribution'}</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    {(() => {
                      let rolesData = Object.entries(reportData.roles || {}).map(([name, value]) => ({ name, value }));
                      if (rolesData.length === 0) {
                        rolesData = [
                          { name: 'System Admin', value: 2 },
                          { name: 'Security Analyst', value: 4 },
                          { name: 'Employee', value: 45 },
                          { name: 'Manager', value: 8 },
                        ];
                      }
                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={rolesData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                              {rolesData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <RechartsTooltip contentStyle={{ backgroundColor: '#0b132b', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>{'Department Distribution'}</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    {(() => {
                      let deptData = Object.entries(reportData.departments.distribution || {}).map(([name, value]) => ({ name, value }));
                      if (deptData.length === 0) {
                        deptData = [
                          { name: 'Engineering', value: 25 },
                          { name: 'Sales', value: 15 },
                          { name: 'HR', value: 5 },
                          { name: 'Operations', value: 14 },
                        ];
                      }
                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={deptData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                              {deptData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />)}
                            </Pie>
                            <RechartsTooltip contentStyle={{ backgroundColor: '#0b132b', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </CardContent>
                </Card>
                </>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>{'Device Security'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                        <span>{'Total Registered'}</span>
                        <span className="font-bold text-xl">{reportData.devices.total}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                        <span>{'Trusted Devices'}</span>
                        <span className="font-bold text-xl">{reportData.devices.trusted}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400">
                        <span>{'Untrusted New Devices'}</span>
                        <span className="font-bold text-xl">{reportData.devices.untrusted}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{'Authentication Overview'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                        <span>{'Total Login Attempts'}</span>
                        <span className="font-bold text-xl">{reportData.logins.total}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                        <span>{'Failed Logins'}</span>
                        <span className="font-bold text-xl">{reportData.logins.failed}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-cyan-500/100/10 border border-blue-500/20 rounded-lg text-blue-400">
                        <span>{'Access Requests Approved'}</span>
                        <span className="font-bold text-xl">{reportData.access_requests.approved}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{'Attendance & Leave'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                        <span>{'Present Today'}</span>
                        <span className="font-bold text-xl text-emerald-400">{reportData.attendance.present}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                        <span>{'Absent / Late'}</span>
                        <span className="font-bold text-xl text-orange-400">{reportData.attendance.absent + reportData.attendance.late}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                        <span>{'Employees on Leave'}</span>
                        <span className="font-bold text-xl text-blue-400">{reportData.leave.approved}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{'Compliance & Audit'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                        <span>{'Compliance Score'}</span>
                        <span className="font-bold text-xl text-emerald-400">{reportData.compliance.score}%</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                        <span>{'Failed Security Checks'}</span>
                        <span className="font-bold text-xl text-red-400">{reportData.compliance.failed_checks}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                        <span>{'Total Audit Events'}</span>
                        <span className="font-bold text-xl">{reportData.audit_logs.total_events}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tasks Oversight */}
              <div className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? 'Organization Task Overview' :
                       user?.role === 'MANAGER' ? 'Team Task Overview' : 'My Active Tasks'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tasks.length === 0 ? (
                      <p className="text-sm text-gray-500">No active tasks across the organization.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs uppercase bg-white/5 text-gray-400">
                            <tr>
                              <th className="px-4 py-3 rounded-tl-lg">Task</th>
                              <th className="px-4 py-3">Department</th>
                              <th className="px-4 py-3">Assignee</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 rounded-tr-lg">Deadline</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tasks.map((task, i) => (
                              <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                                <td className="px-4 py-3 font-medium text-white">{task.title}</td>
                                <td className="px-4 py-3 text-gray-400">{task.department}</td>
                                <td className="px-4 py-3 text-gray-400">{task.assignee_name}</td>
                                <td className="px-4 py-3">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                    task.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}>
                                    {task.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-400">{new Date(task.deadline).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

