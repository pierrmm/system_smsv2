import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Letter {
  id: string;
  letter_number: string;
  title: string;
  subject: string;
  content: string;
  type: 'incoming' | 'outgoing';
  sender: string;
  recipient: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PermissionLetter {
  id: string;
  letter_number: string;
  date: string;
  time_start: string;
  time_end: string;
  location: string;
  activity: string;
  letter_type: 'dispensasi' | 'keterangan' | 'surat_tugas' | 'lomba';
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  participants: PermissionParticipant[];
}

export interface PermissionParticipant {
  id: string;
  permission_letter_id: string;
  name: string;
  class: string;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: { message: string; type: string } }>;
  signOut: () => Promise<void>;
}