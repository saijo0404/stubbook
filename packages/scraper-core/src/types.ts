import { z } from 'zod';

export const TicketPlatformEnum = z.enum(['KKTIX', 'TIXCRAFT', 'TICKET_PLUS', 'IBON', 'OTHER']);
export type TicketPlatform = z.infer<typeof TicketPlatformEnum>;

export const TicketStatusEnum = z.enum([
  'AVAILABLE',
  'SOLD_OUT',
  'NOT_STARTED',
  'CANCELLED',
  'UNKNOWN',
]);
export type TicketStatus = z.infer<typeof TicketStatusEnum>;

export const TicketTierSchema = z.object({
  name: z.string(),
  price: z.number().min(0),
  currency: z.string().default('TWD'),
  status: TicketStatusEnum.default('UNKNOWN'),
  description: z.string().optional(),
});
export type TicketTier = z.infer<typeof TicketTierSchema>;

export const ScrapedSessionSchema = z.object({
  id: z.string().optional(),
  sessionTitle: z.string().optional(),
  sessionDate: z.string(), // ISO 8601 string
  doorsOpenTime: z.string().optional(),
  ticketSaleTime: z.string().optional(),
  venueName: z.string().default('未知場館'),
  venueAddress: z.string().optional(),
  ticketPlatform: TicketPlatformEnum.default('OTHER'),
  ticketTiers: z.array(TicketTierSchema).default([]),
  bookingUrl: z.string().url().optional(),
});
export type ScrapedSession = z.infer<typeof ScrapedSessionSchema>;

export const ScrapedEventSchema = z.object({
  title: z.string().min(1, '活動名稱不得為空'),
  artist: z.string().optional(),
  tourName: z.string().optional(),
  sourceUrl: z.string().url(),
  posterUrl: z.string().url().optional(),
  description: z.string().optional(),
  organizer: z.string().optional(),
  platform: TicketPlatformEnum,
  sessions: z.array(ScrapedSessionSchema).min(1, '至少需包含一個場次資訊'),
  rawMetadata: z.record(z.unknown()).optional(),
});
export type ScrapedEvent = z.infer<typeof ScrapedEventSchema>;
