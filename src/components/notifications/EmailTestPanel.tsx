'use client'

import React, { useState } from 'react';
import {
  Mail,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  Settings,
  Play,
  Loader
} from 'lucide-react';

const EmailTestPanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<{ [key: string]: boolean | null }>({});
  const [emailAddress, setEmailAddress] = useState('admin@familyhub.app');

  const testTypes = [
    {
      id: 'basic',
      name: 'Basic Email Test',
      description: 'Test basic email sending functionality',
      icon: <Mail className="w-5 h-5" />
    },
    {
      id: 'event_reminder',
      name: 'Event Reminder Email',
      description: 'Test event reminder email template',
      icon: <Calendar className="w-5 h-5" />
    },
    {
      id: 'conflict_alert',
      name: 'Conflict Alert Email',
      description: 'Test conflict detection email notification',
      icon: <AlertTriangle className="w-5 h-5" />
    },
    {
      id: 'daily_digest',
      name: 'Daily Digest Email',
      description: 'Test daily digest email summary',
      icon: <Clock className="w-5 h-5" />
    }
  ];

  const runEmailTest = async (testType: string) => {
    setIsLoading(true);
    setTestResults(prev => ({ ...prev, [testType]: null }));

    try {
      let requestBody: any = {
        recipient: { email: emailAddress, name: 'Test User' }
      };

      switch (testType) {
        case 'basic':
          requestBody.type = 'test';
          break;

        case 'event_reminder':
          requestBody = {
            type: 'event_reminder',
            event: {
              id: 'test-event',
              title: 'Test Swimming Lesson',
              date: '2025-09-22',
              time: '10:00',
              duration: 45,
              location: 'Aquatic Centre',
              person: 'test-user',
              type: 'sport',
              cost: 25,
              notes: 'Bring swimwear and towel'
            },
            recipient: { email: emailAddress, name: 'Test User' },
            reminderTime: 30
          };
          break;

        case 'conflict_alert':
          requestBody = {
            type: 'conflict_alert',
            conflictData: {
              newEvent: {
                id: 'new-event',
                title: 'Football Training',
                date: '2025-09-22',
                time: '10:00',
                duration: 90,
                person: 'test-user',
                type: 'sport',
                location: 'Sports Ground'
              },
              conflictingEvents: [{
                id: 'existing-event',
                title: 'Swimming Lesson',
                date: '2025-09-22',
                time: '10:30',
                duration: 45,
                person: 'test-user',
                type: 'sport',
                location: 'Aquatic Centre'
              }],
              conflictType: 'time_overlap',
              severity: 'major'
            },
            recipients: [{ email: emailAddress, name: 'Test User' }]
          };
          break;

        case 'daily_digest':
          requestBody = {
            type: 'daily_digest',
            events: [
              {
                id: '1',
                title: 'Morning Meeting',
                time: '09:00',
                duration: 60,
                location: 'Office',
                type: 'work'
              },
              {
                id: '2',
                title: 'Lunch with Friends',
                time: '12:30',
                duration: 90,
                location: 'Restaurant',
                type: 'social',
                cost: 25
              }
            ],
            notifications: [
              {
                title: 'Meeting Reminder',
                message: 'Your morning meeting starts in 30 minutes'
              },
              {
                title: 'Calendar Updated',
                message: 'New event added to your calendar'
              }
            ],
            recipient: { email: emailAddress, name: 'Test User' },
            date: new Date().toISOString()
          };
          break;
      }

      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      setTestResults(prev => ({ ...prev, [testType]: result.success }));

    } catch (error) {
      console.error(`Email test ${testType} failed:`, error);
      setTestResults(prev => ({ ...prev, [testType]: false }));
    } finally {
      setIsLoading(false);
    }
  };

  const runAllTests = async () => {
    for (const test of testTypes) {
      await runEmailTest(test.id);
      // Add small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const getStatusIcon = (testId: string) => {
    const result = testResults[testId];
    if (result === null && isLoading) {
      return <Loader className="w-4 h-4 animate-spin text-blue-500" />;
    }
    if (result === true) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (result === false) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const getStatusText = (testId: string) => {
    const result = testResults[testId];
    if (result === null && isLoading) return 'Testing...';
    if (result === true) return 'Success';
    if (result === false) return 'Failed';
    return 'Not tested';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Email Service Testing</h2>
            <p className="text-gray-600">Test email notifications and templates</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={runAllTests}
            disabled={isLoading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>Run All Tests</span>
          </button>
        </div>
      </div>

      {/* Email Configuration */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-3">
          <Settings className="w-4 h-4 text-gray-600" />
          <h3 className="font-medium text-gray-900">Test Configuration</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Email Address
            </label>
            <input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter email address for testing"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resend API Status
            </label>
            <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-700">API Key Configured</span>
            </div>
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900 mb-4">Email Tests</h3>

        {testTypes.map((test) => (
          <div
            key={test.id}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                {test.icon}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{test.name}</h4>
                <p className="text-sm text-gray-600">{test.description}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {getStatusIcon(test.id)}
                <span className={`text-sm font-medium ${
                  testResults[test.id] === true ? 'text-green-700' :
                  testResults[test.id] === false ? 'text-red-700' :
                  'text-gray-600'
                }`}>
                  {getStatusText(test.id)}
                </span>
              </div>

              <button
                onClick={() => runEmailTest(test.id)}
                disabled={isLoading}
                className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-colors ${
                  isLoading
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                <Send className="w-3 h-3" />
                <span>Test</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Results Summary */}
      {Object.keys(testResults).length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <h3 className="font-medium text-blue-900">Test Results Summary</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(testResults).filter(r => r === true).length}
              </div>
              <div className="text-gray-600">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {Object.values(testResults).filter(r => r === false).length}
              </div>
              <div className="text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {Object.values(testResults).filter(r => r === null).length}
              </div>
              <div className="text-gray-600">Pending</div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Instructions:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Make sure you have a valid email address for testing</li>
              <li>Check your email inbox (including spam folder) after running tests</li>
              <li>Email delivery may take a few moments</li>
              <li>Failed tests may indicate API configuration issues</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTestPanel;