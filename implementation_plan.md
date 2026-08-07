# Comprehensive HRMS & IAM Enterprise Application Plan

## Goal Description
Transform the application into a comprehensive Enterprise HRMS + IAM platform. This involves enhancing the landing page, restructuring the authentication flow to distinguish between Admins and Employees, implementing face-recognition-based employee login, and adding robust internal modules such as task management, leave management, confidential file access, and AI risk score monitoring.

## User Review Required
> [!IMPORTANT]
> The database schema already contains foundations for tasks, approval requests (leaves, profiles), and calendar events (migrations 007 & 010). We will leverage these existing tables to build the frontend interfaces.
> 
> For **Face Verification**, we will use the existing camera capture components and store the embeddings/images in the backend. 
> 
> Are you using any specific external AI service (like AWS Rekognition or a custom Python backend) for face verification, or should we build a simulated matching logic using frontend biometrics/Supabase storage for the prototype?

## Proposed Changes

---

### Landing Page Enhancements
Update the root landing page to match the precise content requirements in a dark theme.
- **[MODIFY]** `app/page.tsx`: Ensure dark mode styling. Add new sections.
- **[MODIFY]** `components/landing/Footer.tsx`: Add distinct links for Contact Us, Subscription Plans, About Us, Privacy Policy.

---

### Authentication & Identification Flow
Completely revamp the login process to support two distinct flows (Admin vs Employee).
- **[MODIFY]** `components/pages/Login.tsx` (or route `app/login`): Add an initial toggle/selection for "Admin" or "Employee".
- **[NEW]** `components/auth/AdminLogin.tsx`: Handle Admin login via official company email. Integrate company domain detection.
- **[NEW]** `components/auth/EmployeeLogin.tsx`: Handle Employee login via Employee ID + Face Verification capture.
- **[NEW]** `components/auth/AdminRegistration.tsx`: Admin selects their company from a global list (or registers a new one via their email domain) during sign-up.
- **[MODIFY]** `lib/api-client.ts` / `middleware.ts`: Hook into successful login/logout events to automatically write records to the `attendance_logs` table (recording check-in and check-out times).

---

### Admin Dashboard & Employee Management
Interfaces for the Admin to manage the organization and monitor security.
- **[MODIFY]** `app/admin/employees/new/page.tsx`: Form for Admin to onboard employees, input their details, and **register their face data** (via camera capture or photo upload).
- **[MODIFY]** `components/pages/AdminDashboard.tsx`: Enhance the Risk Score section. Display scores dynamically out of 100, explicitly highlighting scores < 80 as "At Risk" and >= 80 as "Secure" based on location, typing, and device factors.
- **[NEW]** `app/admin/approvals/page.tsx`: Central hub for Admins to approve/reject Employee requests (Leaves, Profile modifications, Confidential File access).

---

### Employee Self-Service Modules
Interfaces for employees to manage their work and requests.
- **[NEW]** `app/leaves/page.tsx`: Email-style form for Employees to apply for leave. Includes a description field and a file upload zone for supporting documents.
- **[MODIFY]** `app/profile/page.tsx`: Lock down sensitive profile fields. When an employee edits a restricted field, submit an entry to the `approval_requests` table instead of updating the `users` table directly.
- **[NEW]** `app/documents/page.tsx`: View list of company confidential files. Employees can view authorized files and click "Request Access" for locked ones.

---

### Task Management & Calendar
- **[NEW]** `app/tasks/page.tsx`: To-Do list interface. Admins can create and assign weekly tasks with deadlines. Employees can view and mark tasks as completed.
- **[MODIFY]** `app/calendar/page.tsx`: Visual calendar mapping out assigned task deadlines and approved leaves using the `calendar_events` table.

## Verification Plan

### Automated Tests
- N/A for UI components, standard Next.js build validation will be used (`npm run build`).

### Manual Verification
1. **Landing Page**: Verify all required footer links and dark mode appearance.
2. **Auth Flow**: Register as Admin (domain detection). Create an Employee with face data. Log out. Log in as Employee using ID + Face verification. Verify attendance is logged.
3. **HRMS Workflow**: Request leave as Employee -> Approve as Admin. Assign task as Admin -> View on Employee Calendar. Update profile as Employee -> Approve as Admin.
4. **Security Dashboard**: View the 0-100 Risk Score UI and verify threshold colors.
