# 🏫 SchoolHub — School Management System for Cambridge Curriculum Schools

<p align="center">
  <img src="public/Logo.png" alt="SchoolHub Logo" width="120" />
</p>

<p align="center">
  <strong>A modern, multi-tenant SaaS platform for managing academics, attendance, and parent communication in Cambridge Primary & IGCSE schools.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## 📖 What is this?

SchoolHub is a full-featured school management system built specifically for private schools following the **Cambridge International Curriculum**. It handles everything from daily attendance and grade tracking to homework assignments and parent communication — all in one unified platform.

Originally developed as "Green School E-Diary" for a real Cambridge school in Belgrade, Serbia, it has evolved into a white-label SaaS solution (branded as **Akio**) that any school can deploy on their own subdomain with custom branding.

**Key differentiator:** Native support for Cambridge grading scales (Primary Bands 1-6, IGCSE A*-U) with automatic grade calculations and visual feedback.

---

## ⚡ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, Tailwind CSS |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime) |
| **State Management** | React Context API |
| **Charts** | Recharts |
| **PDF Generation** | jsPDF + jspdf-autotable |
| **Icons** | Lucide React |
| **Date Handling** | date-fns |

### Architecture Highlights
- **Multi-tenant** via subdomain routing (`school1.app.com`, `school2.app.com`)
- **Row-Level Security (RLS)** for complete data isolation between schools
- **Role-based access** (Owner, Admin, Teacher, Parent)
- **Responsive design** optimized for desktop and tablet use in classrooms

---

## ✨ Key Features

### 👩‍🏫 Teacher Portal
- **Dashboard** — Today's schedule, upcoming tests, term progress, urgent alerts
- **Attendance** — Mark daily attendance with present/absent/late/sent-out statuses
- **Grades** — Enter assessments with automatic Cambridge grade calculation
- **Homework** — Assign and track completion per student
- **Schedule** — Weekly timetable view
- **Tests** — Create test papers with PDF export
- **Todo** — Personal task management

### 👨‍👩‍👧 Parent Portal
- **Dashboard** — Child overview with grades, attendance rate, homework status
- **Grades** — View all assessments with Cambridge grade display (Band 4, A*, etc.)
- **Homework** — Track what's done, partial, or overdue
- **Attendance** — Calendar view with monthly statistics
- **Calendar** — School events and upcoming tests

### 🔧 Admin Features
- **Academic Terms** — Configure school terms with dates
- **Classes & Subjects** — Manage class lists and subject colors
- **Teacher Scheduling** — Assign teachers to classes/periods
- **School Events** — Create holidays, assemblies, trips
- **Custom Branding** — School logo, colors, seasonal themes

### 🎨 Branding System
- Per-school customization (logo, primary/secondary colors)
- **Seasonal term colors** — Winter (blue), Spring (pink), Summer (amber)
- Admin toggle: use school colors vs. seasonal themes
- Auto-branded components throughout the app

---

## 🚀 Running Locally

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier works)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/schoolhub.git
cd schoolhub

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Configure `.env`
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DEFAULT_SCHOOL_SLUG=demo  # for local development
```

### Run development server
```bash
npm run dev
```

### Access via subdomain (local)
Add to your hosts file (`/etc/hosts` or `C:\Windows\System32\drivers\etc\hosts`):
```
127.0.0.1 demo.localhost
```

Then visit: `http://demo.localhost:5173`

---

## 📸 Screenshots

<details>
<summary><strong>Teacher Dashboard</strong></summary>
<p align="center">
  <img width="2776" height="1622" alt="image" src="https://github.com/user-attachments/assets/fb5d017f-d306-42a7-9511-41bba0619efb" />
  <em>Today's classes, upcoming tests, term progress with seasonal theming</em>
</p>
</details>


---

## 🗄️ Database Schema

The system uses **30+ tables** with full relational integrity:

| Category | Tables |
|----------|--------|
| **Core** | `schools`, `teachers`, `students`, `parents`, `student_parents` |
| **Academic** | `grades`, `attendance`, `homework`, `student_homework`, `scheduled_tests` |
| **Schedule** | `academic_terms`, `classes`, `teacher_schedule`, `school_events` |
| **Config** | `custom_classes`, `custom_subjects` |
| **Tasks** | `teacher_todos` |

All tables have `school_id` foreign key for multi-tenant isolation via RLS.

---

## 🎓 Cambridge Grading System

### Primary (Years 1-6): Bands
| Band | Percentage | Meaning |
|------|------------|---------|
| 6 | 90%+ | Exceptional |
| 5 | 80-89% | Very Good |
| 4 | 70-79% | Good |
| 3 | 60-69% | Satisfactory |
| 2 | 50-59% | Developing |
| 1 | <50% | Beginning |

### Secondary IGCSE (Years 7-9): Letter Grades
| Grade | Percentage |
|-------|------------|
| A* | 90%+ |
| A | 80-89% |
| B | 70-79% |
| C | 60-69% |
| D-U | Below 60% |

---

## 📁 Project Structure

```
src/
├── core/
│   ├── context/          # AppContext, AuthContext, BrandingContext, TenantContext
│   └── utils/            # gradingSystem, cambridgeGrading, pdfGenerator
├── shared/
│   ├── components/       # Branded UI components (Button, Card, Modal, etc.)
│   └── hooks/            # useActiveTerm, useTenant, useTermTheme
├── school/
│   └── features/
│       ├── admin/        # AdminDashboard
│       ├── attendance/   # AttendancePage, AttendanceLogPage
│       ├── calendar/     # TeacherCalendarPage
│       ├── dashboard/    # HomePage
│       ├── grading/      # GradesPage, TestMakerPage
│       ├── homework/     # HomeworkPage
│       ├── parents/      # ParentDashboard, ParentGradesPage, etc.
│       ├── schedule/     # SchedulePage
│       ├── settings/     # SettingsPage, TermColorsTab
│       ├── students/     # StudentsPage, DeleteStudentModal
│       └── tasks/        # TodoPage
└── App.jsx
```

---

## 🛣️ Roadmap

- [x] Multi-tenant architecture
- [x] Teacher & Parent portals
- [x] Cambridge grading system
- [x] Seasonal term theming
- [x] PDF generation with branding
- [ ] Term report cards (PDF)
- [ ] Email notifications for parents
- [ ] Mobile app (React Native)
- [ ] Multi-vertical expansion (gyms, dance studios)

---

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---


## 👩‍💻 Author

**Mia** — ICT Teacher & Full-Stack Developer

Built with ❤️ for Cambridge curriculum schools.

---

<p align="center">
  <strong>⭐ Star this repo if you find it useful!</strong>
</p>
