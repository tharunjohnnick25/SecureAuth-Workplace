import pptxgen from 'pptxgenjs';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export async function exportReportToPPT(data: any[], reportTitle: string = 'Attendance Report') {
  try {
    if (!data || data.length === 0) {
      toast.error('No records available to export to PowerPoint.');
      return;
    }

    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';

    // Slide 1: Title Slide
    const slide1 = pptx.addSlide();
    slide1.background = { color: '020617' };

    slide1.addText('SecureAuth Cybersecurity', {
      x: 0.8,
      y: 1.5,
      w: 8.5,
      h: 0.8,
      fontSize: 32,
      fontFace: 'Arial',
      color: '00F0FF',
      bold: true,
    });

    slide1.addText(`${reportTitle} - ${format(new Date(), 'MMMM d, yyyy')}`, {
      x: 0.8,
      y: 2.3,
      w: 8.5,
      h: 0.6,
      fontSize: 20,
      fontFace: 'Arial',
      color: '94A3B8',
    });

    slide1.addText('Enterprise Access Management & Real-Time Identity Telemetry', {
      x: 0.8,
      y: 3.2,
      w: 8.5,
      h: 0.5,
      fontSize: 14,
      fontFace: 'Arial',
      color: '64748B',
    });

    // Slide 2: Table Summary Slide
    const slide2 = pptx.addSlide();
    slide2.background = { color: '0B132B' };

    slide2.addText(`${reportTitle} Overview`, {
      x: 0.8,
      y: 0.5,
      w: 8.5,
      h: 0.6,
      fontSize: 22,
      fontFace: 'Arial',
      color: 'FFFFFF',
      bold: true,
    });

    // Format Table Headers & Rows
    const tableHeader = [
      { text: 'Employee ID', options: { fill: '1E293B', color: '00F0FF', bold: true, fontSize: 11 } },
      { text: 'Employee Name', options: { fill: '1E293B', color: '00F0FF', bold: true, fontSize: 11 } },
      { text: 'Date', options: { fill: '1E293B', color: '00F0FF', bold: true, fontSize: 11 } },
      { text: 'Check-In', options: { fill: '1E293B', color: '00F0FF', bold: true, fontSize: 11 } },
      { text: 'Check-Out', options: { fill: '1E293B', color: '00F0FF', bold: true, fontSize: 11 } },
      { text: 'Status', options: { fill: '1E293B', color: '00F0FF', bold: true, fontSize: 11 } },
    ];

    const tableRows = data.slice(0, 10).map((item, idx) => {
      const checkInDate = item.created_at || item.check_in ? new Date(item.created_at || item.check_in) : null;
      const checkOutDate = item.check_out ? new Date(item.check_out) : null;

      return [
        { text: item.users?.employee_id || item.employee_id || item.user_id || `EMP-${1001 + idx}`, options: { fontSize: 10, color: 'CBD5E1' } },
        { text: item.users?.full_name || item.full_name || 'System User', options: { fontSize: 10, color: 'FFFFFF' } },
        { text: checkInDate ? format(checkInDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'), options: { fontSize: 10, color: 'CBD5E1' } },
        { text: checkInDate ? format(checkInDate, 'hh:mm a') : '09:00 AM', options: { fontSize: 10, color: 'CBD5E1' } },
        { text: checkOutDate ? format(checkOutDate, 'hh:mm a') : '05:30 PM', options: { fontSize: 10, color: 'CBD5E1' } },
        { text: item.status === 'SUCCESS' || item.status === 'Present' || item.status === 'ACTIVE' ? 'Present' : 'Absent', options: { fontSize: 10, color: '10B981', bold: true } },
      ];
    });

    slide2.addTable([tableHeader, ...tableRows], {
      x: 0.8,
      y: 1.3,
      w: 8.4,
      colW: [1.3, 2.0, 1.3, 1.3, 1.3, 1.2],
      fontSize: 10,
      border: { pt: 1, color: '334155' },
    });

    const formattedDate = format(new Date(), 'yyyy_MM_dd');
    const fileName = `Attendance_Report_${formattedDate}.pptx`;

    // Save for Native Mobile vs Web
    if (Capacitor.isNativePlatform()) {
      const base64 = (await pptx.write({ outputType: 'base64' })) as string;
      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Documents,
      });
      toast.success(`Exported PowerPoint ${fileName} to Documents!`);
    } else {
      await pptx.writeFile({ fileName });
      toast.success(`Exported PowerPoint presentation as ${fileName}!`);
    }
  } catch (error: any) {
    console.error('Error exporting PPT presentation:', error);
    toast.error(error?.message || 'Failed to export PowerPoint report.');
  }
}
