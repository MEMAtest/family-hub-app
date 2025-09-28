import React from 'react';
import { Users, Calendar, MessageCircle, Shield, Heart, Settings } from 'lucide-react';

export const FamilyLanding = () => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="bg-purple-100 p-3 rounded-full">
            <Users className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Family Management Hub</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Organize, connect, and manage your family life all in one place.
          Your comprehensive family management system is coming soon.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Family Members</h3>
          <p className="text-gray-600 text-sm">
            Manage profiles, roles, and permissions for all family members.
          </p>
        </div>

        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <MessageCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Family Chat</h3>
          <p className="text-gray-600 text-sm">
            Stay connected with family messaging and shared conversations.
          </p>
        </div>

        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Emergency Info</h3>
          <p className="text-gray-600 text-sm">
            Quick access to emergency contacts and important family information.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center mb-3">
            <Heart className="h-6 w-6 text-purple-600 mr-3" />
            <h3 className="text-lg font-semibold text-purple-900">Family Features</h3>
          </div>
          <ul className="text-purple-700 space-y-2">
            <li className="flex items-center">
              <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
              Member profiles and roles
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
              Family timeline and activities
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
              Photo sharing and memories
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
              Emergency contact management
            </li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center mb-3">
            <Settings className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-blue-900">Coming Soon</h3>
          </div>
          <ul className="text-blue-700 space-y-2">
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
              Family analytics and insights
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
              Advanced privacy controls
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
              Integration with calendar and tasks
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
              Customizable family settings
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FamilyLanding;