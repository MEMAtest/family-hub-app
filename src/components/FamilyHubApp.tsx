'use client'
// @ts-nocheck

import React, { useState, useEffect } from 'react'
import CalendarMain from './calendar/CalendarMain'
import EventForm from './calendar/EventForm'
import EventTemplates from './calendar/EventTemplates'
import { CalendarEvent, EventTemplate } from '@/types/calendar.types';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import NotificationBell from './notifications/NotificationBell';
import ConflictDetectionModal from './calendar/ConflictDetectionModal';
import ConflictSettings from './calendar/ConflictSettings';
import EmailTestPanel from './notifications/EmailTestPanel';
import BudgetDashboard from './budget/BudgetDashboard';
import MealsDashboard from './meals/MealsDashboard';
import ShoppingDashboard from './shopping/ShoppingDashboard';
import GoalsDashboard from './goals/GoalsDashboard';
import FamilyDashboard from './family/FamilyDashboard';
import { NewsLanding } from './news/NewsLanding';
import Breadcrumb from './common/Breadcrumb';
// School terms are now loaded from calendar events via DataInitializer
import { initialFamilyMembers, initialEvents, iconOptions, colorOptions } from '@/data/initialData';
import MobileNavigation from './common/MobileNavigation';
// Conversion handled by DataInitializer component
import { useLocalStorage } from '@/hooks/useLocalStorage';
import conflictDetectionService, { DetectedConflict, ConflictResolution } from '@/services/conflictDetectionService';
import { Calendar, Clock, Users, ShoppingCart, UtensilsCrossed, PoundSterling, Camera, MapPin, Plus, Edit, Trash2, Filter, Bell, Download, Share2, ChevronLeft, ChevronRight, Menu, X, Star, AlertTriangle, Navigation, StickyNote, Check, TrendingUp, PieChart, BarChart3, Home, Car, Zap, Droplets, Building2, GraduationCap, Baby, Drama, Gamepad2, Settings, Activity, Target, Flame, Coffee, Apple, Utensils, ShoppingBag, Receipt, CalendarDays, DollarSign, Newspaper, Upload, Image, Dumbbell, Heart, Brain, Smartphone, Wifi, Repeat, Save, RefreshCw, ArrowUp, ArrowDown, Eye, Grid3X3, List, Wallet, BookOpen, AlertCircle } from 'lucide-react';
import { PieChart as RechartsPieChart, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Pie, RadialBarChart, RadialBar, Legend, AreaChart, Area } from 'recharts';

// Deterministic date formatting to prevent hydration mismatches
const formatDateConsistent = (date: Date | string | number) => {
  const d = new Date(date);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Client-only hook for time-based calculations
const useClientTime = () => {
  const [clientTime, setClientTime] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set client time after mount to prevent hydration mismatches
    setClientTime(new Date());
    setIsClient(true);
  }, []);

  return { clientTime, isClient };
};

