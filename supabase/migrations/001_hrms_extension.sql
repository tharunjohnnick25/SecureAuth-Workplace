-- HRMS Extension: Employee & Department Management
-- Adds employee-specific fields and document management

-- Extend users table with HRMS fields
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS date_of_joining DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(20);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) DEFAULT 'Full-time';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS salary NUMERIC;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Employee Documents table
CREATE TABLE IF NOT EXISTS public.employee_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Departments enhancements
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Attendance summary view (simplified for HRMS)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'present',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- Leave balance table
CREATE TABLE IF NOT EXISTS public.leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    total_days NUMERIC NOT NULL DEFAULT 0,
    used_days NUMERIC NOT NULL DEFAULT 0,
    pending_days NUMERIC NOT NULL DEFAULT 0,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, leave_type, year)
);

-- RLS Policies
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON public.employee_documents FOR SELECT USING (auth.uid() = employee_id);
CREATE POLICY "Admins can manage all documents" ON public.employee_documents FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Users can view own attendance" ON public.attendance_records FOR SELECT USING (auth.uid() = employee_id);
CREATE POLICY "Users can view own leave" ON public.leave_balances FOR SELECT USING (auth.uid() = employee_id);

-- Departments RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Trigger to update employee_count in departments
CREATE OR REPLACE FUNCTION public.update_department_employee_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.departments
        SET employee_count = (
            SELECT COUNT(*) FROM public.users WHERE department = NEW.department
        )
        WHERE name = NEW.department;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_department_count ON public.users;
CREATE TRIGGER trg_update_department_count
    AFTER INSERT OR UPDATE OF department OR DELETE
    ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_department_employee_count();

-- Function to get department analytics
CREATE OR REPLACE FUNCTION public.get_department_analytics()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH dept_stats AS (
        SELECT
            d.name,
            d.head,
            d.employee_count,
            COALESCE((
                SELECT COUNT(*) FROM public.users u
                WHERE u.department = d.name AND u.status = 'active'
            ), 0) as active_count,
            COALESCE((
                SELECT COUNT(*) FROM public.users u
                WHERE u.department = d.name AND u.status != 'active'
            ), 0) as inactive_count
        FROM public.departments d
    )
    SELECT JSONB_BUILD_OBJECT(
        'totalDepartments', (SELECT COUNT(*) FROM public.departments),
        'totalEmployees', (SELECT COUNT(*) FROM public.users WHERE department IS NOT NULL),
        'activeEmployees', (SELECT COUNT(*) FROM public.users WHERE status = 'active'),
        'inactiveEmployees', (SELECT COUNT(*) FROM public.users WHERE status != 'active'),
        'avgEmployeesPerDept', COALESCE((SELECT ROUND(AVG(employee_count)::numeric, 1) FROM public.departments), 0),
        'largestDepartment', (SELECT name FROM public.departments ORDER BY employee_count DESC LIMIT 1),
        'smallestDepartment', (SELECT name FROM public.departments ORDER BY employee_count ASC LIMIT 1),
        'departments', JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'name', name,
                'head', head,
                'employeeCount', employee_count,
                'activeCount', active_count,
                'inactiveCount', inactive_count
            )
        )
    ) INTO result
    FROM dept_stats;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
