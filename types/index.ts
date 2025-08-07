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
  letter_type: string;
  reason?: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  approver?: {
    id: string;
    name: string;
    email: string;
  };
  participants: Participant[];
}

export interface Participant {
  id: string;
  name: string;
  class: string;
  letter_id: string;
}

export interface FormData {
  date: string;
  time_start: string;
  time_end: string;
  location: string;
  activity: string;
  letter_type: string;
  reason: string;
  participants: Array<{
    name: string;
    class: string;
  }>;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: { message: string; type: string } }>;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
}