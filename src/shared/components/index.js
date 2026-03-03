// ============================================================================
// BRANDED COMPONENTS LIBRARY
// Production-level, multi-tenant aware UI components
// ============================================================================

// Theme utilities
export * from './theme';
export { default as theme } from './theme';

// Button components
export { default as Button } from './Button';
export { ButtonGroup, IconButton } from './Button';

// Card components
export { default as Card } from './Card';
export { StatCard, SectionCard } from './Card';

// Form components
export { default as Input } from './Input';
export { Input as InputField, SearchInput, Select, Textarea, Checkbox, RadioGroup } from './Input';

// Modal components
export { default as Modal } from './Modal';
export { ConfirmModal, Drawer } from './Modal';

// Badge & Alert components
export { default as Badge } from './Badge';
export { Badge as TagBadge, StatusBadge, Alert, InlineAlert, Avatar, AvatarGroup, Spinner, LoadingOverlay, Skeleton } from './Badge';

// Tabs & Table components
export { default as Tabs } from './Tabs';
export { Tabs as TabsNav, TabPanels, TabPanel, Table, SimpleTable, Th, Td } from './Tabs';

// ============================================================================
// USAGE EXAMPLES
// ============================================================================
/*

// BUTTONS
import { Button, IconButton } from '@/shared/components/branded';

<Button>Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Delete</Button>
<Button loading>Loading...</Button>
<IconButton icon={<Edit />} />


// CARDS
import { Card, StatCard, SectionCard } from '@/shared/components/branded';

<Card header="Title" headerAction={<Button size="sm">Action</Button>}>
  Content here
</Card>

<StatCard 
  title="Students" 
  value={150} 
  icon={<Users />} 
  trend={5} 
/>

<SectionCard 
  title="Settings" 
  icon={<Settings />}
  collapsible
>
  Content
</SectionCard>


// FORMS
import { Input, Select, SearchInput, Checkbox } from '@/shared/components/branded';

<Input label="Name" placeholder="Enter name" required />
<Input label="Email" type="email" error="Invalid email" />
<Select label="Class">
  <option value="Y1">Year 1</option>
</Select>
<SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} />
<Checkbox label="I agree" checked={agreed} onChange={setAgreed} />


// MODALS
import { Modal, ConfirmModal, Drawer } from '@/shared/components/branded';

<Modal isOpen={isOpen} onClose={close} title="Edit" icon={<Edit />}>
  Content
</Modal>

<ConfirmModal
  isOpen={showConfirm}
  onClose={close}
  onConfirm={handleDelete}
  variant="danger"
  title="Delete Student?"
  message="This cannot be undone."
/>

<Drawer isOpen={showDrawer} onClose={close} title="Filters">
  Filter options
</Drawer>


// BADGES & ALERTS
import { Badge, StatusBadge, Alert, Avatar, Spinner } from '@/shared/components/branded';

<Badge>Default</Badge>
<Badge color="success">Success</Badge>
<StatusBadge status="active" />

<Alert type="success" title="Saved!">Changes saved.</Alert>
<Alert type="error" onClose={clearError}>{error}</Alert>

<Avatar name="John Doe" size="lg" />
<Spinner size="md" />


// TABS & TABLES
import { Tabs, TabPanels, TabPanel, Table } from '@/shared/components/branded';

<Tabs
  tabs={[
    { id: 'staff', label: 'Staff', icon: <Users />, count: 5 },
    { id: 'parents', label: 'Parents', icon: <Heart /> },
  ]}
  activeTab={activeTab}
  onChange={setActiveTab}
/>

<TabPanels activeTab={activeTab}>
  <TabPanel tabId="staff">Staff content</TabPanel>
  <TabPanel tabId="parents">Parents content</TabPanel>
</TabPanels>

<Table
  columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
  ]}
  data={students}
  onRowClick={openDetail}
  emptyMessage="No students"
  emptyIcon={<Users />}
/>

*/
