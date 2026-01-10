import { useEffect, useState } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    freshers: 0,
    workingProfessionals: 0,
    averageRating: 0,
    roleSwitchCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setError(null);
        console.log('Starting to fetch data from Firestore...');
        console.log('Firestore db:', db);
        
        const usersRef = collection(db, 'users');
        const q = query(usersRef);
        console.log('Query created, fetching documents...');
        
        const querySnapshot = await getDocs(q);

        console.log('✅ Total documents fetched:', querySnapshot.size);
        
        if (querySnapshot.empty) {
          console.warn('⚠️ No documents found in users collection');
          setError('No users found in Firestore. Please check if data exists.');
        }

        let totalUsers = 0;
        let freshers = 0;
        let workingProfessionals = 0;
        let totalRating = 0;
        let ratingCount = 0;
        let roleSwitchCount = 0;

        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          
          // Skip admin users from statistics
          const userRole = userData.profile?.role || '';
          if (userRole === 'admin') {
            return; // Skip admin users
          }

          totalUsers++;

          // Count profession type - improved logic
          const profession = (userData.profile?.profession || '').toLowerCase().trim();
          if (profession === '' || profession === 'n/a') {
            // Don't count if profession is empty
          } else if (
            profession.includes('fresher') || 
            profession === 'student' ||
            profession.includes('student') ||
            profession.includes('graduate') ||
            profession.includes('fresher')
          ) {
            freshers++;
          } else if (profession) {
            workingProfessionals++;
          }

          // Calculate average rating - only valid ratings
          const rating = userData.surveys?.day1_feedback?.rating;
          if (rating && typeof rating === 'number' && rating >= 1 && rating <= 5) {
            totalRating += rating;
            ratingCount++;
          }

          // Count role switch - case insensitive
          const outcome = userData.surveys?.outcome_survey;
          if (outcome && typeof outcome === 'string' && outcome.toLowerCase().trim() === 'role switch') {
            roleSwitchCount++;
          }
        });

        console.log('Stats calculated:', { totalUsers, freshers, workingProfessionals, roleSwitchCount });

        setStats({
          totalUsers,
          freshers,
          workingProfessionals,
          averageRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(2) : 0,
          roleSwitchCount,
        });
      } catch (error) {
        console.error('❌ Error fetching stats:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        let errorMessage = 'Failed to fetch data. ';
        if (error.code === 'permission-denied') {
          errorMessage += 'Permission denied. Please check Firestore security rules allow admin users to read data.';
        } else if (error.code === 'unavailable') {
          errorMessage += 'Firestore is unavailable. Please check your internet connection.';
        } else {
          errorMessage += `Error: ${error.message}. Check browser console (F12) for details.`;
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const professionData = {
    labels: ['Freshers', 'Working Professionals'],
    datasets: [
      {
        label: 'Users',
        data: [stats.freshers, stats.workingProfessionals],
        backgroundColor: ['#10B981', '#3B82F6'],
        borderColor: ['#059669', '#2563EB'],
        borderWidth: 2,
      },
    ],
  };

  const roleSwitchData = {
    labels: ['Role Switch', 'Other Outcomes'],
    datasets: [
      {
        label: 'Users',
        data: [
          stats.roleSwitchCount,
          Math.max(0, stats.totalUsers - stats.roleSwitchCount),
        ],
        backgroundColor: ['#F59E0B', '#E5E7EB'],
        borderColor: ['#D97706', '#D1D5DB'],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            size: 14,
            weight: '500',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-0">
      {/* Header Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-5xl font-extrabold text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Dashboard Overview
            </h1>
            <p className="text-lg text-gray-600 flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                Live Data
              </span>
              Real-time statistics and insights
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
                <p className="mt-2">Check browser console (F12) for more details.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!error && stats.totalUsers === 0 && !loading && (
        <div className="mb-6 rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">No data found</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>No users found in Firestore. Make sure:</p>
                <ul className="list-disc list-inside mt-2">
                  <li>Users collection exists in Firestore</li>
                  <li>Firestore security rules allow admin users to read data</li>
                  <li>Check browser console (F12) for any errors</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12">
        {/* Total Users Card */}
        <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 overflow-hidden shadow-2xl rounded-2xl transform hover:scale-[1.02] hover:shadow-3xl transition-all duration-300 border border-blue-400/20">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-blue-100 text-sm font-semibold mb-2 uppercase tracking-wide">Total Users</p>
              <p className="text-4xl font-extrabold text-white mb-2">{stats.totalUsers}</p>
              <p className="text-blue-100 text-xs font-medium">Active users in system</p>
            </div>
          </div>
        </div>

        {/* Freshers Card */}
        <div className="group relative bg-gradient-to-br from-green-500 via-green-600 to-green-700 overflow-hidden shadow-2xl rounded-2xl transform hover:scale-[1.02] hover:shadow-3xl transition-all duration-300 border border-green-400/20">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-green-100 text-sm font-semibold mb-2 uppercase tracking-wide">Freshers</p>
              <p className="text-4xl font-extrabold text-white mb-2">{stats.freshers}</p>
              <p className="text-green-100 text-xs font-medium">
                {stats.totalUsers > 0 ? Math.round((stats.freshers / stats.totalUsers) * 100) : 0}% of total users
              </p>
            </div>
          </div>
        </div>

        {/* Avg Rating Card */}
        <div className="group relative bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 overflow-hidden shadow-2xl rounded-2xl transform hover:scale-[1.02] hover:shadow-3xl transition-all duration-300 border border-purple-400/20">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-purple-100 text-sm font-semibold mb-2 uppercase tracking-wide">Avg Rating</p>
              <p className="text-4xl font-extrabold text-white mb-2">{stats.averageRating || '0.00'}</p>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={`text-lg ${star <= Math.round(parseFloat(stats.averageRating) || 0) ? 'text-yellow-300' : 'text-purple-300'}`}>
                    ★
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Role Switch Card */}
        <div className="group relative bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 overflow-hidden shadow-2xl rounded-2xl transform hover:scale-[1.02] hover:shadow-3xl transition-all duration-300 border border-orange-400/20">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-orange-100 text-sm font-semibold mb-2 uppercase tracking-wide">Role Switch</p>
              <p className="text-4xl font-extrabold text-white mb-2">{stats.roleSwitchCount}</p>
              <p className="text-orange-100 text-xs font-medium">
                {stats.totalUsers > 0 ? Math.round((stats.roleSwitchCount / stats.totalUsers) * 100) : 0}% interested in switching
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics & Insights</h2>
        <p className="text-gray-600">Visual representation of user data</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="bg-white shadow-2xl rounded-2xl p-8 border border-gray-100 hover:shadow-3xl transition-shadow duration-300">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-green-600 rounded-full"></div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Users by Profession</h2>
                <p className="text-sm text-gray-500 mt-1">Distribution of user types</p>
              </div>
            </div>
          </div>
          <div className="h-80 mb-6">
            <Doughnut data={professionData} options={chartOptions} />
          </div>
          <div className="pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Freshers</p>
                <p className="text-2xl font-bold text-green-700">{stats.freshers}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Professionals</p>
                <p className="text-2xl font-bold text-blue-700">{stats.workingProfessionals}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-2xl rounded-2xl p-8 border border-gray-100 hover:shadow-3xl transition-shadow duration-300">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-8 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full"></div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Outcome Survey</h2>
                <p className="text-sm text-gray-500 mt-1">Role switch interest analysis</p>
              </div>
            </div>
          </div>
          <div className="h-80 mb-6">
            <Doughnut data={roleSwitchData} options={chartOptions} />
          </div>
          <div className="pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Role Switch</p>
                <p className="text-2xl font-bold text-orange-700">{stats.roleSwitchCount}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Others</p>
                <p className="text-2xl font-bold text-gray-700">{Math.max(0, stats.totalUsers - stats.roleSwitchCount)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
