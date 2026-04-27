SELECT email, role, active, "passwordHash" IS NOT NULL as has_password FROM users WHERE role = 'TECHNICIAN';
