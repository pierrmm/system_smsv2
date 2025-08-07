"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: { message: string; type: string } }>;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check if user is admin
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  useEffect(() => {
    // Check if user is logged in from localStorage
    const checkUser = async () => {
      try {
        const savedUser = localStorage.getItem('admin_user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          console.log('Found saved user:', parsedUser);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error checking saved user:', error);
        localStorage.removeItem('admin_user');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Attempting login with:', { email, password });
      
      // Call API untuk login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('API Response:', data);

      if (response.ok) {
        const userObj = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          is_active: data.user.is_active
        };

        setUser(userObj);
        localStorage.setItem('admin_user', JSON.stringify(userObj));
        console.log('User logged in successfully:', userObj);
        
        router.push('/dashboard'); // Redirect to dashboard after successful login

        return { error: undefined };
      } else {
        return { 
          error: { 
            message: data.message || 'Login gagal',
            type: 'credentials'
          } 
        };
      }

    } catch (error) {
      console.error('Login error:', error);
      return { 
        error: { 
          message: 'Terjadi kesalahan sistem. Silakan coba lagi.',
          type: 'system'
        } 
      };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log('Signing out user');
    setUser(null);
    localStorage.removeItem('admin_user');
    router.push('/login'); // Redirect to login page after sign out
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
    isAdmin
  };

  console.log('AuthContext current state:', { user, loading });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}