export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      artists: {
        Row: {
          id: string;
          name: string;
          english_name: string | null;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          english_name?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          english_name?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
      };
      venues: {
        Row: {
          id: string;
          name: string;
          city: string | null;
          address: string | null;
          country: string;
          capacity: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          city?: string | null;
          address?: string | null;
          country?: string;
          capacity?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          city?: string | null;
          address?: string | null;
          country?: string;
          capacity?: number | null;
          created_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          title: string;
          artist_id: string | null;
          tour_name: string | null;
          source_url: string;
          poster_url: string | null;
          platform: string;
          description: string | null;
          organizer: string | null;
          raw_metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          artist_id?: string | null;
          tour_name?: string | null;
          source_url: string;
          poster_url?: string | null;
          platform?: string;
          description?: string | null;
          organizer?: string | null;
          raw_metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          artist_id?: string | null;
          tour_name?: string | null;
          source_url?: string;
          poster_url?: string | null;
          platform?: string;
          description?: string | null;
          organizer?: string | null;
          raw_metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      event_sessions: {
        Row: {
          id: string;
          event_id: string;
          venue_id: string | null;
          venue_name_override: string | null;
          session_title: string | null;
          session_date: string;
          doors_open_time: string | null;
          ticket_sale_time: string | null;
          ticket_platform: string;
          ticket_tiers: Json;
          booking_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          venue_id?: string | null;
          venue_name_override?: string | null;
          session_title?: string | null;
          session_date: string;
          doors_open_time?: string | null;
          ticket_sale_time?: string | null;
          ticket_platform?: string;
          ticket_tiers?: Json;
          booking_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          venue_id?: string | null;
          venue_name_override?: string | null;
          session_title?: string | null;
          session_date?: string;
          doors_open_time?: string | null;
          ticket_sale_time?: string | null;
          ticket_platform?: string;
          ticket_tiers?: Json;
          booking_url?: string | null;
          created_at?: string;
        };
      };
      user_attendances: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          status: 'WANT_TO_GO' | 'TICKETING' | 'CONFIRMED' | 'ATTENDED' | 'MISSED';
          seat_info: string | null;
          ticket_type: 'PHYSICAL' | 'DIGITAL' | 'WRISTBAND' | 'OTHER';
          ticket_price: number | null;
          currency: string;
          rating: number | null;
          notes: string | null;
          ticket_stub_url: string | null;
          stub_privacy_masked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          status?: 'WANT_TO_GO' | 'TICKETING' | 'CONFIRMED' | 'ATTENDED' | 'MISSED';
          seat_info?: string | null;
          ticket_type?: 'PHYSICAL' | 'DIGITAL' | 'WRISTBAND' | 'OTHER';
          ticket_price?: number | null;
          currency?: string;
          rating?: number | null;
          notes?: string | null;
          ticket_stub_url?: string | null;
          stub_privacy_masked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string;
          status?: 'WANT_TO_GO' | 'TICKETING' | 'CONFIRMED' | 'ATTENDED' | 'MISSED';
          seat_info?: string | null;
          ticket_type?: 'PHYSICAL' | 'DIGITAL' | 'WRISTBAND' | 'OTHER';
          ticket_price?: number | null;
          currency?: string;
          rating?: number | null;
          notes?: string | null;
          ticket_stub_url?: string | null;
          stub_privacy_masked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      merchandise_items: {
        Row: {
          id: string;
          attendance_id: string;
          user_id: string;
          item_name: string;
          category:
            'LIGHTSTICK' | 'APPAREL' | 'TOWEL' | 'PAMPHLET' | 'BADGE' | 'ACCESSORY' | 'OTHER';
          price: number;
          currency: string;
          quantity: number;
          photo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          attendance_id: string;
          user_id: string;
          item_name: string;
          category?:
            'LIGHTSTICK' | 'APPAREL' | 'TOWEL' | 'PAMPHLET' | 'BADGE' | 'ACCESSORY' | 'OTHER';
          price?: number;
          currency?: string;
          quantity?: number;
          photo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          attendance_id?: string;
          user_id?: string;
          item_name?: string;
          category?:
            'LIGHTSTICK' | 'APPAREL' | 'TOWEL' | 'PAMPHLET' | 'BADGE' | 'ACCESSORY' | 'OTHER';
          price?: number;
          currency?: string;
          quantity?: number;
          photo_url?: string | null;
          created_at?: string;
        };
      };
      attendance_media: {
        Row: {
          id: string;
          attendance_id: string;
          user_id: string;
          media_url: string;
          media_type: 'PHOTO' | 'VIDEO' | 'AUDIO';
          captured_at: string | null;
          caption: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          attendance_id: string;
          user_id: string;
          media_url: string;
          media_type?: 'PHOTO' | 'VIDEO' | 'AUDIO';
          captured_at?: string | null;
          caption?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          attendance_id?: string;
          user_id?: string;
          media_url?: string;
          media_type?: 'PHOTO' | 'VIDEO' | 'AUDIO';
          captured_at?: string | null;
          caption?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
