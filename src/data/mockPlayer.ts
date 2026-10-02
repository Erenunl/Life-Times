import type { DashboardEvent, QuickAction } from "../types/game";

export const recentEvents: DashboardEvent[] = [
  {
    id: "event-001",
    title: "School term is underway",
    detail: "Classes are in session, and your early choices are starting to shape your future path.",
  },
  {
    id: "event-002",
    title: "Guidance office posted updates",
    detail: "Academic opportunities and activities will be expanded in a later school system.",
  },
  {
    id: "event-003",
    title: "Local forum is quiet",
    detail: "No new city announcements have been posted today.",
  },
];

export const quickActions: QuickAction[] = [
  { id: "action-study", label: "Study" },
  { id: "action-school", label: "Attend school" },
  { id: "action-city", label: "Visit city center" },
  { id: "action-forums", label: "Read forums" },
];
