'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardBody } from '@heroui/card';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell
} from '@heroui/table';
import { Chip } from '@heroui/chip';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from '@heroui/modal';
import { Select, SelectItem } from '@heroui/select';
import { Spinner } from '@heroui/spinner';
import {
  IconUsers,
  IconPlus,
  IconEdit,
  IconTrash,
  IconSearch,
  IconEye
} from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function UsersPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    is_active: true
  });
  const [accessDenied, setAccessDenied] = useState(false);

  // Update useEffect untuk redirect
  useEffect(() => {
    if (!isAdmin()) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
  }, [isAdmin, router]);

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
    }
  }, [isAdmin]);

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle modal open for add/edit
  const handleOpenModal = (user?: User) => {
    if (user) {
      setIsEditing(true);
      setSelectedUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        is_active: user.is_active
      });
    } else {
      setIsEditing(false);
      setSelectedUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'user',
        is_active: true
      });
    }
    onOpen();
  };

  // Handle modal close
  const handleCloseModal = () => {
    onClose();
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user',
      is_active: true
    });
    setSelectedUser(null);
    setIsEditing(false);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = isEditing ? `/api/users/${selectedUser?.id}` : '/api/users';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchUsers();
        handleCloseModal();
      } else {
        const error = await response.json();
        console.error('Error saving user:', error);
        alert(error.message || 'Error saving user');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user');
    }
  };

  // Handle delete user
  const handleDelete = async (userId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
      try {
        const response = await fetch(`/api/users/${userId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          await fetchUsers();
        } else {
          console.error('Error deleting user');
          alert('Error deleting user');
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user');
      }
    }
  };

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <IconUsers className="h-16 w-16 text-red-500 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Akses Ditolak
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Hanya administrator yang dapat mengakses halaman manajemen pengguna.
          </p>
          <Button
            color="primary"
            onPress={() => router.push('/dashboard')}
          >
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const adminUsers = users.filter(u => u.role === 'admin').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Manajemen Pengguna
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Kelola pengguna sistem surat menyurat
          </p>
        </div>
        <Button
          color="primary"
          startContent={<IconPlus className="h-4 w-4" />}
          onPress={() => handleOpenModal()}
        >
          Tambah Pengguna
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Pengguna
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {totalUsers}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                <IconUsers className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Pengguna Aktif
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {activeUsers}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                <IconUsers className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Administrator
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {adminUsers}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900">
                <IconUsers className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardBody className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Cari pengguna..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              startContent={<IconSearch className="h-4 w-4 text-gray-400" />}
              className="flex-1"
            />
          </div>
        </CardBody>
      </Card>

      {/* Users Table */}
      <Card>
        <CardBody className="p-0">
          <Table aria-label="Users table">
            <TableHeader>
              <TableColumn>NAMA</TableColumn>
              <TableColumn>EMAIL</TableColumn>
              <TableColumn>ROLE</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn>TANGGAL DIBUAT</TableColumn>
              <TableColumn>AKSI</TableColumn>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {user.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-gray-600 dark:text-gray-400">
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip
                      color={user.role === 'admin' ? 'primary' : 'default'}
                      variant="flat"
                      size="sm"
                    >
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      color={user.is_active ? 'success' : 'danger'}
                      variant="flat"
                      size="sm"
                    >
                      {user.is_active ? 'Aktif' : 'Nonaktif'}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="text-gray-600 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString('id-ID')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="light"
                        color="primary"
                        onPress={() => handleOpenModal(user)}
                      >
                        <IconEdit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => handleDelete(user.id)}
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Add/Edit User Modal */}
      <Modal isOpen={isOpen} onClose={handleCloseModal} size="2xl">
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>
              {isEditing ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <Input
                  label="Nama Lengkap"
                  placeholder="Masukkan nama lengkap"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                
                <Input
                  label="Email"
                  type="email"
                  placeholder="Masukkan email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                
                <Input
                  label={isEditing ? "Password Baru (kosongkan jika tidak ingin mengubah)" : "Password"}
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!isEditing}
                  endContent={
                    <button
                      className="focus:outline-none"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <IconEye className="h-4 w-4 text-gray-400" />
                      ) : (
                        <IconEye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  }
                />
                
                <Select
                  label="Role"
                  placeholder="Pilih role"
                  selectedKeys={[formData.role]}
                  onSelectionChange={(keys) => {
                    const selectedRole = Array.from(keys)[0] as string;
                    setFormData({ ...formData, role: selectedRole });
                  }}
                >
                  <SelectItem key="user" value="user">
                    User
                  </SelectItem>
                  <SelectItem key="admin" value="admin">
                    Admin
                  </SelectItem>
                </Select>
                
                <Select
                  label="Status"
                  placeholder="Pilih status"
                  selectedKeys={[formData.is_active.toString()]}
                  onSelectionChange={(keys) => {
                    const selectedStatus = Array.from(keys)[0] as string;
                    setFormData({ ...formData, is_active: selectedStatus === 'true' });
                  }}
                >
                  <SelectItem key="true" value="true">
                    Aktif
                  </SelectItem>
                  <SelectItem key="false" value="false">
                    Nonaktif
                  </SelectItem>
                </Select>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="danger"
                variant="light"
                onPress={handleCloseModal}
              >
                Batal
              </Button>
              <Button
                color="primary"
                type="submit"
              >
                {isEditing ? 'Update' : 'Simpan'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}