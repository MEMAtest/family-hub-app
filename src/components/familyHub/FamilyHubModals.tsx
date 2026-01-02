'use client'

import { CalendarModals } from './modals/CalendarModals';
import { BudgetFormModal } from './modals/BudgetFormModal';
import { MealFormModal } from './modals/MealFormModal';
import { ShoppingItemModal } from './modals/ShoppingItemModal';
import { FamilyMemberModal } from './modals/FamilyMemberModal';
import { QuickActivityModal } from './modals/QuickActivityModal';
import { ContractorModals } from './modals/ContractorModals';

export const FamilyHubModals = () => (
  <>
    <CalendarModals />
    <BudgetFormModal />
    <MealFormModal />
    <ShoppingItemModal />
    <FamilyMemberModal />
    <QuickActivityModal />
    <ContractorModals />
  </>
);
