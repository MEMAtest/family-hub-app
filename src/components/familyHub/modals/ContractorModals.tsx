'use client'

import { useContractorContext } from '@/contexts/familyHub/ContractorContext';
import { QuickAppointmentModal } from '@/components/contractors';

export const ContractorModals = () => {
  const { isQuickAppointmentOpen, closeQuickAppointment } = useContractorContext();

  if (!isQuickAppointmentOpen) return null;

  return <QuickAppointmentModal onClose={closeQuickAppointment} />;
};
