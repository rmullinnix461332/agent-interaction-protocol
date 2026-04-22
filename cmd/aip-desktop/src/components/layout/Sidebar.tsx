import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Box,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import StorageIcon from '@mui/icons-material/Storage'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PeopleIcon from '@mui/icons-material/People'
import BugReportIcon from '@mui/icons-material/BugReport'

const DRAWER_WIDTH = 220

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { id: 'engines', label: 'Engines', icon: <StorageIcon /> },
  { id: 'flows', label: 'Flows', icon: <AccountTreeIcon /> },
  { id: 'runs', label: 'Runs', icon: <PlayArrowIcon /> },
  { id: 'participants', label: 'Participants', icon: <PeopleIcon /> },
  { id: 'diagnostics', label: 'Diagnostics', icon: <BugReportIcon /> },
]

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <Drawer
      variant="permanent"
      sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
    >
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorageIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={600}>AIP Desktop</Typography>
        </Box>
      </Toolbar>
      <List>
        {navItems.map(item => (
          <ListItemButton
            key={item.id}
            selected={currentPage === item.id}
            onClick={() => onNavigate(item.id)}
            sx={{ mx: 1, borderRadius: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  )
}
