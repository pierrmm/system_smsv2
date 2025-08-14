import React, { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter
} from '@heroui/modal';
import { Input } from '@heroui/input';
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { Divider } from '@heroui/divider';
import {
  IconShieldCheck,
  IconShieldX,
  IconFileText,
  IconCalendar,
  IconMapPin,
  IconUsers,
  IconUser,
  IconClock
} from '@tabler/icons-react';

interface VerificationResult {
  valid: boolean;
  message: string;
  letterInfo?: {
    letterNumber: string;
    activity: string;
    location: string;
    date: string;
    letterType: string;
    status: string;
    participantCount: number;
    createdBy?: string;
    approvedBy?: string;
    approvedAt?: string;
    createdAt: string;
  };
}

interface DocumentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentVerificationModal({ isOpen, onClose }: DocumentVerificationModalProps) {
  const [letterNumber, setLetterNumber] = useState('');
  const [validationCode, setValidationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleVerify = async () => {
    if (!letterNumber.trim() || !validationCode.trim()) {
      alert('Mohon isi nomor surat dan kode validasi');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/verify-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          letterNumber: letterNumber.trim(),
          validationCode: validationCode.trim()
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error verifying document:', error);
      setResult({
        valid: false,
        message: 'Terjadi kesalahan saat verifikasi'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLetterNumber('');
    setValidationCode('');
    setResult(null);
    onClose();
  };

  const getLetterTypeText = (type: string) => {
    switch (type) {
      case 'dispensasi': return 'Surat Dispensasi';
      case 'keterangan': return 'Surat Keterangan';
      case 'surat_tugas': return 'Surat Tugas';
      case 'lomba': return 'Surat Izin Lomba';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      size="2xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <IconShieldCheck className="h-5 w-5 text-primary" />
            <span>Verifikasi Dokumen</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-normal">
            Masukkan nomor surat dan kode validasi untuk memverifikasi keaslian dokumen
          </p>
        </ModalHeader>
        
        <ModalBody>
          <div className="space-y-4">
            {/* Input Form */}
            <div className="space-y-3">
              <Input
                label="Nomor Surat"
                placeholder="Contoh: 001/SMS/2024"
                value={letterNumber}
                onChange={(e) => setLetterNumber(e.target.value)}
                startContent={<IconFileText className="h-4 w-4 text-gray-400" />}
              />
              
              <Input
                label="Kode Validasi"
                placeholder="Contoh: A1B2C3D4E5F6G7H8"
                value={validationCode}
                onChange={(e) => setValidationCode(e.target.value)}
                startContent={<IconShieldCheck className="h-4 w-4 text-gray-400" />}
                description="Kode validasi 16 karakter yang terdapat di bagian bawah PDF"
              />
            </div>

            {/* Verification Result */}
            {result && (
              <Card className={`border-2 ${result.valid ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'}`}>
                <CardBody className="p-4">
                  <div className="flex items-start gap-3">
                    {result.valid ? (
                      <IconShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <IconShieldX className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h4 className={`font-semibold ${result.valid ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                        {result.valid ? 'Dokumen Valid' : 'Dokumen Tidak Valid'}
                      </h4>
                      <p className={`text-sm mt-1 ${result.valid ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {result.message}
                      </p>
                    </div>
                  </div>

                  {/* Letter Information */}
                  {result.valid && result.letterInfo && (
                    <>
                      <Divider className="my-4" />
                      <div className="space-y-3">
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          Informasi Surat
                        </h5>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <IconFileText className="h-4 w-4 text-gray-400" />
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Jenis: </span>
                              <span className="font-medium">{getLetterTypeText(result.letterInfo.letterType)}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <IconCalendar className="h-4 w-4 text-gray-400" />
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Tanggal: </span>
                                                           <span className="font-medium">{formatDate(result.letterInfo.date)}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <IconMapPin className="h-4 w-4 text-gray-400" />
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Lokasi: </span>
                              <span className="font-medium">{result.letterInfo.location}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <IconUsers className="h-4 w-4 text-gray-400" />
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Peserta: </span>
                              <span className="font-medium">{result.letterInfo.participantCount} orang</span>
                            </div>
                          </div>
                          
                          {result.letterInfo.createdBy && (
                            <div className="flex items-center gap-2">
                              <IconUser className="h-4 w-4 text-gray-400" />
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Dibuat oleh: </span>
                                <span className="font-medium">{result.letterInfo.createdBy}</span>
                              </div>
                            </div>
                          )}
                          
                          {result.letterInfo.approvedBy && (
                            <div className="flex items-center gap-2">
                              <IconShieldCheck className="h-4 w-4 text-gray-400" />
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Disetujui oleh: </span>
                                <span className="font-medium">{result.letterInfo.approvedBy}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            <div>Kegiatan: <span className="font-medium text-gray-900 dark:text-white">{result.letterInfo.activity}</span></div>
                            {result.letterInfo.approvedAt && (
                              <div className="mt-1">
                                Disetujui pada: <span className="font-medium text-gray-900 dark:text-white">{formatDateTime(result.letterInfo.approvedAt)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
            )}
          </div>
        </ModalBody>
        
        <ModalFooter>
          <Button variant="light" onPress={handleClose}>
            Tutup
          </Button>
          <Button 
            color="primary" 
            onPress={handleVerify}
            isLoading={loading}
            isDisabled={!letterNumber.trim() || !validationCode.trim()}
          >
            Verifikasi
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}