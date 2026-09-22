import {
  differenceInMinutes,
  formatDistanceToNowStrict,
} from "date-fns";

export function formatWaitingSince(iso: string): string {
  const date = new Date(iso);
  const mins = differenceInMinutes(new Date(), date);
  if (mins < 1) return "Just now";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}
