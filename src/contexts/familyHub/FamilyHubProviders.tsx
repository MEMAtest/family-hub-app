'use client'

import { PropsWithChildren } from 'react';
import { AppViewProvider } from './AppViewContext';
import { FamilyProvider } from './FamilyContext';
import { CalendarProvider } from './CalendarContext';
import { BudgetProvider } from './BudgetContext';
import { MealsProvider } from './MealsContext';
import { ShoppingProvider } from './ShoppingContext';
import { GoalsProvider } from './GoalsContext';
import { ContractorProvider } from './ContractorContext';

export const FamilyHubProviders = ({ children }: PropsWithChildren) => (
  <FamilyProvider>
    <AppViewProvider>
      <CalendarProvider>
        <ContractorProvider>
          <BudgetProvider>
            <MealsProvider>
              <ShoppingProvider>
                <GoalsProvider>
                  {children}
                </GoalsProvider>
              </ShoppingProvider>
            </MealsProvider>
          </BudgetProvider>
        </ContractorProvider>
      </CalendarProvider>
    </AppViewProvider>
  </FamilyProvider>
);
