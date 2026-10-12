/**
 * Typen des Datenbankschemas (entspricht supabase/migrations).
 * Kann nach Änderungen mit `npm run db:types` neu erzeugt werden.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };

export type PlayerRow = {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  jersey_number: number | null;
  /** null = Position noch offen */
  primary_position: string | null;
  alternative_positions: string[];
  height_cm: number | null;
  throwing_hand: Database["public"]["Enums"]["throwing_hand"] | null;
  photo_path: string | null;
  strengths: string[];
  strengths_notes: string | null;
  weaknesses: string[];
  weaknesses_notes: string | null;
  attack_traits: string[];
  attack_behavior: string | null;
  defense_traits: string[];
  defense_behavior: string | null;
  tactical_notes: string | null;
  coach_notes: string | null;
  general_notes: string | null;
  motivation_status: Database["public"]["Enums"]["motivation_status"];
  motivation_note: string | null;
  motivation_assessed_at: string | null;
} & Timestamps;

type PlayerInsert = Partial<Omit<PlayerRow, "team_id" | "first_name" | "last_name">> &
  Pick<PlayerRow, "team_id" | "first_name" | "last_name">;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string } & Timestamps;
        Insert: { id: string; display_name?: string; created_at?: string; updated_at?: string };
        Update: { display_name?: string };
        Relationships: [];
      };
      teams: {
        Row: { id: string; name: string; owner_id: string } & Timestamps;
        Insert: { id?: string; name: string; owner_id: string };
        Update: { name?: string };
        Relationships: [];
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["team_role"];
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id: string;
          role?: Database["public"]["Enums"]["team_role"];
        };
        Update: { role?: Database["public"]["Enums"]["team_role"] };
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      players: {
        Row: PlayerRow;
        Insert: PlayerInsert;
        Update: Partial<Omit<PlayerRow, "id" | "team_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      lineups: {
        Row: { id: string; team_id: string; name: string; is_active: boolean } & Timestamps;
        Insert: { id?: string; team_id: string; name?: string; is_active?: boolean };
        Update: { name?: string; is_active?: boolean };
        Relationships: [];
      };
      player_notes: {
        Row: {
          id: string;
          team_id: string;
          player_id: string;
          author_id: string | null;
          note_date: string;
          body: string;
        } & Timestamps;
        Insert: { id?: string; team_id: string; player_id: string; note_date: string; body: string; author_id?: string };
        Update: { note_date?: string; body?: string };
        Relationships: [];
      };
      lineup_positions: {
        Row: {
          id: string;
          lineup_id: string;
          team_id: string;
          player_id: string;
          position_code: string;
          sort_order: number;
        } & Timestamps;
        Insert: {
          id?: string;
          lineup_id: string;
          team_id: string;
          player_id: string;
          position_code: string;
          sort_order?: number;
        };
        Update: { position_code?: string; sort_order?: number };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_team: { Args: { p_name: string }; Returns: string };
      add_team_member: {
        Args: { p_team: string; p_email: string; p_role: Database["public"]["Enums"]["team_role"] };
        Returns: string;
      };
      set_member_role: {
        Args: { p_member: string; p_role: Database["public"]["Enums"]["team_role"] };
        Returns: undefined;
      };
      move_player: {
        Args: {
          p_lineup: string;
          p_player: string;
          p_target: string;
          p_bench_index?: number | null;
          p_displaced?: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      team_role: "owner" | "coach" | "viewer";
      motivation_status: "unrated" | "green" | "yellow" | "red";
      throwing_hand: "left" | "right" | "both";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type TeamRole = Database["public"]["Enums"]["team_role"];
export type ThrowingHand = Database["public"]["Enums"]["throwing_hand"];
export type LineupPositionRow = Database["public"]["Tables"]["lineup_positions"]["Row"];
export type PlayerUpdate = Database["public"]["Tables"]["players"]["Update"];
export type PlayerInsertRow = Database["public"]["Tables"]["players"]["Insert"];