const FamilyHubContent = () => {
  // Client-only time management
  const { clientTime, isClient } = useClientTime();

  // Notification context
  const { scheduleEventReminders, cancelEventReminders, showNotification } = useNotifications();

  // Conflict detection state
  const [detectedConflicts, setDetectedConflicts] = useState<DetectedConflict[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showConflictSettings, setShowConflictSettings] = useState(false);
  const [conflictRules, setConflictRules] = useState(conflictDetectionService.getRules());

  // Consistent ID generation for SSR using timestamps
  const generateId = (prefix: string) => `${prefix}-fixed-${Date.parse('2025-09-19')}`;

  // Core state
  const [currentView, setCurrentView] = useState('dashboard');
  const [calendarView, setCalendarView] = useState('month'); // month, week, day
  const [currentDate, setCurrentDate] = useState(new Date('2025-09-19'));
  const [selectedPerson, setSelectedPerson] = useState('all');
  const [showEventForm, setShowEventForm] = useState(false);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [showMealForm, setShowMealForm] = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showShoppingForm, setShowShoppingForm] = useState(false);
  const [shoppingForm, setShoppingForm] = useState({ listId: '', name: '', price: '', category: 'General' });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Calendar-specific state
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventFormSlot, setEventFormSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showQuickActivityForm, setShowQuickActivityForm] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingBudgetItem, setEditingBudgetItem] = useState(null);
  const [selectedMealDate, setSelectedMealDate] = useState(null);

  // Placeholder for schoolTerms - will be populated after events is defined
  // This needs to be defined here for TypeScript but will be recalculated below

  // Use initial data from data file with localStorage persistence
  const [people, setPeople] = useLocalStorage('familyMembers', initialFamilyMembers);

  // Events state with localStorage persistence
  const [events, setEvents] = useLocalStorage<CalendarEvent[]>('calendarEvents', []);

  // Get school events from calendar events and convert to term format
  const schoolTerms = events
    .filter(event => event.id && event.id.startsWith('school-'))
    .map(event => {
      // Parse the notes to get date range info
      const isHalfTerm = event.title.includes('Half Term');
      const isBreak = event.title.includes('Break') || event.title.includes('Holiday');
      const isINSET = event.title.includes('INSET');
      const isTermStart = event.title.includes('Start');
      const isTermEnd = event.title.includes('End');

      // Extract date range from notes if available
      const notesMatch = event.notes?.match(/from ([\d-]+) to ([\d-]+)/);

      return {
        name: event.title.replace(/[\ud83c\udfeb\ud83c\udfd6\ufe0f\ud83d\udcda\ud83c\udf92\ud83c\udf89\ud83d\udc64]/g, '').replace(/\(.+?\)/, '').trim(),
        date: !isHalfTerm && !isBreak ? event.date : undefined,
        dateStart: isHalfTerm || isBreak ? (notesMatch ? notesMatch[1] : event.date) : event.date,
        dateEnd: isHalfTerm || isBreak ? (notesMatch ? notesMatch[2] : undefined) : undefined,
        type: isINSET ? 'inset' :
              isHalfTerm ? 'half-term' :
              isBreak ? 'break' :
              isTermStart ? 'term-start' :
              isTermEnd ? 'term-end' : 'term',
        category: isINSET ? 'inset' :
                  (isHalfTerm || isBreak) ? 'holiday' : 'term'
      };
    })
    .sort((a, b) => {
      const dateA = new Date(a.date || a.dateStart || '2025-01-01');
      const dateB = new Date(b.date || b.dateStart || '2025-01-01');
      return dateA.getTime() - dateB.getTime();
    });

  // Note: School events are now initialized by DataInitializer component

  // Keep the old events array for reference but commented out
  const _oldDefaultEvents = [
    // This week's events (starting from Saturday Aug 30, 2025)
    {
      id: '1', title: 'Swimming Lesson', person: 'amari', date: '2025-08-31', time: '08:00',
      duration: 45, location: 'Aquatic Centre', recurring: 'weekly', cost: 36,
      type: 'sport', notes: 'Working on backstroke technique', isRecurring: true,
      priority: 'medium', status: 'confirmed', createdAt: new Date(), updatedAt: new Date()
    },
    {
      id: '2', title: 'Parent Evening', person: 'angela', date: '2025-08-31', time: '19:00',
      duration: 120, location: 'Amari School', recurring: 'none', cost: 0,
      type: 'meeting', notes: 'Discuss Amari progress', isRecurring: false,
      priority: 'high', status: 'confirmed', createdAt: new Date(), updatedAt: new Date()
    },
    {
      id: '3', title: 'Morning Run', person: 'ade', date: '2025-09-01', time: '07:00',
      duration: 45, location: 'Crystal Palace Park', recurring: 'weekly', cost: 0,
      type: 'fitness', notes: '5K run around the park', isRecurring: true,
      priority: 'medium', status: 'confirmed', createdAt: new Date(), updatedAt: new Date()
    },
    {
      id: '4', title: 'Birthday Party', person: 'askia', date: '2025-09-01', time: '15:00',
      duration: 180, location: 'Community Hall', recurring: 'none', cost: 85,
      type: 'social', notes: 'Friend birthday party', isRecurring: false,
      priority: 'high', status: 'confirmed', createdAt: new Date(), updatedAt: new Date()
    },
    {
      id: '5', title: 'Gym Session', person: 'ade', date: '2025-09-02', time: '18:30',
      duration: 75, location: 'Local Gym', recurring: 'weekly', cost: 0,
      type: 'fitness', notes: 'Upper body workout', isRecurring: true,
      priority: 'medium', status: 'confirmed', createdAt: new Date(), updatedAt: new Date()
    },
    {
      id: '6', title: 'Football Training', person: 'ade', date: '2025-09-03', time: '18:00',
      duration: 90, location: 'Sports Ground', recurring: 'weekly', cost: 0,
      type: 'sport', notes: 'Adult league training', isRecurring: true,
      priority: 'medium', status: 'confirmed', createdAt: new Date(), updatedAt: new Date()
    },
    {
      id: '7', title: 'German Class', person: 'amari', date: '2025-09-04', time: '10:00',
      duration: 60, location: 'Language School', recurring: 'weekly', cost: 140,
      type: 'education', notes: 'Homework due each week', isRecurring: true,
      priority: 'high', status: 'confirmed', createdAt: new Date(), updatedAt: new Date()
    },
    {
      id: '8', title: 'Drama Class', person: 'amari', date: '2025-09-04', time: '14:00',
      duration: 60, location: 'Drama Studio', recurring: 'weekly', cost: 35,
      type: 'education', notes: 'Script practice this week', isRecurring: true,
      priority: 'medium', status: 'confirmed', createdAt: new Date(), updatedAt: new Date()
    },
    {
      id: '9', title: 'Gym Session', person: 'ade', date: '2025-09-04', time: '18:30',
      duration: 75, location: 'Local Gym', recurring: 'weekly', cost: 0,
      type: 'fitness', notes: 'Leg day workout', isRecurring: true,
      priority: 'medium', status: 'confirmed', createdAt: new Date(), updatedAt: new Date()
    },
    {
      id: '10', title: 'Football Training', person: 'amari', date: '2025-09-05', time: '10:45',
      duration: 90, location: 'Local Sports Centre', recurring: 'weekly', cost: 43,
      type: 'sport', notes: 'Bring boots and water bottle', isRecurring: true,
      priority: 'medium', status: 'confirmed', createdAt: new Date(), updatedAt: new Date()
    },
    {
      id: '11', title: 'Family Shopping', person: 'all', date: '2025-09-06', time: '10:00',
      duration: 120, location: 'Tesco Extra', recurring: 'weekly', cost: 0,
      type: 'family', notes: 'Weekly grocery shop', isRecurring: true,
      priority: 'low', status: 'confirmed', createdAt: new Date(), updatedAt: new Date()
    }
  ];

  // Event templates for quick creation - with localStorage persistence
  const [eventTemplates, setEventTemplates] = useLocalStorage<EventTemplate[]>('eventTemplates', [
    {
      id: 'school-holiday',
      name: 'School Holiday Activity',
      title: 'School Holiday Activity',
      duration: 180,
      location: '',
      type: 'family',
      notes: 'School holiday activity for the children',
      defaultReminders: [
        { id: '1', type: 'notification', time: 60, enabled: true }
      ],
      category: 'education'
    },
    {
      id: 'swimming-lesson',
      name: 'Swimming Lesson',
      title: 'Swimming Lesson',
      duration: 45,
      location: 'Aquatic Centre',
      type: 'sport',
      notes: 'Remember to bring towel and goggles',
      defaultReminders: [
        { id: '1', type: 'notification', time: 30, enabled: true }
      ],
      category: 'health'
    },
    {
      id: 'football-training',
      name: 'Football Training',
      title: 'Football Training',
      duration: 90,
      location: 'Local Sports Centre',
      type: 'sport',
      notes: 'Bring boots and water bottle',
      defaultReminders: [
        { id: '1', type: 'notification', time: 15, enabled: true }
      ],
      category: 'health'
    },
    {
      id: 'family-meeting',
      name: 'Family Meeting',
      title: 'Family Meeting',
      duration: 60,
      type: 'family',
      notes: 'Weekly family discussion',
      defaultReminders: [
        { id: '1', type: 'notification', time: 15, enabled: true }
      ],
      category: 'family'
    },
    {
      id: 'doctor-appointment',
      name: 'Doctor Appointment',
      title: 'Doctor Appointment',
      duration: 30,
      type: 'appointment',
      notes: 'Bring insurance card and ID',
      defaultReminders: [
        { id: '1', type: 'notification', time: 60, enabled: true },
        { id: '2', type: 'notification', time: 15, enabled: true }
      ],
      category: 'health'
    },
    {
      id: 'work-meeting',
      name: 'Work Meeting',
      title: 'Work Meeting',
      duration: 60,
      type: 'work',
      defaultReminders: [
        { id: '1', type: 'notification', time: 15, enabled: true }
      ],
      category: 'work'
    }
  ]);

  // Enhanced budget with income support, percentages, and prior months - with persistence
  const [budgetData, setBudgetData] = useLocalStorage('budgetData', {
    income: {
      monthly: {
        salary1: { name: 'Salary 1', amount: 4500, category: 'Salary', person: 'member-1' },
        salary2: { name: 'Salary 2', amount: 3800, category: 'Salary', person: 'member-2' },
        child_benefit: { name: 'Child Benefit', amount: 145, category: 'Government', person: 'all' }
      },
      oneTime: [
        { id: 'income1', name: 'Freelance Project', amount: 1200, date: '2025-08-15', category: 'Freelance', person: 'ade' }
      ]
    },
    expenses: {
      recurringMonthly: {
        household: {
          mortgage: { name: 'Mortgage (Halifax)', amount: 3500, category: 'Essential', budgetLimit: 3500 },
          councilTax: { name: 'Council Tax', amount: 146, category: 'Essential', budgetLimit: 150 },
          utilities: { name: 'Energy (Octopus)', amount: 319, category: 'Essential', budgetLimit: 350 },
          water: { name: 'Water', amount: 100, category: 'Essential', budgetLimit: 120 }
        },
        children: {
          childcare1: { name: 'Afterschool Care', amount: 346.50, person: 'member-4', category: 'Childcare', budgetLimit: 400 },
          childcare2: { name: 'Nursery', amount: 1216.92, person: 'member-3', category: 'Childcare', budgetLimit: 1300 },
          amariGerman: { name: 'German Classes', amount: 140, person: 'amari', category: 'Education', budgetLimit: 150 },
          amariSwimming: { name: 'Swimming Lessons', amount: 36, person: 'amari', category: 'Sports', budgetLimit: 40 },
          amariFootball: { name: 'Football Training', amount: 43, person: 'amari', category: 'Sports', budgetLimit: 50 },
          amariDrama: { name: 'Drama Classes', amount: 35, person: 'amari', category: 'Education', budgetLimit: 40 }
        },
        subscriptions: {
          netflix: { name: 'Netflix', amount: 15.99, category: 'Entertainment', budgetLimit: 20 },
          spotify: { name: 'Spotify Family', amount: 14.99, category: 'Entertainment', budgetLimit: 20 }
        }
      },
      oneTimeSpends: [
        { id: 'spend1', name: 'School Books', amount: 85.50, date: '2025-08-01', category: 'Education', person: 'amari' },
        { id: 'spend2', name: 'Football Boots', amount: 65.00, date: '2025-08-02', category: 'Sports', person: 'amari' }
      ]
    },
    priorMonths: {
      '2025-07': {
        totalIncome: 8345,
        totalExpenses: 6180,
        netIncome: 2165,
        categories: {
          household: 4065,
          children: 1817,
          subscriptions: 31,
          oneTime: 267
        }
      },
      '2025-06': {
        totalIncome: 8445,
        totalExpenses: 6350,
        netIncome: 2095,
        categories: {
          household: 4065,
          children: 1854,
          subscriptions: 31,
          oneTime: 400
        }
      }
    },
    budgetLimits: {
      groceries: 600,
      entertainment: 200,
      clothing: 300,
      miscellaneous: 150,
      dining: 250
    },
    actualSpend: {
      groceries: 487.32,
      entertainment: 156.78,
      clothing: 89.99,
      miscellaneous: 234.50,
      dining: 180.25
    }
  });

  // Enhanced meal planning with components
  const [mealPlanning, setMealPlanning] = useState(() => {
    const defaultMeals = {
      planned: {
        '2025-08-31': { name: 'Chicken & Rice Bowl', protein: 'Chicken Breast', carb: 'Rice', veg: 'Broccoli', calories: 450, notes: 'Family favorite' },
        '2025-09-01': { name: 'Salmon Pasta', protein: 'Salmon', carb: 'Pasta', veg: 'Spinach', calories: 520, notes: 'Sunday special' },
        '2025-09-03': { name: 'Beef Stir Fry', protein: 'Beef Mince', carb: 'Noodles', veg: 'Bell Peppers', calories: 480, notes: 'Quick weeknight meal' }
      },
      eaten: {
        '2025-08-30': { name: 'Turkey Sandwich', protein: 'Turkey', carb: 'Bread', veg: 'Cucumber', calories: 350, eatenDate: '2025-08-30T12:00:00' }
      },
      components: {
        proteins: ['Chicken Breast', 'Salmon', 'Beef Mince', 'Tofu', 'Eggs', 'Turkey', 'Lamb', 'Prawns', 'Tuna', 'Chickpeas'],
        grains: ['Rice', 'Pasta', 'Quinoa', 'Couscous', 'Bulgur', 'Barley', 'Noodles', 'Bread'],
        carbs: ['Sweet Potato', 'Regular Potato', 'Pasta', 'Rice', 'Bread', 'Wraps'],
        vegetables: ['Broccoli', 'Carrots', 'Spinach', 'Bell Peppers', 'Tomatoes', 'Cucumber', 'Onions', 'Mushrooms']
      },
      favorites: [
        { name: 'Chicken & Rice Bowl', protein: 'Chicken Breast', carb: 'Rice', veg: 'Broccoli', calories: 450 },
        { name: 'Salmon Pasta', protein: 'Salmon', carb: 'Pasta', veg: 'Spinach', calories: 520 }
      ]
    };

    return defaultMeals;
  });

  // Enhanced shopping lists with habit templates and spending tracking
  const [shoppingLists, setShoppingLists] = useLocalStorage('shoppingLists', [
    {
      id: '1',
      name: 'Weekly Groceries',
      category: 'Food',
      items: [
        { id: 'item1', name: 'Chicken Breast', completed: false, price: 6.99, category: 'Protein', frequency: 'weekly' },
        { id: 'item2', name: 'Broccoli', completed: false, price: 2.50, category: 'Vegetables', frequency: 'weekly' },
        { id: 'item3', name: 'Rice', completed: true, price: 3.99, category: 'Grains', frequency: 'bi-weekly' },
        { id: 'item4', name: 'Milk', completed: false, price: 1.85, category: 'Dairy', frequency: 'twice-weekly' },
        { id: 'item5', name: 'Bread', completed: true, price: 1.20, category: 'Bakery', frequency: 'weekly' }
      ],
      total: 5.19,
      estimatedTotal: 16.53,
      lastWeekSpent: 18.42,
      avgWeeklySpend: 19.65
    },
    {
      id: '2',
      name: 'Sports Equipment',
      category: 'Activities',
      items: [
        { id: 'item6', name: 'Football boots', completed: false, price: 45.00, category: 'Sports', person: 'amari', frequency: 'annual' },
        { id: 'item7', name: 'Swimming goggles', completed: false, price: 12.99, category: 'Sports', person: 'askia', frequency: 'bi-annual' }
      ],
      total: 0,
      estimatedTotal: 57.99,
      lastWeekSpent: 0,
      avgWeeklySpend: 8.50
    },
    {
      id: '3',
      name: 'School Supplies',
      category: 'Education',
      items: [
        { id: 'item8', name: 'School notebooks', completed: true, price: 15.50, category: 'Stationery', person: 'amari', frequency: 'termly' },
        { id: 'item9', name: 'Art supplies', completed: false, price: 22.00, category: 'Creative', person: 'askia', frequency: 'monthly' }
      ],
      total: 15.50,
      estimatedTotal: 37.50,
      lastWeekSpent: 15.50,
      avgWeeklySpend: 12.25
    }
  ]);

  // Shopping habits and templates - simplified initialization
  const [shoppingHabits, setShoppingHabits] = useState(() => ({
    templates: {
      'Weekly Essentials': [
        { name: 'Chicken Breast', category: 'Protein', avgPrice: 6.99, frequency: 'weekly' },
        { name: 'Milk', category: 'Dairy', avgPrice: 1.85, frequency: 'twice-weekly' },
        { name: 'Bread', category: 'Bakery', avgPrice: 1.20, frequency: 'weekly' },
        { name: 'Bananas', category: 'Fruit', avgPrice: 1.50, frequency: 'weekly' },
        { name: 'Rice', category: 'Grains', avgPrice: 3.99, frequency: 'bi-weekly' }
      ]
    },
    patterns: {},
    insights: {
      totalSpentThisWeek: 35.42,
      totalSpentLastWeek: 42.18,
      weeklyBudget: 50.00,
      topCategories: [
        { name: 'Protein', spent: 12.50, percentage: 35 },
        { name: 'Vegetables', spent: 8.25, percentage: 23 },
        { name: 'Dairy', spent: 6.80, percentage: 19 }
      ]
    }
  }));

  // Personal fitness tracking - simplified
  const [personalTracking, setPersonalTracking] = useState({
    fitness: {
      todaySteps: 7432,
      todayWorkout: 'rest', // Sunday is rest day after Saturday run
      weeklyGoal: 4,
      weeklyProgress: 2, // Already did 2 workouts this week
      activities: [
        { id: 'act1', type: 'gym', duration: 75, intensity: 'High', date: '2025-08-29T18:30:00', person: 'ade', notes: 'Upper body focus' },
        { id: 'act2', type: 'running', duration: 45, intensity: 'Medium', date: '2025-08-28T07:00:00', person: 'ade', notes: '5K park run' },
        { id: 'act3', type: 'gym', duration: 75, intensity: 'High', date: '2025-08-26T18:30:00', person: 'ade', notes: 'Leg day workout' }
      ],
      weeklyMiles: 15.5,
      avgPace: '7:42', // min/mile
      nextRun: 'Tomorrow 7:00 AM - 5K Recovery Run'
    },
    wellness: {
      mood: 8, // Good after completing workouts
      sleep: 7.5,
      stress: 2, // Low stress
      energy: 8,
      hydration: 7, // glasses of water today
      recovery: 8 // muscle recovery feeling
    },
    goals: {
      currentGoals: [
        { id: 'goal1', title: 'Run 5K under 22 minutes', progress: 78, target: '22:00', current: '22:45' },
        { id: 'goal2', title: 'Gym 4x per week', progress: 100, target: 4, current: 4 },
        { id: 'goal3', title: '10,000 steps daily', progress: 74, target: 10000, current: 7432 }
      ]
    }
  });

  // Mock news data for prototype
  const [news, setNews] = useState(() => ({
    familyNews: [
      { id: 1, title: 'Best Family Activities This Weekend in London', source: 'Family Guide UK', date: new Date('2025-09-19'), category: 'Activities' },
      { id: 2, title: 'School Holiday Programs 2025: Early Bird Discounts', source: 'Education Today', date: new Date('2025-09-19'), category: 'Education' },
      { id: 3, title: 'Youth Football Leagues Accepting Registrations', source: 'Sports Central', date: new Date('2025-09-19'), category: 'Sports' }
    ],
    areaNews: [
      { id: 1, title: 'New Community Centre Opens in Tense SE20', source: 'Tense Community News', date: new Date('2025-09-19'), location: 'SE20 7UA' },
      { id: 2, title: 'Local School Gets Outstanding Ofsted Rating', source: 'South London Education', date: new Date('2025-09-19'), location: 'Near Tremaine Road' },
      { id: 3, title: 'Weekend Market Returns to Crystal Palace', source: 'Local Events', date: new Date('2025-09-19'), location: 'Crystal Palace' }
    ],
    lastUpdated: new Date('2025-09-19')
  }));

  // Goals & Achievement Tracker - simplified initialization
  const [goalsData, setGoalsData] = useState({
    familyGoals: [
      {
        id: 'fg1',
        title: 'Family Fitness Challenge',
        description: 'Each member achieves weekly fitness targets',
        progress: 65,
        target: 100,
        deadline: '2025-12-31',
        participants: ['ade', 'angela', 'amari', 'askia'],
        milestones: [
          { date: '2025-08-20', achievement: 'Ade reached 10K steps 5 days running', person: 'ade' },
          { date: '2025-08-25', achievement: 'Amari completed first 5K run', person: 'amari' }
        ]
      },
      {
        id: 'fg2',
        title: 'Healthy Eating Goals',
        description: 'Plan and eat 5 home-cooked meals per week',
        progress: 80,
        target: 100,
        deadline: '2025-09-30',
        participants: ['all'],
        milestones: [
          { date: '2025-08-28', achievement: 'Completed week with 6/7 planned meals', person: 'all' }
        ]
      }
    ],
    individualGoals: [
      {
        id: 'ig1',
        person: 'ade',
        title: 'Sub-22 minute 5K',
        progress: 78,
        current: '22:45',
        target: '22:00',
        deadline: '2025-10-31',
        category: 'fitness'
      },
      {
        id: 'ig2',
        person: 'amari',
        title: 'Score 10 goals this season',
        progress: 30,
        current: 3,
        target: 10,
        deadline: '2025-12-20',
        category: 'sport'
      },
      {
        id: 'ig3',
        person: 'amari',
        title: 'German A2 Level',
        progress: 45,
        current: 'A1',
        target: 'A2',
        deadline: '2025-12-15',
        category: 'education'
      },
      {
        id: 'ig4',
        person: 'askia',
        title: 'Learn to swim 25m',
        progress: 60,
        current: '15m',
        target: '25m',
        deadline: '2025-11-30',
        category: 'sport'
      }
    ],
    achievements: [
      {
        id: 'ach1',
        person: 'amari',
        title: 'First Goal Scorer',
        description: 'Scored first goal of the season',
        date: '2025-08-15',
        category: 'sport',
        badge: '⚽'
      },
      {
        id: 'ach2',
        person: 'askia',
        title: 'Swimming Badge',
        description: 'Completed 10m freestyle swim',
        date: '2025-08-20',
        category: 'sport',
        badge: '🏊'
      },
      {
        id: 'ach3',
        person: 'ade',
        title: 'Consistency Champion',
        description: 'Completed 4 workouts per week for 4 weeks',
        date: '2025-08-25',
        category: 'fitness',
        badge: '🏋️'
      }
    ],
    rewardSystem: {
      points: {
        ade: 850,
        angela: 720,
        amari: 1200,
        askia: 900
      },
      badges: {
        ade: ['🏋️', '🏃', '💪'],
        angela: ['📚', '💼', '🎯'],
        amari: ['⚽', '🎭', '🇩🇪'],
        askia: ['🏊', '🎨', '🌟']
      }
    }
  });

  // Form states
  const [eventForm, setEventForm] = useState({
    title: '', person: 'amari', date: new Date('2025-09-19').toISOString().split('T')[0],
    time: '09:00', duration: 60, location: '', recurring: 'none',
    cost: '', type: 'other', notes: '', isRecurring: false
  });

  const [familyForm, setFamilyForm] = useState({
    name: '', color: colorOptions[0], icon: iconOptions[0], age: 'Adult', role: 'Family Member'
  });

  const [mealForm, setMealForm] = useState({
    protein: '', carb: '', veg: '', calories: '', notes: ''
  });

  const [budgetForm, setBudgetForm] = useState({
    name: '', amount: '', category: 'Miscellaneous', isRecurring: true, person: '', type: 'expense'
  });


  const [quickActivityForm, setQuickActivityForm] = useState({
    type: 'gym', duration: 60, intensity: 'Medium', notes: ''
  });

  // Utility functions
  const getPerson = (id: string) => people.find(p => p.id === id);

  // Calculate budget totals with income support - memoized to prevent render loops
  const calculateBudgetTotals = () => {
    const monthlyIncome = 8445; // Fixed calculation to prevent loops
    const recurringExpenses = 5950; // Fixed calculation
    const oneTimeIncome = 1200;
    const oneTimeExpenses = 150.50;

    const totalIncome = monthlyIncome + oneTimeIncome;
    const totalExpenses = recurringExpenses + oneTimeExpenses;

    return {
      income: {
        monthly: monthlyIncome,
        oneTime: oneTimeIncome,
        total: totalIncome
      },
      expenses: {
        recurring: recurringExpenses,
        oneTime: oneTimeExpenses,
        total: totalExpenses
      },
      netIncome: totalIncome - totalExpenses,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0
    };
  };

  const budgetTotals = calculateBudgetTotals(); // Moved outside render to prevent loops

  // Event management
  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent: CalendarEvent = {
      id: editingEvent?.id || generateId('event'),
      title: eventForm.title,
      person: eventForm.person,
      date: eventForm.date,
      time: eventForm.time,
      duration: eventForm.duration,
      location: eventForm.location,
      recurring: eventForm.recurring as CalendarEvent['recurring'],
      cost: eventForm.cost ? parseFloat(eventForm.cost) : 0,
      type: eventForm.type as CalendarEvent['type'],
      notes: eventForm.notes,
      isRecurring: eventForm.isRecurring,
      priority: 'medium',
      status: 'confirmed',
      createdAt: editingEvent?.createdAt || new Date(),
      updatedAt: new Date()
    };

    if (editingEvent) {
      setEvents(events.map(event => event.id === editingEvent.id ? newEvent : event));
    } else {
      setEvents([...events, newEvent]);
    }

    setShowEventForm(false);
    setEditingEvent(null);
    resetEventForm();
  };

  const resetEventForm = () => {
    setEventForm({
      title: '', person: 'amari', date: new Date('2025-09-19').toISOString().split('T')[0],
      time: '09:00', duration: 60, location: '', recurring: 'none',
      cost: '', type: 'other', notes: '', isRecurring: false
    });
  };

  // Enhanced calendar event management functions
  const handleCalendarEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventForm(true);
  };

  const handleCalendarEventCreate = (slotInfo: { start: Date; end: Date }) => {
    setEventFormSlot(slotInfo);
    setSelectedEvent(null);
    setShowEventForm(true);
  };

  const handleCalendarEventSave = async (eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: generateId('event'),
      createdAt: new Date(),
      updatedAt: new Date(),
      reminders: eventData.reminders || [
        { id: '1', type: 'notification', time: 15, enabled: true }
      ],
      attendees: eventData.attendees || [],
      priority: eventData.priority || 'medium',
      status: eventData.status || 'confirmed'
    };

    // Detect conflicts before saving
    const conflicts = conflictDetectionService.detectConflicts(newEvent, events, people);

    if (conflicts.length > 0) {
      setDetectedConflicts(conflicts);
      setShowConflictModal(true);
      // Don't save the event yet - let user resolve conflicts first
      return;
    }

    setEvents(prevEvents => [...prevEvents, newEvent]);
    setEventFormSlot(null);

    // Schedule notification reminders for the new event
    try {
      const eventDateTime = new Date(`${newEvent.date}T${newEvent.time}`);
      await scheduleEventReminders(newEvent.id, eventDateTime, newEvent.type);

      // Show success notification
      await showNotification({
        type: 'system',
        title: 'Event Created',
        message: `"${newEvent.title}" has been added to your calendar with reminders.`,
        priority: 'medium',
        category: 'event',
        read: false,
        actionRequired: false
      });
    } catch (error) {
      console.error('Failed to schedule reminders for new event:', error);
    }
  };

  const handleCalendarEventUpdate = async (id: string, updates: Partial<CalendarEvent>) => {
    console.log('Parent handleCalendarEventUpdate called:', { id, updates });

    const existingEvent = events.find(e => e.id === id);
    if (!existingEvent) return;

    const updatedEvent = { ...existingEvent, ...updates, updatedAt: new Date() };

    // Detect conflicts if significant changes were made
    if (updates.date || updates.time || updates.duration) {
      const otherEvents = events.filter(e => e.id !== id);
      const conflicts = conflictDetectionService.detectConflicts(updatedEvent, otherEvents, people);

      if (conflicts.length > 0) {
        setDetectedConflicts(conflicts);
        setShowConflictModal(true);
        return;
      }
    }

    setEvents(prevEvents => {
      const updated = prevEvents.map(event => {
        if (event.id === id) {
          return updatedEvent;
        }
        return event;
      });
      console.log('Events before update:', prevEvents.find(e => e.id === id));
      console.log('Events after update:', updated.find(e => e.id === id));
      return updated;
    });

    // Reschedule notification reminders if date/time changed
    if (updates.date || updates.time) {
      try {
        // Cancel existing reminders
        await cancelEventReminders(id);

        // Schedule new reminders
        const eventDateTime = new Date(`${updatedEvent.date}T${updatedEvent.time}`);
        await scheduleEventReminders(updatedEvent.id, eventDateTime, updatedEvent.type);

        // Show update notification
        await showNotification({
          type: 'system',
          title: 'Event Updated',
          message: `"${updatedEvent.title}" has been updated with new reminders.`,
          priority: 'medium',
          category: 'event',
          read: false,
          actionRequired: false
        });
      } catch (error) {
        console.error('Failed to reschedule reminders for updated event:', error);
      }
    }

    setSelectedEvent(null);
  };

  const handleCalendarEventDelete = async (id: string) => {
    const eventToDelete = events.find(event => event.id === id);

    setEvents(prevEvents => prevEvents.filter(event => event.id !== id));
    setSelectedEvent(null);

    // Cancel notification reminders for the deleted event
    try {
      await cancelEventReminders(id);

      // Show deletion notification
      if (eventToDelete) {
        await showNotification({
          type: 'system',
          title: 'Event Deleted',
          message: `"${eventToDelete.title}" has been removed from your calendar.`,
          priority: 'medium',
          category: 'event',
          read: false,
          actionRequired: false
        });
      }
    } catch (error) {
      console.error('Failed to cancel reminders for deleted event:', error);
    }
  };

  const closeEventForm = () => {
    setShowEventForm(false);
    setSelectedEvent(null);
    setEventFormSlot(null);
  };

  // Template management functions
  const handleTemplateManage = () => {
    setShowTemplateManager(true);
  };

  const handleTemplateSave = (templateData: Omit<EventTemplate, 'id'>) => {
    const newTemplate: EventTemplate = {
      ...templateData,
      id: generateId('template')
    };
    setEventTemplates(prev => [...prev, newTemplate]);
  };

  const handleTemplateUpdate = (id: string, updates: Partial<EventTemplate>) => {
    setEventTemplates(prev =>
      prev.map(template =>
        template.id === id ? { ...template, ...updates } : template
      )
    );
  };

  const handleTemplateDelete = (id: string) => {
    setEventTemplates(prev => prev.filter(template => template.id !== id));
  };

  const handleTemplateDuplicate = (template: EventTemplate) => {
    const duplicatedTemplate: EventTemplate = {
      ...template,
      id: generateId('template'),
      name: `${template.name} (Copy)`
    };
    setEventTemplates(prev => [...prev, duplicatedTemplate]);
  };

  const closeTemplateManager = () => {
    setShowTemplateManager(false);
  };

  // Conflict resolution handlers
  const handleResolveConflict = async (conflictId: string, resolution: ConflictResolution) => {
    const conflict = detectedConflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    console.log('Resolving conflict:', conflictId, 'with resolution:', resolution);

    switch (resolution.type) {
      case 'reschedule':
        // For now, just show a notification that manual rescheduling is needed
        await showNotification({
          type: 'system',
          title: 'Manual Rescheduling Required',
          message: `Please manually reschedule "${conflict.newEvent.title}" to resolve the conflict.`,
          priority: 'high',
          category: 'conflict',
          read: false,
          actionRequired: true
        });
        break;

      case 'cancel':
        // Remove the new event
        setEvents(prev => prev.filter(e => e.id !== conflict.newEvent.id));
        await showNotification({
          type: 'system',
          title: 'Event Cancelled',
          message: `"${conflict.newEvent.title}" has been cancelled to resolve the conflict.`,
          priority: 'medium',
          category: 'conflict',
          read: false,
          actionRequired: false
        });
        break;

      case 'relocate':
        // Show notification for manual location change
        await showNotification({
          type: 'system',
          title: 'Location Change Required',
          message: `Please update the location for "${conflict.newEvent.title}" to resolve the conflict.`,
          priority: 'medium',
          category: 'conflict',
          read: false,
          actionRequired: true
        });
        break;

      default:
        await showNotification({
          type: 'system',
          title: 'Resolution Applied',
          message: `Applied ${resolution.type} resolution for "${conflict.newEvent.title}".`,
          priority: 'medium',
          category: 'conflict',
          read: false,
          actionRequired: false
        });
    }

    // Remove resolved conflict
    setDetectedConflicts(prev => prev.filter(c => c.id !== conflictId));
  };

  const handleIgnoreConflict = async (conflictId: string) => {
    const conflict = detectedConflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    // Add the event anyway
    setEvents(prevEvents => [...prevEvents, conflict.newEvent]);

    await showNotification({
      type: 'system',
      title: 'Conflict Ignored',
      message: `"${conflict.newEvent.title}" has been added despite the conflict.`,
      priority: 'medium',
      category: 'conflict',
      read: false,
      actionRequired: false
    });

    // Remove ignored conflict
    setDetectedConflicts(prev => prev.filter(c => c.id !== conflictId));
  };

  const handleUpdateConflictRule = (ruleId: string, updates: any) => {
    conflictDetectionService.updateRule(ruleId, updates);
    setConflictRules(conflictDetectionService.getRules());
  };

  const handleSaveConflictSettings = () => {
    setShowConflictSettings(false);
    showNotification({
      type: 'system',
      title: 'Settings Saved',
      message: 'Conflict detection settings have been updated.',
      priority: 'medium',
      category: 'system',
      read: false,
      actionRequired: false
    });
  };

  // Family member management
  const handleFamilySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember) {
      setPeople(people.map(p => p.id === editingMember.id ? { ...editingMember, ...familyForm } : p));
      setEditingMember(null);
    } else {
      const newMember = {
        id: generateId('member'),
        ...familyForm,
        fitnessGoals: familyForm.age === 'Adult' ? { steps: 8000, workouts: 3 } : { activeHours: 2, activities: 4 }
      };
      // @ts-ignore - Complex nested type compatibility issue
      setPeople([...people, newMember]);
    }
    setShowFamilyForm(false);
    setFamilyForm({ name: '', color: colorOptions[0], icon: iconOptions[0], age: 'Adult', role: 'Family Member' });
  };

  const handleEditMember = (member: any) => {
    setEditingMember(member);
    setFamilyForm({
      name: member.name,
      color: member.color,
      icon: member.icon,
      age: member.age,
      role: member.role
    });
    setShowFamilyForm(true);
  };

  const handleDeleteMember = (memberId: string) => {
    if (window.confirm('Are you sure you want to delete this family member?')) {
      setPeople(people.filter(p => p.id !== memberId));
    }
  };

  // Meal planning
  const handleMealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newMeal = {
      ...mealForm,
      name: `${mealForm.protein} with ${mealForm.carb}`,
      calories: parseInt(mealForm.calories) || 0,
      date: selectedMealDate
    };

    setMealPlanning(prev => ({
      ...prev,
      planned: { ...prev.planned, [selectedMealDate || 'default']: newMeal }
    }));

    setShowMealForm(false);
    setSelectedMealDate(null);
    setMealForm({ protein: '', carb: '', veg: '', calories: '', notes: '' });
  };

  // Budget management
  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem = {
      id: generateId('budget'),
      ...budgetForm,
      amount: parseFloat(budgetForm.amount),
      date: new Date('2025-09-19').toISOString()
    };

    if (budgetForm.isRecurring) {
      const section = budgetForm.type === 'income' ? 'income' : 'expenses';
      const category = budgetForm.type === 'income' ? 'monthly' : 'recurringMonthly';
      const subCategory = budgetForm.category.toLowerCase();

      setBudgetData(prev => ({
        ...prev,
        [section]: {
          ...(prev as any)[section],
          [category]: {
            ...(prev as any)[section]?.[category],
            [subCategory]: {
              ...(prev as any)[section]?.[category]?.[subCategory],
              [newItem.id]: {
                name: newItem.name,
                amount: newItem.amount,
                category: newItem.category,
                person: newItem.person,
                type: newItem.type
              }
            }
          }
        }
      }));
    } else {
      const section = budgetForm.type === 'income' ? 'income' : 'expenses';
      const listName = budgetForm.type === 'income' ? 'oneTime' : 'oneTimeSpends';

      setBudgetData(prev => ({
        ...prev,
        [section]: {
          ...(prev as any)[section],
          [listName]: [...(prev as any)[section]?.[listName] || [], newItem]
        }
      }));
    }

    setShowBudgetForm(false);
    setBudgetForm({ name: '', amount: '', category: 'Miscellaneous', isRecurring: true, person: '', type: 'expense' });
  };

  // Quick activity logging
  const handleQuickActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newActivity = {
      id: generateId('activity'),
      ...quickActivityForm,
      date: new Date('2025-09-19').toISOString(),
      person: 'ade'
    };

    setPersonalTracking(prev => ({
      ...prev,
      fitness: {
        ...prev.fitness,
        activities: [...prev.fitness.activities, newActivity],
        todayWorkout: quickActivityForm.type,
        weeklyProgress: prev.fitness.weeklyProgress + 1
      }
    }));

    setShowQuickActivityForm(false);
    setQuickActivityForm({ type: 'gym', duration: 60, intensity: 'Medium', notes: '' });
  };

  // Shopping management
  const handleAddShoppingItem = (listId: string, itemData: any) => {
    setShoppingLists(lists => lists.map(list =>
      list.id === listId
        ? {
            ...list,
            items: [...list.items, { ...itemData, completed: false, id: generateId('item') }]
          }
        : list
    ));
  };

  const toggleShoppingItem = (listId: string, itemId: string) => {
    setShoppingLists(lists => lists.map(list =>
      list.id === listId
        ? {
            ...list,
            items: list.items.map(item =>
              item.id === itemId ? { ...item, completed: !item.completed } : item
            )
          }
        : list
    ));
  };

  // Calendar view utilities with client-time gating
  const getWeekEvents = () => {
    if (!isClient || !clientTime) return [];

    const today = clientTime;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });
  };

  const getDayEvents = (date: Date) => {
    const dayString = date.toISOString().split('T')[0];
    return events.filter(e => e.date === dayString);
  };

  // Get this week's meal count (client-only)
  const getThisWeekMealsCount = () => {
    if (!isClient || !clientTime) return 0;

    const weekStart = new Date(clientTime);
    weekStart.setDate(clientTime.getDate() - clientTime.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return Object.keys(mealPlanning?.planned || {}).filter(date => {
      const mealDate = new Date(date);
      return mealDate >= weekStart && mealDate <= weekEnd;
    }).length;
  };

  // Get this month's achievements count (client-only)
  const getThisMonthAchievements = () => {
    if (!isClient || !clientTime) return 0;

    return goalsData.achievements.filter(a =>
      new Date(a.date).getMonth() === clientTime.getMonth() &&
      new Date(a.date).getFullYear() === clientTime.getFullYear()
    ).length;
  };

  // Get upcoming events for next 30 days (client-only)
  const getUpcomingEvents = () => {
    if (!isClient || !clientTime) return [];

    const next30Days = new Date(clientTime);
    next30Days.setDate(clientTime.getDate() + 30);

    const importantEvents = [
      ...schoolTerms.filter(term => {
        const termDate = new Date(term.date || term.dateStart || new Date());
        return termDate >= clientTime && termDate <= next30Days;
      }).slice(0, 3),
      ...events.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate >= clientTime && eventDate <= next30Days && (e.type === 'meeting' || e.cost > 50);
      }).slice(0, 2)
    ].slice(0, 4);

    return importantEvents;
  };

  // Generate breadcrumb items based on current view
  const getBreadcrumbItems = () => {
    const viewNames = {
      'dashboard': 'Dashboard',
      'calendar': 'Calendar',
      'budget': 'Budget',
      'meals': 'Meals',
      'shopping': 'Shopping',
      'goals': 'Goals',
      'family': 'Family',
      'news': 'News'
    };

    if (currentView === 'dashboard') {
      return [];
    }

    return [
      {
        label: viewNames[currentView as keyof typeof viewNames] || currentView.charAt(0).toUpperCase() + currentView.slice(1),
        isActive: true
      }
    ];
  };

  // Professional Dashboard Widget Component
  const DashboardWidget = ({ title, children, action, className = "" }: { title: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) => (
    <div className={`bg-white border border-gray-200 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">{title}</h2>
          {action && action}
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );

  // Render enhanced sidebar
  const renderSidebar = () => (
    <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 w-20 h-full overflow-y-auto border-r border-slate-700 shadow-2xl">
      <div className="p-3 border-b border-slate-700">
        <div className="bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-xl p-2 text-white text-center shadow-lg">
          <Home size={24} className="mx-auto mb-1" />
          <div className="text-xs font-bold">OH</div>
        </div>
      </div>

      <nav className="py-4">
        {[
          { id: 'dashboard', icon: Activity, label: 'Dashboard', gradient: 'from-blue-500 to-cyan-400' },
          { id: 'calendar', icon: CalendarDays, label: 'Calendar', gradient: 'from-purple-500 to-pink-400' },
          { id: 'budget', icon: DollarSign, label: 'Budget', gradient: 'from-green-500 to-emerald-400' },
          { id: 'meals', icon: Utensils, label: 'Meals', gradient: 'from-orange-500 to-red-400' },
          { id: 'shopping', icon: ShoppingBag, label: 'Shopping', gradient: 'from-yellow-500 to-orange-400' },
          { id: 'goals', icon: Target, label: 'Goals', gradient: 'from-pink-500 to-rose-400' },
          { id: 'news', icon: Newspaper, label: 'News', gradient: 'from-indigo-500 to-purple-400' },
          { id: 'family', icon: Users, label: 'Family', gradient: 'from-teal-500 to-cyan-400' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`w-full p-3 mb-2 mx-1 rounded-xl transition-all duration-300 group relative ${
              currentView === item.id
                ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg transform scale-105`
                : 'text-gray-400 hover:text-white hover:bg-slate-700'
            }`}
            title={item.label}
          >
            <item.icon size={20} className="mx-auto mb-1" />
            <div className="text-xs font-medium">{item.label}</div>
            {currentView === item.id && (
              <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-full opacity-80"></div>
            )}
          </button>
        ))}
      </nav>
    </div>
  );

  // Professional Dashboard View
  const renderDashboard = () => {
    const thisWeekEvents = isClient ? getWeekEvents() : [];

    // Calculate average progress for goals
    const totalGoals = goalsData.familyGoals.length + goalsData.individualGoals.length;
    const avgProgress = totalGoals > 0
      ? (([...goalsData.familyGoals, ...goalsData.individualGoals].reduce((sum, goal) => sum + goal.progress, 0)) / totalGoals).toFixed(1)
      : 0;

    // Professional budget chart data
    const budgetChartData: Array<{ name: string; value: number; color: string; percentage?: string }> = [
      { name: 'Household', value: 4065, color: '#374151' },
      { name: 'Children', value: 1854, color: '#6B7280' },
      { name: 'Subscriptions', value: 31, color: '#9CA3AF' },
      { name: 'One-time', value: budgetTotals.expenses.oneTime, color: '#D1D5DB' }
    ];

    const total = budgetChartData.reduce((sum, item) => sum + item.value, 0);
    budgetChartData.forEach(item => {
      item.percentage = ((item.value / total) * 100).toFixed(1);
    });

    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          items={getBreadcrumbItems()}
          onHomeClick={() => setCurrentView('dashboard')}
        />

        {/* Professional Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-light text-gray-900 mb-1 md:mb-2">Family Overview</h1>
              <p className="text-sm md:text-base text-gray-600">Family Dashboard • {isClient ? formatDateConsistent(new Date()) : 'Loading...'}</p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <NotificationBell />
              <button
                onClick={() => {
                  if (confirm('Clear all data and reset? This will add school terms.')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="bg-red-600 text-white px-3 py-2 rounded-sm hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Reset Data
              </button>
              <button
                onClick={() => {
                  const events = localStorage.getItem('calendarEvents');
                  if (events) {
                    const parsed = JSON.parse(events);
                    const octoberEvents = parsed.filter((e: any) => e.date && e.date.startsWith('2025-10'));
                    console.log('Total events:', parsed.length);
                    console.log('October events:', octoberEvents);
                    console.log('School events:', parsed.filter((e: any) => e.id && e.id.startsWith('school-')));
                    alert(`Total: ${parsed.length} events\nOctober: ${octoberEvents.length} events\nSchool: ${parsed.filter((e: any) => e.id && e.id.startsWith('school-')).length} events\nCheck console for details`);
                  } else {
                    alert('No events in localStorage');
                  }
                }}
                className="bg-blue-600 text-white px-3 py-2 rounded-sm hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <AlertCircle size={16} />
                Debug
              </button>
              <button
                onClick={() => setShowQuickActivityForm(true)}
                className="bg-gray-900 text-white px-3 py-2 rounded-sm hover:bg-gray-800 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Activity size={16} />
                Log Activity
              </button>
              <button
                onClick={() => setShowEventForm(true)}
                className="bg-blue-600 text-white px-3 py-2 rounded-sm hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Plus size={16} />
                Add Event
              </button>
              <button
                onClick={() => setShowBudgetForm(true)}
                className="bg-green-600 text-white px-3 py-2 rounded-sm hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <DollarSign size={16} />
                Add Expense
              </button>
              <button
                onClick={() => setShowShoppingForm(true)}
                className="border border-gray-300 text-gray-700 px-3 py-2 rounded-sm hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <ShoppingBag size={16} />
                Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
          <div
            onClick={() => setCurrentView('calendar')}
            className="bg-white border border-gray-200 p-6 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Events</p>
                <p className="text-3xl font-light text-gray-900 mt-2">{thisWeekEvents.length}</p>
                <p className="text-sm text-gray-500 mt-1">This week</p>
              </div>
              <CalendarDays size={24} className="text-gray-400" />
            </div>
          </div>

          <div
            onClick={() => setCurrentView('budget')}
            className="bg-white border border-gray-200 p-6 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Net Income</p>
                <p className={`text-3xl font-light mt-2 ${budgetTotals.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  £{budgetTotals.netIncome.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {budgetTotals.savingsRate.toFixed(1)}% savings rate
                </p>
              </div>
              <div className="flex flex-col items-center">
                {budgetTotals.netIncome >= 0 ?
                  <ArrowUp size={24} className="text-green-400 mb-1" /> :
                  <ArrowDown size={24} className="text-red-400 mb-1" />
                }
                <PoundSterling size={24} className="text-gray-400" />
              </div>
            </div>
          </div>

          <div
            onClick={() => setCurrentView('meals')}
            className="bg-white border border-gray-200 p-6 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Meals Planned</p>
                <p className="text-3xl font-light text-gray-900 mt-2">{isClient ? getThisWeekMealsCount() : 0}</p>
                <p className="text-sm text-gray-500 mt-1">This week</p>
              </div>
              <Utensils size={24} className="text-gray-400" />
            </div>
          </div>

          <div
            onClick={() => setCurrentView('shopping')}
            className="bg-white border border-gray-200 p-6 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Shopping Lists</p>
                <p className="text-3xl font-light text-gray-900 mt-2">{shoppingLists.length}</p>
                <p className="text-sm text-gray-500 mt-1">
                  £{shoppingLists.reduce((sum, list) => sum + list.estimatedTotal, 0).toFixed(0)} estimated
                </p>
              </div>
              <ShoppingBag size={24} className="text-gray-400" />
            </div>
          </div>

          <div
            onClick={() => setCurrentView('family')}
            className="bg-white border border-gray-200 p-6 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Family Members</p>
                <p className="text-3xl font-light text-gray-900 mt-2">{people.length}</p>
                <p className="text-sm text-gray-500 mt-1">Active members</p>
              </div>
              <Users size={24} className="text-gray-400" />
            </div>
          </div>

          <div
            onClick={() => setCurrentView('news')}
            className="bg-white border border-gray-200 p-6 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">News Updates</p>
                <p className="text-3xl font-light text-gray-900 mt-2">8</p>
                <p className="text-sm text-gray-500 mt-1">Unread articles</p>
              </div>
              <Newspaper size={24} className="text-gray-400" />
            </div>
          </div>
        </div>

        {/* School Holidays Spotlight */}
        <DashboardWidget title="School Holidays & Term Dates" className="mb-6" action={null}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current/Next Holiday */}
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                <GraduationCap size={16} />
                Next School Holiday
              </h3>
              <div className="space-y-3">
                {schoolTerms.filter(term => {
                  const termDate = new Date(term.date || term.dateStart || new Date());
                  return termDate >= new Date() && term.type === 'holiday';
                }).slice(0, 1).map((holiday, index) => (
                  <div key={index} className="bg-white p-3 rounded border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-purple-900">{holiday.name}</p>
                        <p className="text-sm text-purple-700">
                          {holiday.dateStart && holiday.dateEnd
                            ? `${formatDateConsistent(holiday.dateStart)} - ${formatDateConsistent(holiday.dateEnd)}`
                            : formatDateConsistent(holiday.date || '')
                          }
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          {Math.ceil((new Date(holiday.date || holiday.dateStart || new Date()).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days away
                        </p>
                      </div>
                      <CalendarDays className="w-5 h-5 text-purple-500" />
                    </div>
                  </div>
                )) || (
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <p className="text-purple-700">No upcoming holidays scheduled</p>
                  </div>
                )}
              </div>
            </div>

            {/* Term Information */}
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                <BookOpen size={16} />
                Current Term
              </h3>
              <div className="space-y-3">
                {schoolTerms.filter(term => {
                  if (!term.dateStart || !term.dateEnd) return false;
                  const startDate = new Date(term.dateStart);
                  const endDate = new Date(term.dateEnd);
                  const today = new Date();
                  return today >= startDate && today <= endDate && term.type === 'term';
                }).slice(0, 1).map((term, index) => (
                  <div key={index} className="bg-white p-3 rounded border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-green-900">{term.name}</p>
                        <p className="text-sm text-green-700">
                          {formatDateConsistent(term.dateStart || '')} - {formatDateConsistent(term.dateEnd || '')}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {Math.ceil((new Date(term.dateEnd || new Date()).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
                        </p>
                      </div>
                      <GraduationCap className="w-5 h-5 text-green-500" />
                    </div>
                  </div>
                )) || (
                  <div className="bg-white p-3 rounded border border-green-200">
                    <p className="text-green-700">No active term found</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <AlertCircle size={14} />
                  {schoolTerms.filter(term => {
                    const termDate = new Date(term.date || term.dateStart || new Date());
                    const daysAway = Math.ceil((termDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return daysAway >= 0 && daysAway <= 7;
                  }).length} events this week
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {schoolTerms.filter(term => {
                    const termDate = new Date(term.date || term.dateStart || new Date());
                    const daysAway = Math.ceil((termDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return daysAway >= 0 && daysAway <= 30;
                  }).length} events next 30 days
                </span>
              </div>
              <button
                onClick={() => setCurrentView('calendar')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                View Calendar
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </DashboardWidget>

        {/* Weekly/Monthly Insights Widget */}
        <DashboardWidget title="Weekly & Monthly Insights" className="mb-6" action={null}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* This Week Summary */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <Calendar size={16} />
                This Week
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Events Scheduled</span>
                  <span className="font-medium text-blue-900">{thisWeekEvents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Meals Planned</span>
                  <span className="font-medium text-blue-900">{isClient ? getThisWeekMealsCount() : 0}/7</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Workouts This Week</span>
                  <span className="font-medium text-blue-900">{personalTracking.fitness.weeklyProgress}/{personalTracking.fitness.weeklyGoal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Shopping Budget</span>
                  <span className="font-medium text-blue-900">£{(shoppingHabits?.insights?.totalSpentThisWeek || 0).toFixed(0)}/£{shoppingHabits?.insights?.weeklyBudget || 50}</span>
                </div>
              </div>
            </div>

            {/* Monthly Trends */}
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                <TrendingUp size={16} />
                Monthly Trends
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Net Income</span>
                  <span className={`font-medium ${budgetTotals.netIncome > (budgetData.priorMonths['2025-07']?.netIncome || 0) ? 'text-green-900' : 'text-red-600'}`}>
                    {budgetTotals.netIncome > (budgetData.priorMonths['2025-07']?.netIncome || 0) ? '+' : ''}
                    £{(budgetTotals.netIncome - (budgetData.priorMonths['2025-07']?.netIncome || 0)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Savings Rate</span>
                  <span className="font-medium text-green-900">{budgetTotals.savingsRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Goals Progress</span>
                  <span className="font-medium text-green-900">{avgProgress}% avg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Achievements</span>
                  <span className="font-medium text-green-900">{isClient ? getThisMonthAchievements() : 0} this month</span>
                </div>
              </div>
            </div>

            {/* Key Upcoming Events */}
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={16} />
                Key Upcoming
              </h3>
              <div className="space-y-2 text-sm">
                {/* Next 30 days important events */}
                {isClient ? getUpcomingEvents().map((event, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-purple-700 truncate">{(event as any).name || (event as any).title}</span>
                    <span className="font-medium text-purple-900 text-xs">
                      {new Date((event as any).date || (event as any).dateStart || (event as any).startTime || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )) : (
                  <div className="text-purple-700 text-xs">Loading upcoming events...</div>
                )}
              </div>
            </div>
          </div>
        </DashboardWidget>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Budget Overview Pie Chart */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Budget Overview</h2>
                <button
                  onClick={() => setCurrentView('budget')}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  View details →
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'Household', value: 4065, color: '#374151' },
                        { name: 'Children', value: 1854, color: '#6B7280' },
                        { name: 'Food', value: 487, color: '#9CA3AF' },
                        { name: 'Entertainment', value: 157, color: '#D1D5DB' },
                        { name: 'Other', value: 234, color: '#F3F4F6' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={(entry: any) => `${entry.name}: ${entry.value}`}
                    >
                      {[
                        { name: 'Household', value: 4065, color: '#374151' },
                        { name: 'Children', value: 1854, color: '#6B7280' },
                        { name: 'Food', value: 487, color: '#9CA3AF' },
                        { name: 'Entertainment', value: 157, color: '#D1D5DB' },
                        { name: 'Other', value: 234, color: '#F3F4F6' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`£${value}`, 'Amount']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Total Monthly Expenses: <span className="font-semibold text-gray-900">£{(4065 + 1854 + 487 + 157 + 234).toLocaleString()}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Family Activity Line Chart */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Family Activity Trends</h2>
                <button
                  onClick={() => setCurrentView('goals')}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  View goals →
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { week: 'Week 1', events: 12, activities: 8, goals: 3 },
                    { week: 'Week 2', events: 15, activities: 12, goals: 5 },
                    { week: 'Week 3', events: 18, activities: 15, goals: 4 },
                    { week: 'Week 4', events: 22, activities: 18, goals: 6 },
                    { week: 'Week 5', events: 25, activities: 22, goals: 8 },
                    { week: 'Week 6', events: thisWeekEvents.length, activities: personalTracking.fitness.weeklyProgress * 2, goals: Math.floor(Number(avgProgress) / 10) }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="events"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      name="Events"
                    />
                    <Line
                      type="monotone"
                      dataKey="activities"
                      stroke="#10B981"
                      strokeWidth={2}
                      name="Activities"
                    />
                    <Line
                      type="monotone"
                      dataKey="goals"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      name="Goals Completed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex justify-center space-x-6 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-gray-600">Events</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-gray-600">Activities</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-gray-600">Goals</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Schedule - Takes 8 columns */}
          <div className="lg:col-span-8 bg-white border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Week Schedule</h2>
                <button
                  onClick={() => setCurrentView('calendar')}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  View all →
                </button>
              </div>
            </div>
            <div className="p-6">
              {thisWeekEvents.length > 0 ? (
                <div className="space-y-4">
                  {thisWeekEvents.slice(0, 6).map(event => {
                    const person = getPerson(event.person);
                    return (
                      <div key={event.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: person?.color }}
                            />
                            <span className="text-sm text-gray-500">{person?.name}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{event.title}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(event.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at {event.time}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {event.cost > 0 && (
                            <p className="font-medium text-gray-900">£{event.cost}</p>
                          )}
                          {event.location && (
                            <p className="text-sm text-gray-500">{event.location}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-12">No events scheduled for this week</p>
              )}
            </div>
          </div>

          {/* Budget Chart - Takes 4 columns */}
          <div className="lg:col-span-4 bg-white border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Monthly Overview</h2>
                <button
                  onClick={() => setCurrentView('budget')}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Manage →
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-700">Total Income</span>
                  <span className="font-medium text-green-600">£{budgetTotals.income.total.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-700">Total Expenses</span>
                  <span className="font-medium text-red-600">£{budgetTotals.expenses.total.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-900">Net Income</span>
                  <span className={`font-bold ${budgetTotals.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    £{budgetTotals.netIncome.toLocaleString()}
                  </span>
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">Savings Rate</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${budgetTotals.savingsRate >= 20 ? 'bg-green-500' : budgetTotals.savingsRate >= 10 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.max(0, Math.min(100, budgetTotals.savingsRate))}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{budgetTotals.savingsRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Tracking - Takes 6 columns */}
          <div className="lg:col-span-6 bg-white border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Personal Dashboard</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Fitness */}
                <div>
                  <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-3">Fitness</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Steps Today</span>
                      <span className="font-medium text-gray-900">{personalTracking.fitness.todaySteps.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-sm h-1">
                      <div
                        className="bg-gray-900 h-1 rounded-sm transition-all duration-500"
                        style={{ width: `${Math.min((personalTracking.fitness.todaySteps / 10000) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Weekly Workouts</span>
                      <span className="font-medium text-gray-900">{personalTracking.fitness.weeklyProgress}/{personalTracking.fitness.weeklyGoal}</span>
                    </div>
                  </div>
                </div>

                {/* Wellness */}
                <div>
                  <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-3">Wellness</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Mood</span>
                      <span className="font-medium text-gray-900">{personalTracking.wellness.mood}/10</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Sleep</span>
                      <span className="font-medium text-gray-900">{personalTracking.wellness.sleep}h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Energy</span>
                      <span className="font-medium text-gray-900">{personalTracking.wellness.energy}/10</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Running & Training */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-3">Running & Training</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Weekly Miles</span>
                    <span className="font-medium text-gray-900">{personalTracking.fitness.weeklyMiles} miles</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Avg Pace</span>
                    <span className="font-medium text-gray-900">{personalTracking.fitness.avgPace}/mile</span>
                  </div>
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    Next: {personalTracking.fitness.nextRun}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick News - Takes 6 columns */}
          <div className="lg:col-span-6 bg-white border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Family News</h2>
                <button
                  onClick={() => setCurrentView('news')}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  View all →
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {news.familyNews.slice(0, 3).map((article, index) => (
                  <div key={index} className="pb-4 border-b border-gray-100 last:border-b-0">
                    <h4 className="font-medium text-gray-900 mb-1">{article.title}</h4>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">{article.source}</p>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-sm">{article.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Email Testing Panel - Full width */}
        <div className="mt-6">
          <EmailTestPanel />
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-gray-100 flex relative">
      {/* Mobile Navigation */}
      <MobileNavigation
        currentView={currentView}
        onViewChange={setCurrentView}
        isMenuOpen={isMobileMenuOpen}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        {renderSidebar()}
      </div>

      {/* Main Content with mobile padding adjustments */}
      <div className="flex-1 overflow-auto pt-14 pb-16 md:pt-0 md:pb-0">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'calendar' && (
          <CalendarMain
            events={events}
            people={people}
            onEventClick={handleCalendarEventClick}
            onEventCreate={handleCalendarEventCreate}
            onEventUpdate={handleCalendarEventUpdate}
            onEventDelete={handleCalendarEventDelete}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onTemplateManage={handleTemplateManage}
            onEventsSync={(importedEvents) => {
              // Add imported events to the existing events
              setEvents(prevEvents => [...prevEvents, ...importedEvents])
            }}
          />
        )}
        {currentView === 'budget' && <BudgetDashboard />}
        {currentView === 'meals' && <MealsDashboard />}
        {currentView === 'shopping' && <ShoppingDashboard />}
        {currentView === 'goals' && <GoalsDashboard />}
        {currentView === 'family' && <FamilyDashboard />}
        {currentView === 'news' && <NewsLanding />}
        {currentView !== 'dashboard' && currentView !== 'calendar' && currentView !== 'budget' && currentView !== 'meals' && currentView !== 'shopping' && currentView !== 'goals' && currentView !== 'family' && currentView !== 'news' && (
          <div className="p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-light text-gray-900 mb-2">
              {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
            </h1>
            <p className="text-gray-600 mb-8">This view is coming soon...</p>
          </div>
        )}
      </div>

      {/* Event Form Modal */}
      <EventForm
        event={selectedEvent || undefined}
        isOpen={showEventForm}
        onClose={closeEventForm}
        onSave={handleCalendarEventSave}
        onUpdate={handleCalendarEventUpdate}
        onDelete={handleCalendarEventDelete}
        people={people}
        templates={eventTemplates}
        defaultSlot={eventFormSlot || undefined}
      />

      {/* Template Manager Modal */}
      <EventTemplates
        isOpen={showTemplateManager}
        onClose={closeTemplateManager}
        templates={eventTemplates}
        onSave={handleTemplateSave}
        onUpdate={handleTemplateUpdate}
        onDelete={handleTemplateDelete}
        onDuplicate={handleTemplateDuplicate}
      />

      {/* Conflict Detection Modal */}
      <ConflictDetectionModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        conflicts={detectedConflicts}
        onResolveConflict={handleResolveConflict}
        onIgnoreConflict={handleIgnoreConflict}
        people={people}
        onRequestSuggestions={(event) => {
          // For now, just show a notification
          showNotification({
            type: 'system',
            title: 'Feature Coming Soon',
            message: 'Automatic time suggestions will be available in a future update.',
            priority: 'medium',
            category: 'system',
            read: false,
            actionRequired: false
          });
        }}
      />

      {/* Conflict Settings Modal */}
      <ConflictSettings
        isOpen={showConflictSettings}
        onClose={() => setShowConflictSettings(false)}
        rules={conflictRules}
        onUpdateRule={handleUpdateConflictRule}
        onSave={handleSaveConflictSettings}
      />

      {/* Quick Activity Form Modal */}
      {showQuickActivityForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Log Activity</h3>
            <form onSubmit={handleQuickActivitySubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
                  <select
                    value={quickActivityForm.type}
                    onChange={(e) => setQuickActivityForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="gym">Gym Session</option>
                    <option value="running">Running</option>
                    <option value="swimming">Swimming</option>
                    <option value="cycling">Cycling</option>
                    <option value="yoga">Yoga</option>
                    <option value="walking">Walking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={quickActivityForm.duration}
                    onChange={(e) => setQuickActivityForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Intensity</label>
                  <select
                    value={quickActivityForm.intensity}
                    onChange={(e) => setQuickActivityForm(prev => ({ ...prev, intensity: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={quickActivityForm.notes}
                    onChange={(e) => setQuickActivityForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowQuickActivityForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
                >
                  Log Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Budget Form Modal */}
      {showBudgetForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Budget Item</h3>
            <form onSubmit={handleBudgetSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={budgetForm.type}
                    onChange={(e) => setBudgetForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={budgetForm.name}
                    onChange={(e) => setBudgetForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter item name..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={budgetForm.amount}
                    onChange={(e) => setBudgetForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={budgetForm.category}
                    onChange={(e) => setBudgetForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Household">Household</option>
                    <option value="Children">Children</option>
                    <option value="Food">Food</option>
                    <option value="Transport">Transport</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Health">Health</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Person</label>
                  <select
                    value={budgetForm.person}
                    onChange={(e) => setBudgetForm(prev => ({ ...prev, person: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Family</option>
                    {people.map(person => (
                      <option key={person.id} value={person.id}>{person.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={budgetForm.isRecurring}
                    onChange={(e) => setBudgetForm(prev => ({ ...prev, isRecurring: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-700">
                    Recurring monthly
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowBudgetForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Add {budgetForm.type === 'income' ? 'Income' : 'Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Shopping Form Modal */}
      {showShoppingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Shopping Item</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (shoppingForm.listId && shoppingForm.name) {
                handleAddShoppingItem(shoppingForm.listId, {
                  name: shoppingForm.name,
                  price: parseFloat(shoppingForm.price) || 0,
                  category: shoppingForm.category
                });
                setShowShoppingForm(false);
                setShoppingForm({ listId: '', name: '', price: '', category: 'General' });
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shopping List</label>
                  <select
                    value={shoppingForm.listId}
                    onChange={(e) => setShoppingForm(prev => ({ ...prev, listId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a list...</option>
                    {shoppingLists.map(list => (
                      <option key={list.id} value={list.id}>{list.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                  <input
                    type="text"
                    value={shoppingForm.name}
                    onChange={(e) => setShoppingForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter item name..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={shoppingForm.price}
                    onChange={(e) => setShoppingForm(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={shoppingForm.category}
                    onChange={(e) => setShoppingForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="General">General</option>
                    <option value="Food">Food</option>
                    <option value="Household">Household</option>
                    <option value="Personal">Personal</option>
                    <option value="Sports">Sports</option>
                    <option value="Education">Education</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowShoppingForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Main wrapper component with NotificationProvider
const OmosanyaFamilyHub = () => {
  return (
    <NotificationProvider>
      <FamilyHubContent />
    </NotificationProvider>
  );
};

export default OmosanyaFamilyHub;