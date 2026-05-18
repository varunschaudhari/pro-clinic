import api from '@/lib/axios';

export interface DashboardSummary {
  todayAppointments: {
    total:      number;
    scheduled:  number;
    confirmed:  number;
    inProgress: number;
    completed:  number;
    cancelled:  number;
  };
  patientsSeenToday:    number;
  pendingLabReports:    number;
  lowStockCount:        number;
  outOfStockCount:      number;
  monthRevenue:         number;
  todayRevenue:         number;
  pendingBillsCount:    number;
  weeklyAppointments:   { date: string; count: number }[];
  weeklyRevenue:        { date: string; revenue: number }[];
  upcomingAppointments: {
    _id:          string;
    tokenDisplay: string;
    slotStart:    string;
    status:       string;
    patient:      { name: string };
    doctor:       { name: string };
  }[];
}

export const dashboardApi = {
  getSummary: () =>
    api.get<{ success: true; data: DashboardSummary }>('/dashboard'),
};
