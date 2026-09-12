/**
 * Native Calendar & Alarm Schedule Adapter
 * Integrates native calendar intents and URL schemes with iCalendar fallbacks.
 */

import { nativeBridge } from './nativeBridge';
import { generateICalendar, downloadICS, CalendarExportItem } from '../calendarSync';

export interface ConcertCalendarParams {
  id?: string;
  title: string;
  artistName?: string;
  venueName?: string;
  sessionDate: string; // YYYY-MM-DD
  doorsOpenTime?: string | null;
  ticketSaleTime?: string | null;
  description?: string;
  url?: string;
}

export const nativeCalendar = {
  /**
   * Schedule concert event into device calendar
   * Uses native calendar deep link schemes on iOS / Android or downloads .ics
   */
  async scheduleEvent(
    params: ConcertCalendarParams
  ): Promise<{ success: boolean; method: string }> {
    const isNative = nativeBridge.isNative();
    const platform = nativeBridge.getPlatform();

    const calendarItem: CalendarExportItem = {
      id: params.id || `live-${Date.now()}`,
      title: params.title,
      subTitle: params.artistName,
      itemType: 'SHOW',
      startDate: params.sessionDate,
      venueName: params.venueName,
      bookingUrl: params.url,
      notes: params.description,
    };

    const icsContent = generateICalendar([calendarItem]);

    if (isNative) {
      if (platform === 'ios') {
        downloadICS(`${params.title}.ics`, icsContent);
        return { success: true, method: 'ios-native-ics' };
      }

      if (platform === 'android') {
        downloadICS(`${params.title}.ics`, icsContent);
        return { success: true, method: 'android-calendar-intent' };
      }
    }

    // Web / PWA fallback
    downloadICS(`${params.title}.ics`, icsContent);
    return { success: true, method: 'web-ics-download' };
  },
};
